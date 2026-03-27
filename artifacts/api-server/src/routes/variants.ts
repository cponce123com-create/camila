import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productVariantsTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import { z } from "zod";

const router: IRouter = Router({ mergeParams: true });

const variantSchema = z.object({
  sku: z.string().optional(),
  talla: z.string().optional(),
  color: z.string().optional(),
  colorHex: z.string().optional(),
  estilo: z.string().optional(),
  material: z.string().optional(),
  genero: z.string().optional(),
  temporada: z.string().optional(),
  price: z.coerce.number().positive().optional(),
  salePrice: z.coerce.number().positive().optional(),
  imageUrl: z.string().url().optional(),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

async function verifyProductOwnership(
  productId: string,
  storeId: string
): Promise<boolean> {
  const [product] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(
      and(eq(productsTable.id, productId), eq(productsTable.storeId, storeId))
    )
    .limit(1);
  return !!product;
}

router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }
  const { productId } = req.params;
  const isActive =
    req.query.isActive !== undefined
      ? req.query.isActive === "true"
      : undefined;

  try {
    const owns = await verifyProductOwnership(productId, user.storeId);
    if (!owns) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const filters = [
      eq(productVariantsTable.productId, productId),
      eq(productVariantsTable.storeId, user.storeId),
      isActive !== undefined
        ? eq(productVariantsTable.isActive, isActive)
        : undefined,
    ].filter(Boolean) as Parameters<typeof and>[];

    const variants = await db
      .select()
      .from(productVariantsTable)
      .where(and(...filters))
      .orderBy(productVariantsTable.sortOrder, productVariantsTable.createdAt);

    res.json(variants);
  } catch (err) {
    req.log.error({ err }, "Get variants error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }
  const { productId } = req.params;

  const result = variantSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  try {
    const owns = await verifyProductOwnership(productId, user.storeId);
    if (!owns) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const data = result.data;
    const [variant] = await db
      .insert(productVariantsTable)
      .values({
        storeId: user.storeId,
        productId,
        sku: data.sku,
        talla: data.talla,
        color: data.color,
        colorHex: data.colorHex,
        estilo: data.estilo,
        material: data.material,
        genero: data.genero,
        temporada: data.temporada,
        price: data.price !== undefined ? String(data.price) : undefined,
        salePrice:
          data.salePrice !== undefined ? String(data.salePrice) : undefined,
        imageUrl: data.imageUrl,
        stock: data.stock,
        minStock: data.minStock,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      })
      .returning();

    res.status(201).json(variant);
  } catch (err) {
    req.log.error({ err }, "Create variant error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/:variantId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }
  const { productId, variantId } = req.params;

  const result = variantSchema.partial().safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  try {
    const owns = await verifyProductOwnership(productId, user.storeId);
    if (!owns) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const [existing] = await db
      .select({ id: productVariantsTable.id })
      .from(productVariantsTable)
      .where(
        and(
          eq(productVariantsTable.id, variantId),
          eq(productVariantsTable.productId, productId),
          eq(productVariantsTable.storeId, user.storeId)
        )
      )
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Variante no encontrada" });
      return;
    }

    const data = result.data;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.talla !== undefined) updateData.talla = data.talla;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.colorHex !== undefined) updateData.colorHex = data.colorHex;
    if (data.estilo !== undefined) updateData.estilo = data.estilo;
    if (data.material !== undefined) updateData.material = data.material;
    if (data.genero !== undefined) updateData.genero = data.genero;
    if (data.temporada !== undefined) updateData.temporada = data.temporada;
    if (data.price !== undefined) updateData.price = String(data.price);
    if (data.salePrice !== undefined)
      updateData.salePrice = String(data.salePrice);
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.minStock !== undefined) updateData.minStock = data.minStock;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    const [updated] = await db
      .update(productVariantsTable)
      .set(updateData)
      .where(eq(productVariantsTable.id, variantId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Update variant error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.delete("/:variantId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }
  const { productId, variantId } = req.params;

  try {
    const owns = await verifyProductOwnership(productId, user.storeId);
    if (!owns) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const [deleted] = await db
      .delete(productVariantsTable)
      .where(
        and(
          eq(productVariantsTable.id, variantId),
          eq(productVariantsTable.productId, productId),
          eq(productVariantsTable.storeId, user.storeId)
        )
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Variante no encontrada" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete variant error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
