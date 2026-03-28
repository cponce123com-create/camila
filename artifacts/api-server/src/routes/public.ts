import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  storesTable,
  productsTable,
  categoriesTable,
  productReviewsTable,
  productVariantsTable,
  storeBannersTable,
  storeSettingsTable,
} from "@workspace/db";
import { eq, and, avg, count, desc, asc, ilike, sql, isNotNull } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

async function getStoreBySlug(slug: string) {
  const [store] = await db
    .select({
      id: storesTable.id,
      slug: storesTable.slug,
      businessName: storesTable.businessName,
      businessType: storesTable.businessType,
      ownerName: storesTable.ownerName,
      district: storesTable.district,
      address: storesTable.address,
      phone: storesTable.phone,
      description: storesTable.description,
      logoUrl: storesTable.logoUrl,
      bannerUrl: storesTable.bannerUrl,
      primaryColor: storesTable.primaryColor,
      whatsapp: storesTable.whatsapp,
      socialInstagram: storesTable.socialInstagram,
      socialFacebook: storesTable.socialFacebook,
    })
    .from(storesTable)
    .where(and(eq(storesTable.slug, slug), eq(storesTable.isActive, true)))
    .limit(1);
  return store ?? null;
}

// ─── GET /api/public/stores/:slug ────────────────────────────────────────────
router.get("/stores/:slug", async (req, res) => {
  const store = await getStoreBySlug(req.params.slug);
  if (!store) {
    res.status(404).json({ error: "Tienda no encontrada" });
    return;
  }

  const [{ reviewCount, avgRating }] = await db
    .select({
      reviewCount: count(productReviewsTable.id),
      avgRating: avg(productReviewsTable.rating),
    })
    .from(productReviewsTable)
    .where(
      and(
        eq(productReviewsTable.storeId, store.id),
        eq(productReviewsTable.isApproved, true)
      )
    );

  res.json({
    ...store,
    reviewCount: Number(reviewCount),
    avgRating: avgRating ? parseFloat(Number(avgRating).toFixed(1)) : null,
  });
});

// ─── GET /api/public/stores/:slug/categories ─────────────────────────────────
router.get("/stores/:slug/categories", async (req, res) => {
  const store = await getStoreBySlug(req.params.slug);
  if (!store) { res.status(404).json({ error: "Tienda no encontrada" }); return; }

  const cats = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      productCount: count(productsTable.id),
    })
    .from(categoriesTable)
    .leftJoin(
      productsTable,
      and(
        eq(productsTable.categoryId, categoriesTable.id),
        eq(productsTable.isActive, true)
      )
    )
    .where(eq(categoriesTable.storeId, store.id))
    .groupBy(categoriesTable.id, categoriesTable.name)
    .orderBy(asc(categoriesTable.name));

  res.json(cats);
});

// ─── GET /api/public/stores/:slug/products ───────────────────────────────────
router.get("/stores/:slug/products", async (req, res) => {
  const store = await getStoreBySlug(req.params.slug);
  if (!store) { res.status(404).json({ error: "Tienda no encontrada" }); return; }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 24));
  const offset = (page - 1) * limit;
  const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;

  const filters = [
    eq(productsTable.storeId, store.id),
    eq(productsTable.isActive, true),
    categoryId ? eq(productsTable.categoryId, categoryId) : undefined,
    search ? ilike(productsTable.name, `%${search}%`) : undefined,
  ].filter(Boolean) as Parameters<typeof and>[];

  const isFeatured = typeof req.query.isFeatured === "string" ? req.query.isFeatured === "true" : undefined;
  const hasOffer = typeof req.query.hasOffer === "string" ? req.query.hasOffer === "true" : undefined;

  if (isFeatured) filters.push(eq(productsTable.isFeatured, true) as any);
  if (hasOffer) filters.push(isNotNull(productsTable.salePrice) as any);

  const products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      salePrice: productsTable.salePrice,
      imageUrl: productsTable.imageUrl,
      stock: productsTable.stock,
      isFeatured: productsTable.isFeatured,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      avgRating: avg(productReviewsTable.rating),
      reviewCount: count(productReviewsTable.id),
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .leftJoin(
      productReviewsTable,
      and(
        eq(productReviewsTable.productId, productsTable.id),
        eq(productReviewsTable.isApproved, true)
      )
    )
    .where(and(...filters))
    .groupBy(productsTable.id, categoriesTable.name)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(productsTable.isFeatured), asc(productsTable.name));

  const [{ total }] = await db
    .select({ total: count() })
    .from(productsTable)
    .where(and(...filters));

  res.json({
    data: products.map((p) => ({
      ...p,
      avgRating: p.avgRating ? parseFloat(Number(p.avgRating).toFixed(1)) : null,
      reviewCount: Number(p.reviewCount),
    })),
    total: Number(total),
    page,
    limit,
    totalPages: Math.ceil(Number(total) / limit),
  });
});

