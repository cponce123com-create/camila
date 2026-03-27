import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productReviewsTable, productsTable, productVariantsTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import { z } from "zod";

const perProductRouter: IRouter = Router({ mergeParams: true });
const allReviewsRouter: IRouter = Router();

const reviewSchema = z.object({
  variantId: z.string().optional(),
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
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

perProductRouter.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }
  const { productId } = req.params;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const isApproved =
    req.query.isApproved !== undefined
      ? req.query.isApproved === "true"
      : undefined;

  try {
    const owns = await verifyProductOwnership(productId, user.storeId);
    if (!owns) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const filters = [
      eq(productReviewsTable.productId, productId),
      eq(productReviewsTable.storeId, user.storeId),
      isApproved !== undefined
        ? eq(productReviewsTable.isApproved, isApproved)
        : undefined,
    ].filter(Boolean) as Parameters<typeof and>[];

    const reviews = await db
      .select({
        id: productReviewsTable.id,
        storeId: productReviewsTable.storeId,
        productId: productReviewsTable.productId,
        variantId: productReviewsTable.variantId,
        customerName: productReviewsTable.customerName,
        customerEmail: productReviewsTable.customerEmail,
        rating: productReviewsTable.rating,
        comment: productReviewsTable.comment,
        isApproved: productReviewsTable.isApproved,
        createdAt: productReviewsTable.createdAt,
        updatedAt: productReviewsTable.updatedAt,
        productName: productsTable.name,
        variantLabel: sql<string>`
          CONCAT_WS(' / ',
            NULLIF(${productVariantsTable.talla}, ''),
            NULLIF(${productVariantsTable.color}, ''),
            NULLIF(${productVariantsTable.estilo}, '')
          )
        `.as("variantLabel"),
      })
      .from(productReviewsTable)
      .leftJoin(productsTable, eq(productsTable.id, productReviewsTable.productId))
      .leftJoin(productVariantsTable, eq(productVariantsTable.id, productReviewsTable.variantId))
      .where(and(...filters))
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${productReviewsTable.createdAt} desc`);

    const [{ total }] = await db
      .select({ total: count() })
      .from(productReviewsTable)
      .where(and(...filters));

    res.json({
      data: reviews,
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Get product reviews error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

perProductRouter.post("/", async (req, res) => {
  const { productId } = req.params;

  const result = reviewSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  try {
    const [product] = await db
      .select({ id: productsTable.id, storeId: productsTable.storeId })
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.isActive, true)))
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const data = result.data;
    const [review] = await db
      .insert(productReviewsTable)
      .values({
        storeId: product.storeId,
        productId,
        variantId: data.variantId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        rating: data.rating,
        comment: data.comment,
        isApproved: false,
      })
      .returning();

    res.status(201).json(review);
  } catch (err) {
    req.log.error({ err }, "Create review error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

perProductRouter.patch("/:reviewId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }
  const { productId, reviewId } = req.params;

  const schema = z.object({
    isApproved: z.boolean(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  try {
    const [updated] = await db
      .update(productReviewsTable)
      .set({ isApproved: result.data.isApproved, updatedAt: new Date() })
      .where(
        and(
          eq(productReviewsTable.id, reviewId),
          eq(productReviewsTable.productId, productId),
          eq(productReviewsTable.storeId, user.storeId)
        )
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Reseña no encontrada" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Moderate review error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

perProductRouter.delete("/:reviewId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }
  const { productId, reviewId } = req.params;

  try {
    const [deleted] = await db
      .delete(productReviewsTable)
      .where(
        and(
          eq(productReviewsTable.id, reviewId),
          eq(productReviewsTable.productId, productId),
          eq(productReviewsTable.storeId, user.storeId)
        )
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Reseña no encontrada" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete review error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

allReviewsRouter.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const isApproved =
    req.query.isApproved !== undefined
      ? req.query.isApproved === "true"
      : undefined;

  try {
    const filters = [
      eq(productReviewsTable.storeId, user.storeId),
      isApproved !== undefined
        ? eq(productReviewsTable.isApproved, isApproved)
        : undefined,
    ].filter(Boolean) as Parameters<typeof and>[];

    const reviews = await db
      .select({
        id: productReviewsTable.id,
        storeId: productReviewsTable.storeId,
        productId: productReviewsTable.productId,
        variantId: productReviewsTable.variantId,
        customerName: productReviewsTable.customerName,
        customerEmail: productReviewsTable.customerEmail,
        rating: productReviewsTable.rating,
        comment: productReviewsTable.comment,
        isApproved: productReviewsTable.isApproved,
        createdAt: productReviewsTable.createdAt,
        updatedAt: productReviewsTable.updatedAt,
        productName: productsTable.name,
        variantLabel: sql<string>`
          CONCAT_WS(' / ',
            NULLIF(${productVariantsTable.talla}, ''),
            NULLIF(${productVariantsTable.color}, ''),
            NULLIF(${productVariantsTable.estilo}, '')
          )
        `.as("variantLabel"),
      })
      .from(productReviewsTable)
      .leftJoin(productsTable, eq(productsTable.id, productReviewsTable.productId))
      .leftJoin(productVariantsTable, eq(productVariantsTable.id, productReviewsTable.variantId))
      .where(and(...filters))
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${productReviewsTable.createdAt} desc`);

    const [{ total }] = await db
      .select({ total: count() })
      .from(productReviewsTable)
      .where(and(...filters));

    res.json({
      data: reviews,
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Get all reviews error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export { perProductRouter, allReviewsRouter };
