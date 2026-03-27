import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  storesTable,
  licensesTable,
} from "@workspace/db";
import { eq, ilike, count, and, sql } from "drizzle-orm";
import { requireSuperAdmin } from "../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

router.get("/stores", requireSuperAdmin, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;
  const offset = (page - 1) * limit;

  try {
    const stores = await db
      .select({
        store: storesTable,
        license: licensesTable,
      })
      .from(storesTable)
      .leftJoin(licensesTable, eq(licensesTable.storeId, storesTable.id))
      .where(
        and(
          search
            ? ilike(storesTable.businessName, `%${search}%`)
            : undefined,
          status
            ? eq(licensesTable.status, status as "trial" | "active" | "expired" | "suspended")
            : undefined
        )
      )
      .limit(limit)
      .offset(offset)
      .orderBy(storesTable.createdAt);

    const [{ total }] = await db
      .select({ total: count() })
      .from(storesTable)
      .leftJoin(licensesTable, eq(licensesTable.storeId, storesTable.id))
      .where(
        and(
          search ? ilike(storesTable.businessName, `%${search}%`) : undefined,
          status
            ? eq(licensesTable.status, status as "trial" | "active" | "expired" | "suspended")
            : undefined
        )
      );

    const data = stores.map(({ store, license }) => ({
      ...store,
      license: license ?? null,
    }));

    res.json({
      data,
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Admin get all stores error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/stores/:storeId", requireSuperAdmin, async (req, res) => {
  const { storeId } = req.params;

  try {
    const [store] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.id, storeId))
      .limit(1);

    if (!store) {
      res.status(404).json({ error: "Tienda no encontrada" });
      return;
    }

    const [license] = await db
      .select()
      .from(licensesTable)
      .where(eq(licensesTable.storeId, storeId))
      .limit(1);

    res.json({ ...store, license: license ?? null });
  } catch (err) {
    req.log.error({ err }, "Admin get store error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/stores/:storeId", requireSuperAdmin, async (req, res) => {
  const { storeId } = req.params;

  const schema = z.object({
    businessName: z.string().min(2).optional(),
    address: z.string().optional(),
    district: z.string().min(2).optional(),
    phone: z.string().optional(),
    isActive: z.boolean().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  try {
    const [updated] = await db
      .update(storesTable)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(storesTable.id, storeId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Tienda no encontrada" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Admin update store error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/stores/:storeId/license", requireSuperAdmin, async (req, res) => {
  const { storeId } = req.params;

  const schema = z.object({
    status: z.enum(["trial", "active", "expired", "suspended"]),
    startsAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    notes: z.string().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const data = result.data;

  try {
    const [existing] = await db
      .select({ id: licensesTable.id })
      .from(licensesTable)
      .where(eq(licensesTable.storeId, storeId))
      .limit(1);

    let license;
    if (existing) {
      const [updated] = await db
        .update(licensesTable)
        .set({
          status: data.status,
          startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
          notes: data.notes,
          updatedAt: new Date(),
        })
        .where(eq(licensesTable.storeId, storeId))
        .returning();
      license = updated;
    } else {
      const [created] = await db
        .insert(licensesTable)
        .values({
          storeId,
          status: data.status,
          startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
          notes: data.notes,
        })
        .returning();
      license = created;
    }

    res.json(license);
  } catch (err) {
    req.log.error({ err }, "Admin update license error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/stats", requireSuperAdmin, async (req, res) => {
  try {
    const [totalResult] = await db
      .select({ total: count() })
      .from(storesTable);

    const licenseStats = await db
      .select({
        status: licensesTable.status,
        count: count(),
      })
      .from(licensesTable)
      .groupBy(licensesTable.status);

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [newThisMonthResult] = await db
      .select({ count: count() })
      .from(storesTable)
      .where(sql`${storesTable.createdAt} >= ${firstOfMonth}`);

    const statsByStatus: Record<string, number> = {};
    for (const row of licenseStats) {
      statsByStatus[row.status] = Number(row.count);
    }

    res.json({
      totalStores: Number(totalResult.total),
      activeStores: statsByStatus["active"] ?? 0,
      trialStores: statsByStatus["trial"] ?? 0,
      expiredStores: statsByStatus["expired"] ?? 0,
      suspendedStores: statsByStatus["suspended"] ?? 0,
      newThisMonth: Number(newThisMonthResult.count),
    });
  } catch (err) {
    req.log.error({ err }, "Admin stats error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
