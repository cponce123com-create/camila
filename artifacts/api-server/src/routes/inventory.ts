import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { inventoryMovementsTable, productsTable, categoriesTable, productVariantsTable } from "@workspace/db";
import { eq, and, count, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

router.post("/adjust", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  const schema = z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int(),
    type: z.enum(["in", "out", "adjustment"]),
    reason: z.string().optional(),
    notes: z.string().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  const data = result.data;

  try {
    const [product] = await db
      .select({ id: productsTable.id, stock: productsTable.stock, minStock: productsTable.minStock, name: productsTable.name })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.id, data.productId),
          eq(productsTable.storeId, user.storeId)
        )
      )
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    // If variantId provided, adjust variant stock too
    let variant: { id: string; stock: number; minStock: number } | undefined;
    if (data.variantId) {
      const [v] = await db
        .select({ id: productVariantsTable.id, stock: productVariantsTable.stock, minStock: productVariantsTable.minStock })
        .from(productVariantsTable)
        .where(
          and(
            eq(productVariantsTable.id, data.variantId),
            eq(productVariantsTable.productId, data.productId),
            eq(productVariantsTable.storeId, user.storeId)
          )
        )
        .limit(1);
      if (!v) {
        res.status(404).json({ error: "Variante no encontrada" });
        return;
      }
      variant = v;
    }

    const previousStock = variant ? variant.stock : product.stock;
    let newStock: number;

    if (data.type === "in") {
      newStock = previousStock + Math.abs(data.quantity);
    } else if (data.type === "out") {
      newStock = previousStock - Math.abs(data.quantity);
      if (newStock < 0) {
        res.status(400).json({ error: "Stock insuficiente" });
        return;
      }
    } else {
      // adjustment - set to exact quantity
      newStock = data.quantity;
    }

    if (variant) {
      await db
        .update(productVariantsTable)
        .set({ stock: newStock, updatedAt: new Date() })
        .where(eq(productVariantsTable.id, variant.id));
    } else {
      await db
        .update(productsTable)
        .set({ stock: newStock, updatedAt: new Date() })
        .where(eq(productsTable.id, product.id));
    }

    const [movement] = await db
      .insert(inventoryMovementsTable)
      .values({
        storeId: user.storeId,
        productId: data.productId,
        variantId: data.variantId,
        userId: user.id,
        type: data.type,
        quantity: data.quantity,
        previousStock,
        newStock,
        reason: data.reason,
        notes: data.notes,
      })
      .returning();

    const minStockThreshold = variant ? variant.minStock : product.minStock;
    const isLowStock = newStock <= minStockThreshold;
    res.json({
      ...movement,
      isLowStock,
      productName: product.name,
    });
  } catch (err) {
    req.log.error({ err }, "Adjust inventory error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Low stock alert endpoint - must come before /movements to avoid param conflicts
router.get("/low-stock", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  try {
    const lowStockProducts = await db
      .select({
        id: productsTable.id,
        storeId: productsTable.storeId,
        categoryId: productsTable.categoryId,
        name: productsTable.name,
        description: productsTable.description,
        longDescription: productsTable.longDescription,
        price: productsTable.price,
        salePrice: productsTable.salePrice,
        saleStartDate: productsTable.saleStartDate,
        saleEndDate: productsTable.saleEndDate,
        costPrice: productsTable.costPrice,
        sku: productsTable.sku,
        barcode: productsTable.barcode,
        imageUrl: productsTable.imageUrl,
        stock: productsTable.stock,
        minStock: productsTable.minStock,
        unit: productsTable.unit,
        isActive: productsTable.isActive,
        isFeatured: productsTable.isFeatured,
        tags: productsTable.tags,
        createdAt: productsTable.createdAt,
        updatedAt: productsTable.updatedAt,
        category: {
          id: categoriesTable.id,
          storeId: categoriesTable.storeId,
          parentId: categoriesTable.parentId,
          name: categoriesTable.name,
          description: categoriesTable.description,
          imageUrl: categoriesTable.imageUrl,
          sortOrder: categoriesTable.sortOrder,
          createdAt: categoriesTable.createdAt,
          updatedAt: categoriesTable.updatedAt,
        },
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
      .where(
        and(
          eq(productsTable.storeId, user.storeId),
          eq(productsTable.isActive, true),
          lte(productsTable.stock, sql`${productsTable.minStock}`)
        )
      )
      .orderBy(productsTable.stock);

    res.json(lowStockProducts);
  } catch (err) {
    req.log.error({ err }, "Get low stock error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/kardex/:productId", requireAuth, async (req, res) => {
  const user = req.user!;
  const { productId } = req.params;
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;

  try {
    // Verify product belongs to store
    const [product] = await db
      .select({
        id: productsTable.id,
        storeId: productsTable.storeId,
        categoryId: productsTable.categoryId,
        name: productsTable.name,
        description: productsTable.description,
        longDescription: productsTable.longDescription,
        price: productsTable.price,
        salePrice: productsTable.salePrice,
        saleStartDate: productsTable.saleStartDate,
        saleEndDate: productsTable.saleEndDate,
        costPrice: productsTable.costPrice,
        sku: productsTable.sku,
        barcode: productsTable.barcode,
        imageUrl: productsTable.imageUrl,
        stock: productsTable.stock,
        minStock: productsTable.minStock,
        unit: productsTable.unit,
        isActive: productsTable.isActive,
        isFeatured: productsTable.isFeatured,
        tags: productsTable.tags,
        createdAt: productsTable.createdAt,
        updatedAt: productsTable.updatedAt,
      })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.id, productId),
          eq(productsTable.storeId, user.storeId!)
        )
      )
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const dateFilters = [
      eq(inventoryMovementsTable.productId, productId),
      dateFrom ? gte(inventoryMovementsTable.createdAt, new Date(dateFrom)) : undefined,
      dateTo
        ? lte(
            inventoryMovementsTable.createdAt,
            new Date(new Date(dateTo).setHours(23, 59, 59, 999))
          )
        : undefined,
    ].filter(Boolean) as Parameters<typeof and>[];

    const movements = await db
      .select({
        id: inventoryMovementsTable.id,
        storeId: inventoryMovementsTable.storeId,
        productId: inventoryMovementsTable.productId,
        userId: inventoryMovementsTable.userId,
        type: inventoryMovementsTable.type,
        quantity: inventoryMovementsTable.quantity,
        previousStock: inventoryMovementsTable.previousStock,
        newStock: inventoryMovementsTable.newStock,
        reason: inventoryMovementsTable.reason,
        notes: inventoryMovementsTable.notes,
        createdAt: inventoryMovementsTable.createdAt,
      })
      .from(inventoryMovementsTable)
      .where(and(...dateFilters))
      .orderBy(inventoryMovementsTable.createdAt);

    const totalIn = movements
      .filter((m) => m.type === "in")
      .reduce((acc, m) => acc + Math.abs(m.quantity), 0);
    const totalOut = movements
      .filter((m) => m.type === "out")
      .reduce((acc, m) => acc + Math.abs(m.quantity), 0);
    const totalAdjustments = movements.filter((m) => m.type === "adjustment").length;

    const openingStock = movements.length > 0 ? movements[0].previousStock : product.stock;
    const closingStock = movements.length > 0 ? movements[movements.length - 1].newStock : product.stock;

    res.json({
      product,
      movements,
      openingStock,
      closingStock,
      totalIn,
      totalOut,
      totalAdjustments,
    });
  } catch (err) {
    req.log.error({ err }, "Get kardex error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/movements", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const productId = req.query.productId as string | undefined;
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;
  const type = req.query.type as string | undefined;

  try {
    const filters = [
      eq(inventoryMovementsTable.storeId, user.storeId),
      productId ? eq(inventoryMovementsTable.productId, productId) : undefined,
      dateFrom ? gte(inventoryMovementsTable.createdAt, new Date(dateFrom)) : undefined,
      dateTo
        ? lte(
            inventoryMovementsTable.createdAt,
            new Date(new Date(dateTo).setHours(23, 59, 59, 999))
          )
        : undefined,
      type ? eq(inventoryMovementsTable.type, type as "in" | "out" | "adjustment") : undefined,
    ].filter(Boolean) as Parameters<typeof and>[];

    const movements = await db
      .select({
        id: inventoryMovementsTable.id,
        storeId: inventoryMovementsTable.storeId,
        productId: inventoryMovementsTable.productId,
        userId: inventoryMovementsTable.userId,
        type: inventoryMovementsTable.type,
        quantity: inventoryMovementsTable.quantity,
        previousStock: inventoryMovementsTable.previousStock,
        newStock: inventoryMovementsTable.newStock,
        reason: inventoryMovementsTable.reason,
        notes: inventoryMovementsTable.notes,
        createdAt: inventoryMovementsTable.createdAt,
        productName: productsTable.name,
        productSku: productsTable.sku,
      })
      .from(inventoryMovementsTable)
      .leftJoin(productsTable, eq(productsTable.id, inventoryMovementsTable.productId))
      .where(and(...filters))
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${inventoryMovementsTable.createdAt} desc`);

    const [{ total }] = await db
      .select({ total: count() })
      .from(inventoryMovementsTable)
      .where(and(...filters));

    res.json({
      data: movements,
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Get inventory movements error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
