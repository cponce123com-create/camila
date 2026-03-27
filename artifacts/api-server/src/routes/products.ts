import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable, categoriesTable } from "@workspace/db";
import { eq, and, ilike, count, lte, sql } from "drizzle-orm";
import { requireAuth, requireStoreAdmin } from "../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const categoryId = req.query.categoryId as string | undefined;
  const search = req.query.search as string | undefined;
  const lowStock = req.query.lowStock === "true";

  try {
    const filters = [
      eq(productsTable.storeId, user.storeId),
      categoryId ? eq(productsTable.categoryId, categoryId) : undefined,
      search ? ilike(productsTable.name, `%${search}%`) : undefined,
      lowStock ? lte(productsTable.stock, sql`${productsTable.minStock}`) : undefined,
    ].filter(Boolean) as Parameters<typeof and>[];

    const products = await db
      .select({
        id: productsTable.id,
        storeId: productsTable.storeId,
        categoryId: productsTable.categoryId,
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        costPrice: productsTable.costPrice,
        sku: productsTable.sku,
        barcode: productsTable.barcode,
        imageUrl: productsTable.imageUrl,
        stock: productsTable.stock,
        minStock: productsTable.minStock,
        unit: productsTable.unit,
        isActive: productsTable.isActive,
        createdAt: productsTable.createdAt,
        category: {
          id: categoriesTable.id,
          storeId: categoriesTable.storeId,
          name: categoriesTable.name,
          description: categoriesTable.description,
          sortOrder: categoriesTable.sortOrder,
          createdAt: categoriesTable.createdAt,
        },
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
      .where(and(...filters))
      .limit(limit)
      .offset(offset)
      .orderBy(productsTable.name);

    const [{ total }] = await db
      .select({ total: count() })
      .from(productsTable)
      .where(and(...filters));

    res.json({
      data: products,
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Get products error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/:productId", requireAuth, async (req, res) => {
  const user = req.user!;
  const { productId } = req.params;

  try {
    const [product] = await db
      .select({
        id: productsTable.id,
        storeId: productsTable.storeId,
        categoryId: productsTable.categoryId,
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        costPrice: productsTable.costPrice,
        sku: productsTable.sku,
        barcode: productsTable.barcode,
        imageUrl: productsTable.imageUrl,
        stock: productsTable.stock,
        minStock: productsTable.minStock,
        unit: productsTable.unit,
        isActive: productsTable.isActive,
        createdAt: productsTable.createdAt,
        category: {
          id: categoriesTable.id,
          storeId: categoriesTable.storeId,
          name: categoriesTable.name,
          description: categoriesTable.description,
          sortOrder: categoriesTable.sortOrder,
          createdAt: categoriesTable.createdAt,
        },
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
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

    res.json(product);
  } catch (err) {
    req.log.error({ err }, "Get product error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().positive(),
    costPrice: z.number().positive().optional(),
    categoryId: z.string().optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    imageUrl: z.string().url().optional(),
    stock: z.number().int().min(0).default(0),
    minStock: z.number().int().min(0).default(0),
    unit: z.string().optional(),
    isActive: z.boolean().default(true),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  try {
    const [product] = await db
      .insert(productsTable)
      .values({
        storeId: user.storeId,
        ...result.data,
        price: String(result.data.price),
        costPrice: result.data.costPrice ? String(result.data.costPrice) : undefined,
      })
      .returning();
    res.status(201).json(product);
  } catch (err) {
    req.log.error({ err }, "Create product error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/:productId", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  const { productId } = req.params;

  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    price: z.number().positive().optional(),
    costPrice: z.number().positive().optional(),
    categoryId: z.string().optional().nullable(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    imageUrl: z.string().url().optional().nullable(),
    stock: z.number().int().min(0).optional(),
    minStock: z.number().int().min(0).optional(),
    unit: z.string().optional(),
    isActive: z.boolean().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const data = result.data;

  try {
    const [updated] = await db
      .update(productsTable)
      .set({
        ...data,
        price: data.price !== undefined ? String(data.price) : undefined,
        costPrice: data.costPrice !== undefined ? String(data.costPrice) : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(productsTable.id, productId),
          eq(productsTable.storeId, user.storeId!)
        )
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Update product error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.delete("/:productId", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  const { productId } = req.params;

  try {
    await db
      .delete(productsTable)
      .where(
        and(
          eq(productsTable.id, productId),
          eq(productsTable.storeId, user.storeId!)
        )
      );

    res.json({ success: true, message: "Producto eliminado" });
  } catch (err) {
    req.log.error({ err }, "Delete product error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