// ─── GET /api/public/stores/:slug/products/:productId ────────────────────────
router.get("/stores/:slug/products/:productId", async (req, res) => {
  const store = await getStoreBySlug(req.params.slug);
  if (!store) { res.status(404).json({ error: "Tienda no encontrada" }); return; }

  const [product] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      imageUrl: productsTable.imageUrl,
      stock: productsTable.stock,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(
      and(
        eq(productsTable.id, req.params.productId),
        eq(productsTable.storeId, store.id),
        eq(productsTable.isActive, true)
      )
    )
    .limit(1);

  if (!product) { res.status(404).json({ error: "Producto no encontrado" }); return; }

  const variants = await db
    .select({
      id: productVariantsTable.id,
      talla: productVariantsTable.talla,
      color: productVariantsTable.color,
      estilo: productVariantsTable.estilo,
      price: productVariantsTable.price,
      stock: productVariantsTable.stock,
    })
    .from(productVariantsTable)
    .where(eq(productVariantsTable.productId, product.id));

  const reviews = await db
    .select({
      id: productReviewsTable.id,
      customerName: productReviewsTable.customerName,
      rating: productReviewsTable.rating,
      comment: productReviewsTable.comment,
      createdAt: productReviewsTable.createdAt,
    })
    .from(productReviewsTable)
    .where(
      and(
        eq(productReviewsTable.productId, product.id),
        eq(productReviewsTable.isApproved, true)
      )
    )
    .orderBy(desc(productReviewsTable.createdAt))
    .limit(20);

  const [stats] = await db
    .select({
      avgRating: avg(productReviewsTable.rating),
      reviewCount: count(productReviewsTable.id),
    })
    .from(productReviewsTable)
    .where(
      and(
        eq(productReviewsTable.productId, product.id),
        eq(productReviewsTable.isApproved, true)
      )
    );

  res.json({
    ...product,
    variants,
    reviews,
    avgRating: stats.avgRating ? parseFloat(Number(stats.avgRating).toFixed(1)) : null,
    reviewCount: Number(stats.reviewCount),
  });
});

// ─── GET /api/public/stores/:slug/banners ────────────────────────────────────
router.get("/stores/:slug/banners", async (req, res) => {
  const store = await getStoreBySlug(req.params.slug);
  if (!store) { res.status(404).json({ error: "Tienda no encontrada" }); return; }

  const banners = await db
    .select({
      id: storeBannersTable.id,
      imageUrl: storeBannersTable.imageUrl,
      title: storeBannersTable.title,
      subtitle: storeBannersTable.subtitle,
      linkUrl: storeBannersTable.linkUrl,
      sortOrder: storeBannersTable.sortOrder,
    })
    .from(storeBannersTable)
    .where(and(eq(storeBannersTable.storeId, store.id), eq(storeBannersTable.isActive, true)))
    .orderBy(asc(storeBannersTable.sortOrder));

  res.json(banners);
});

// ─── GET /api/public/stores/:slug/config ─────────────────────────────────────
router.get("/stores/:slug/config", async (req, res) => {
  const store = await getStoreBySlug(req.params.slug);
  if (!store) { res.status(404).json({ error: "Tienda no encontrada" }); return; }

  const [settings] = await db
    .select({
      showWhatsappButton: storeSettingsTable.showWhatsappButton,
      showYapeQr: storeSettingsTable.showYapeQr,
      yapeQrUrl: storeSettingsTable.yapeQrUrl,
      showComments: storeSettingsTable.showComments,
      showOffers: storeSettingsTable.showOffers,
      catalogView: storeSettingsTable.catalogView,
      template: storeSettingsTable.template,
      font: storeSettingsTable.font,
      secondaryColor: storeSettingsTable.secondaryColor,
      businessHours: storeSettingsTable.businessHours,
    })
    .from(storeSettingsTable)
    .where(eq(storeSettingsTable.storeId, store.id))
    .limit(1);

  res.json(settings ?? {
    showWhatsappButton: true,
    showYapeQr: false,
    yapeQrUrl: null,
    showComments: true,
    showOffers: true,
    catalogView: "grid",
    template: "moderna",
    font: "inter",
    secondaryColor: null,
    businessHours: null,
  });
});

// ─── GET /api/public/stores/:slug/reviews ────────────────────────────────────
router.get("/stores/:slug/reviews", async (req, res) => {
  const store = await getStoreBySlug(req.params.slug);
  if (!store) { res.status(404).json({ error: "Tienda no encontrada" }); return; }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  const offset = (page - 1) * limit;

  const reviews = await db
    .select({
      id: productReviewsTable.id,
      customerName: productReviewsTable.customerName,
      rating: productReviewsTable.rating,
      comment: productReviewsTable.comment,
      createdAt: productReviewsTable.createdAt,
      productName: productsTable.name,
    })
    .from(productReviewsTable)
    .leftJoin(productsTable, eq(productsTable.id, productReviewsTable.productId))
    .where(
      and(
        eq(productReviewsTable.storeId, store.id),
        eq(productReviewsTable.isApproved, true)
      )
    )
    .orderBy(desc(productReviewsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(productReviewsTable)
    .where(
      and(
        eq(productReviewsTable.storeId, store.id),
        eq(productReviewsTable.isApproved, true)
      )
    );

  res.json({
    data: reviews,
    total: Number(total),
    page,
    limit,
    totalPages: Math.ceil(Number(total) / limit),
  });
});

// ─── POST /api/public/stores/:slug/reviews ───────────────────────────────────
const submitReviewSchema = z.object({
  productId: z.string().min(1),
  customerName: z.string().min(1).max(100),
  customerEmail: z.string().email().optional().or(z.literal("")),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

router.post("/stores/:slug/reviews", async (req, res) => {
  const store = await getStoreBySlug(req.params.slug);
  if (!store) { res.status(404).json({ error: "Tienda no encontrada" }); return; }

  const result = submitReviewSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  const { productId, customerName, customerEmail, rating, comment } = result.data;

  try {
    const [product] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.id, productId),
          eq(productsTable.storeId, store.id),
          eq(productsTable.isActive, true)
        )
      )
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const [review] = await db
      .insert(productReviewsTable)
      .values({
        storeId: store.id,
        productId,
        customerName,
        customerEmail: customerEmail || null,
        rating,
        comment: comment || null,
        isApproved: false,
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "¡Gracias! Tu reseña está pendiente de moderación.",
      id: review.id,
    });
  } catch (err) {
    req.log?.error?.({ err }, "Public review submit error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
