import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  storesTable,
  storeSettingsTable,
  storeBannersTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireStoreAdmin } from "../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

// ─── Store Settings ───────────────────────────────────────────────────────────

router.get("/settings", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  try {
    let [settings] = await db
      .select()
      .from(storeSettingsTable)
      .where(eq(storeSettingsTable.storeId, user.storeId))
      .limit(1);

    // Auto-create default settings if not present
    if (!settings) {
      const [created] = await db
        .insert(storeSettingsTable)
        .values({ storeId: user.storeId })
        .returning();
      settings = created;
    }

    res.json(settings);
  } catch (err) {
    req.log.error({ err }, "Get store settings error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/settings", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  const schema = z.object({
    catalogView: z.enum(["grid", "list", "featured"]).optional(),
    font: z.enum(["inter", "poppins", "roboto", "playfair", "montserrat", "nunito"]).optional(),
    template: z.enum(["moderna", "clasica", "minimalista", "vibrante", "elegante"]).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    showOffers: z.boolean().optional(),
    showComments: z.boolean().optional(),
    showStock: z.boolean().optional(),
    showMenuOfDay: z.boolean().optional(),
    restaurantModule: z.boolean().optional(),
    showWhatsappButton: z.boolean().optional(),
    showYapeQr: z.boolean().optional(),
    yapeQrUrl: z.string().url().optional().nullable(),
    businessHours: z.string().optional(),
    thankYouMessage: z.preprocess(v => v === "" ? undefined : v, z.string().max(200).optional()),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  try {
    const existing = await db
      .select({ id: storeSettingsTable.id })
      .from(storeSettingsTable)
      .where(eq(storeSettingsTable.storeId, user.storeId))
      .limit(1);

    let settings;
    if (existing.length > 0) {
      const [updated] = await db
        .update(storeSettingsTable)
        .set({ ...result.data, updatedAt: new Date() })
        .where(eq(storeSettingsTable.storeId, user.storeId))
        .returning();
      settings = updated;
    } else {
      const [created] = await db
        .insert(storeSettingsTable)
        .values({ storeId: user.storeId, ...result.data })
        .returning();
      settings = created;
    }

    res.json(settings);
  } catch (err) {
    req.log.error({ err }, "Update store settings error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── Store Banners ────────────────────────────────────────────────────────────

const MAX_BANNERS = 5;

router.get("/banners", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  try {
    const banners = await db
      .select()
      .from(storeBannersTable)
      .where(eq(storeBannersTable.storeId, user.storeId))
      .orderBy(storeBannersTable.sortOrder, storeBannersTable.createdAt);

    res.json(banners);
  } catch (err) {
    req.log.error({ err }, "Get store banners error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/banners", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  const schema = z.object({
    imageUrl: z.string().url("La URL de imagen no es válida"),
    title: z.preprocess(v => v === "" ? undefined : v, z.string().max(100).optional()),
    subtitle: z.preprocess(v => v === "" ? undefined : v, z.string().max(200).optional()),
    linkUrl: z.preprocess(v => v === "" ? undefined : v, z.string().url("El enlace no es una URL válida").optional()),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  try {
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(storeBannersTable)
      .where(eq(storeBannersTable.storeId, user.storeId));

    if (countRow.count >= MAX_BANNERS) {
      res.status(400).json({
        error: `Solo puedes tener hasta ${MAX_BANNERS} banners promocionales`,
      });
      return;
    }

    const [banner] = await db
      .insert(storeBannersTable)
      .values({
        storeId: user.storeId,
        ...result.data,
        sortOrder: result.data.sortOrder ?? countRow.count,
      })
      .returning();

    res.status(201).json(banner);
  } catch (err) {
    req.log.error({ err }, "Create banner error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/banners/reorder", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  const schema = z.object({
    orderedIds: z.array(z.string()),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  try {
    await Promise.all(
      result.data.orderedIds.map((id, index) =>
        db
          .update(storeBannersTable)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(
            and(
              eq(storeBannersTable.id, id),
              eq(storeBannersTable.storeId, user.storeId!)
            )
          )
      )
    );

    res.json({ success: true, message: "Orden actualizado" });
  } catch (err) {
    req.log.error({ err }, "Reorder banners error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/banners/:bannerId", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  const { bannerId } = req.params;

  const schema = z.object({
    imageUrl: z.string().url().optional(),
    title: z.string().max(100).optional(),
    subtitle: z.string().max(200).optional(),
    linkUrl: z.string().url().optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  try {
    const [updated] = await db
      .update(storeBannersTable)
      .set({ ...result.data, updatedAt: new Date() })
      .where(
        and(
          eq(storeBannersTable.id, bannerId),
          eq(storeBannersTable.storeId, user.storeId!)
        )
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Banner no encontrado" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Update banner error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.delete("/banners/:bannerId", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  const { bannerId } = req.params;

  try {
    await db
      .delete(storeBannersTable)
      .where(
        and(
          eq(storeBannersTable.id, bannerId),
          eq(storeBannersTable.storeId, user.storeId!)
        )
      );

    res.json({ success: true, message: "Banner eliminado" });
  } catch (err) {
    req.log.error({ err }, "Delete banner error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
