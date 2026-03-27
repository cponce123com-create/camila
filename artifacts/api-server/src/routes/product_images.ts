import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  productImagesTable,
  productsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireStoreAdmin } from "../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

const MAX_IMAGES_PER_PRODUCT = 10;

router.get("/:productId/images", requireAuth, async (req, res) => {
  const user = req.user!;
  const { productId } = req.params;

  try {
    const [product] = await db
      .select({ id: productsTable.id })
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

    const images = await db
      .select()
      .from(productImagesTable)
      .where(eq(productImagesTable.productId, productId))
      .orderBy(productImagesTable.sortOrder, productImagesTable.createdAt);

    res.json(images);
  } catch (err) {
    req.log.error({ err }, "Get product images error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/:productId/images", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  const { productId } = req.params;

  const schema = z.object({
    imageUrl: z.string().url("URL de imagen inválida"),
    altText: z.string().max(200).optional(),
    sortOrder: z.number().int().min(0).optional(),
    isPrimary: z.boolean().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  try {
    const [product] = await db
      .select({ id: productsTable.id })
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

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productImagesTable)
      .where(eq(productImagesTable.productId, productId));

    if (countRow.count >= MAX_IMAGES_PER_PRODUCT) {
      res.status(400).json({
        error: `Límite de ${MAX_IMAGES_PER_PRODUCT} imágenes por producto alcanzado`,
      });
      return;
    }

    // If this is being set as primary, clear existing primary
    if (result.data.isPrimary) {
      await db
        .update(productImagesTable)
        .set({ isPrimary: false })
        .where(eq(productImagesTable.productId, productId));
    }

    // If it's the first image, make it primary automatically
    const isFirstImage = countRow.count === 0;

    const [image] = await db
      .insert(productImagesTable)
      .values({
        storeId: user.storeId!,
        productId,
        imageUrl: result.data.imageUrl,
        altText: result.data.altText,
        sortOrder: result.data.sortOrder ?? countRow.count,
        isPrimary: result.data.isPrimary ?? isFirstImage,
      })
      .returning();

    // Also update the main product imageUrl if it's the primary image
    if (image.isPrimary) {
      await db
        .update(productsTable)
        .set({ imageUrl: image.imageUrl, updatedAt: new Date() })
        .where(eq(productsTable.id, productId));
    }

    res.status(201).json(image);
  } catch (err) {
    req.log.error({ err }, "Add product image error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/:productId/images/reorder", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  const { productId } = req.params;

  const schema = z.object({
    orderedIds: z.array(z.string()),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  try {
    const [product] = await db
      .select({ id: productsTable.id })
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

    await Promise.all(
      result.data.orderedIds.map((id, index) =>
        db
          .update(productImagesTable)
          .set({ sortOrder: index })
          .where(
            and(
              eq(productImagesTable.id, id),
              eq(productImagesTable.productId, productId)
            )
          )
      )
    );

    res.json({ success: true, message: "Orden de imágenes actualizado" });
  } catch (err) {
    req.log.error({ err }, "Reorder product images error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/:productId/images/:imageId", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  const { productId, imageId } = req.params;

  const schema = z.object({
    altText: z.string().max(200).optional(),
    sortOrder: z.number().int().min(0).optional(),
    isPrimary: z.boolean().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  try {
    // If setting as primary, clear others first
    if (result.data.isPrimary) {
      await db
        .update(productImagesTable)
        .set({ isPrimary: false })
        .where(eq(productImagesTable.productId, productId));
    }

    const [updated] = await db
      .update(productImagesTable)
      .set(result.data)
      .where(
        and(
          eq(productImagesTable.id, imageId),
          eq(productImagesTable.productId, productId),
          eq(productImagesTable.storeId, user.storeId!)
        )
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Imagen no encontrada" });
      return;
    }

    // If setting primary, update the product's main imageUrl
    if (updated.isPrimary) {
      await db
        .update(productsTable)
        .set({ imageUrl: updated.imageUrl, updatedAt: new Date() })
        .where(eq(productsTable.id, productId));
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Update product image error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.delete("/:productId/images/:imageId", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  const { productId, imageId } = req.params;

  try {
    const [toDelete] = await db
      .select()
      .from(productImagesTable)
      .where(
        and(
          eq(productImagesTable.id, imageId),
          eq(productImagesTable.productId, productId),
          eq(productImagesTable.storeId, user.storeId!)
        )
      )
      .limit(1);

    if (!toDelete) {
      res.status(404).json({ error: "Imagen no encontrada" });
      return;
    }

    await db.delete(productImagesTable).where(eq(productImagesTable.id, imageId));

    // If deleted image was primary, set the next one as primary
    if (toDelete.isPrimary) {
      const [nextImage] = await db
        .select()
        .from(productImagesTable)
        .where(eq(productImagesTable.productId, productId))
        .orderBy(productImagesTable.sortOrder)
        .limit(1);

      if (nextImage) {
        await db
          .update(productImagesTable)
          .set({ isPrimary: true })
          .where(eq(productImagesTable.id, nextImage.id));

        await db
          .update(productsTable)
          .set({ imageUrl: nextImage.imageUrl, updatedAt: new Date() })
          .where(eq(productsTable.id, productId));
      } else {
        // No more images; clear product imageUrl
        await db
          .update(productsTable)
          .set({ imageUrl: null, updatedAt: new Date() })
          .where(eq(productsTable.id, productId));
      }
    }

    res.json({ success: true, message: "Imagen eliminada" });
  } catch (err) {
    req.log.error({ err }, "Delete product image error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
