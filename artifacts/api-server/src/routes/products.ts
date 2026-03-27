import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable, categoriesTable } from "@workspace/db";
import { eq, and, ilike, count, lte, gte, sql, asc, desc, or, exists } from "drizzle-orm";
import { productVariantsTable } from "@workspace/db";
import { requireAuth, requireStoreAdmin } from "../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

const buildProductSelect = () => ({
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
});

// IMPORTANT: /export and /import must be defined BEFORE /:productId
router.get("/export", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  const categoryId = req.query.categoryId as string | undefined;
  const isActive = req.query.isActive !== undefined
    ? req.query.isActive === "true"
    : undefined;

  try {
    const filters = [
      eq(productsTable.storeId, user.storeId),
      categoryId ? eq(productsTable.categoryId, categoryId) : undefined,
      isActive !== undefined ? eq(productsTable.isActive, isActive) : undefined,
    ].filter(Boolean) as Parameters<typeof and>[];

    const products = await db
      .select({
        id: productsTable.id,
        sku: productsTable.sku,
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        salePrice: productsTable.salePrice,
        costPrice: productsTable.costPrice,
        stock: productsTable.stock,
        minStock: productsTable.minStock,
        unit: productsTable.unit,
        isActive: productsTable.isActive,
        isFeatured: productsTable.isFeatured,
        tags: productsTable.tags,
        imageUrl: productsTable.imageUrl,
        categoryName: categoriesTable.name,
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
      .where(and(...filters))
      .orderBy(productsTable.name);

    const rows = products.map((p) => ({
      id: p.id,
      sku: p.sku || "",
      name: p.name,
      description: p.description || "",
      category: p.categoryName || "",
      price: parseFloat(String(p.price)),
      salePrice: p.salePrice ? parseFloat(String(p.salePrice)) : null,
      costPrice: p.costPrice ? parseFloat(String(p.costPrice)) : null,
      stock: p.stock,
      minStock: p.minStock,
      unit: p.unit || "unidad",
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      tags: p.tags ? p.tags.join(", ") : "",
      imageUrl: p.imageUrl || "",
    }));

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Export products error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/import", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  const schema = z.object({
    products: z.array(
      z.object({
        name: z.string().min(1),
        sku: z.string().optional(),
        description: z.string().optional(),
        categoryName: z.string().optional(),
        price: z.number().positive(),
        costPrice: z.number().positive().optional(),
        salePrice: z.number().positive().optional(),
        stock: z.number().int().min(0).default(0),
        minStock: z.number().int().min(0).default(0),
        unit: z.string().optional(),
        isActive: z.boolean().default(true),
        tags: z.string().optional(),
      })
    ),
    updateExisting: z.boolean().default(false),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  const { products, updateExisting } = result.data;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: { row: number; message: string }[] = [];

  // Pre-load categories for name lookup
  const cats = await db
    .select({ id: categoriesTable.id, name: categoriesTable.name })
    .from(categoriesTable)
    .where(eq(categoriesTable.storeId, user.storeId));

  const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]));

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
      const categoryId = p.categoryName
        ? catByName.get(p.categoryName.toLowerCase())
        : undefined;

      const tagsArray = p.tags
        ? p.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      if (updateExisting && p.sku) {
        // Try to find existing product by SKU
        const [existing] = await db
          .select({ id: productsTable.id })
          .from(productsTable)
          .where(
            and(
              eq(productsTable.storeId, user.storeId),
              eq(productsTable.sku, p.sku)
            )
          )
          .limit(1);

        if (existing) {
          await db
            .update(productsTable)
            .set({
              name: p.name,
              description: p.description,
              categoryId,
              price: String(p.price),
              costPrice: p.costPrice ? String(p.costPrice) : undefined,
              salePrice: p.salePrice ? String(p.salePrice) : undefined,
              stock: p.stock,
              minStock: p.minStock,
              unit: p.unit,
              isActive: p.isActive,
              tags: tagsArray.length > 0 ? tagsArray : undefined,
              updatedAt: new Date(),
            })
            .where(eq(productsTable.id, existing.id));
          updated++;
          continue;
        }
      }

      await db.insert(productsTable).values({
        storeId: user.storeId,
        name: p.name,
        sku: p.sku,
        description: p.description,
        categoryId,
        price: String(p.price),
        costPrice: p.costPrice ? String(p.costPrice) : undefined,
        salePrice: p.salePrice ? String(p.salePrice) : undefined,
        stock: p.stock,
        minStock: p.minStock,
        unit: p.unit,
        isActive: p.isActive,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      });
      created++;
    } catch (err: any) {
      errors.push({ row: i + 1, message: err.message || "Error desconocido" });
      skipped++;
    }
  }

  res.json({ created, updated, skipped, errors });
});

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
  const isActive = req.query.isActive !== undefined
    ? req.query.isActive === "true"
    : undefined;
  const isFeatured = req.query.isFeatured !== undefined
    ? req.query.isFeatured === "true"
    : undefined;
  const tags = req.query.tags as string | undefined;
  const sortBy = (req.query.sortBy as string) || "name";
  const sortDir = (req.query.sortDir as string) || "asc";
  const talla = req.query.talla as string | undefined;
  const color = req.query.color as string | undefined;
  const estilo = req.query.estilo as string | undefined;
  const precioMin = req.query.precioMin ? Number(req.query.precioMin) : undefined;
  const precioMax = req.query.precioMax ? Number(req.query.precioMax) : undefined;
  const hasVariants = req.query.hasVariants !== undefined
    ? req.query.hasVariants === "true"
    : undefined;

  try {
    const variantSubFilters = [
      eq(productVariantsTable.productId, productsTable.id),
      talla ? ilike(productVariantsTable.talla, `%${talla}%`) : undefined,
      color ? ilike(productVariantsTable.color, `%${color}%`) : undefined,
      estilo ? ilike(productVariantsTable.estilo, `%${estilo}%`) : undefined,
    ].filter(Boolean) as Parameters<typeof and>[];

    const hasVariantFilter =
      (talla || color || estilo || hasVariants === true)
        ? exists(
            db
              .select({ one: sql`1` })
              .from(productVariantsTable)
              .where(and(...variantSubFilters))
          )
        : hasVariants === false
        ? sql`NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = ${productsTable.id})`
        : undefined;

    const filters = [
      eq(productsTable.storeId, user.storeId),
      categoryId ? eq(productsTable.categoryId, categoryId) : undefined,
      search
        ? or(
            ilike(productsTable.name, `%${search}%`),
            ilike(productsTable.sku, `%${search}%`)
          )
        : undefined,
      lowStock ? lte(productsTable.stock, sql`${productsTable.minStock}`) : undefined,
      isActive !== undefined ? eq(productsTable.isActive, isActive) : undefined,
      isFeatured !== undefined ? eq(productsTable.isFeatured, isFeatured) : undefined,
      tags
        ? sql`${productsTable.tags} && ARRAY[${sql.raw(
            tags
              .split(",")
              .map((t) => `'${t.trim().replace(/'/g, "''")}'`)
              .join(",")
          )}]::text[]`
        : undefined,
      precioMin !== undefined ? gte(productsTable.price, String(precioMin)) : undefined,
      precioMax !== undefined ? lte(productsTable.price, String(precioMax)) : undefined,
      hasVariantFilter,
    ].filter(Boolean) as Parameters<typeof and>[];

    const orderCol =
      sortBy === "price"
        ? productsTable.price
        : sortBy === "stock"
        ? productsTable.stock
        : sortBy === "createdAt"
        ? productsTable.createdAt
        : productsTable.name;

    const orderFn = sortDir === "desc" ? desc : asc;

    const products = await db
      .select(buildProductSelect())
      .from(productsTable)
      .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
      .where(and(...filters))
      .limit(limit)
      .offset(offset)
      .orderBy(orderFn(orderCol));

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
      .select(buildProductSelect())
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
    longDescription: z.string().optional(),
    price: z.number().positive(),
    salePrice: z.number().positive().optional(),
    saleStartDate: z.string().datetime().optional(),
    saleEndDate: z.string().datetime().optional(),
    costPrice: z.number().positive().optional(),
    categoryId: z.string().optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    imageUrl: z.string().url().optional(),
    stock: z.number().int().min(0).default(0),
    minStock: z.number().int().min(0).default(0),
    unit: z.string().optional(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  try {
    const data = result.data;
    const [product] = await db
      .insert(productsTable)
      .values({
        storeId: user.storeId,
        ...data,
        price: String(data.price),
        salePrice: data.salePrice ? String(data.salePrice) : undefined,
        costPrice: data.costPrice ? String(data.costPrice) : undefined,
        saleStartDate: data.saleStartDate ? new Date(data.saleStartDate) : undefined,
        saleEndDate: data.saleEndDate ? new Date(data.saleEndDate) : undefined,
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
    longDescription: z.string().optional(),
    price: z.number().positive().optional(),
    salePrice: z.number().positive().optional().nullable(),
    saleStartDate: z.string().datetime().optional().nullable(),
    saleEndDate: z.string().datetime().optional().nullable(),
    costPrice: z.number().positive().optional(),
    categoryId: z.string().optional().nullable(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    imageUrl: z.string().url().optional().nullable(),
    stock: z.number().int().min(0).optional(),
    minStock: z.number().int().min(0).optional(),
    unit: z.string().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
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
        salePrice: data.salePrice !== undefined
          ? data.salePrice === null ? null : String(data.salePrice)
          : undefined,
        costPrice: data.costPrice !== undefined ? String(data.costPrice) : undefined,
        saleStartDate: data.saleStartDate !== undefined
          ? data.saleStartDate === null ? null : new Date(data.saleStartDate)
          : undefined,
        saleEndDate: data.saleEndDate !== undefined
          ? data.saleEndDate === null ? null : new Date(data.saleEndDate)
          : undefined,
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
