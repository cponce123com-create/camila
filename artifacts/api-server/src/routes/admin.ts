import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  storesTable,
  licensesTable,
  usersTable,
  licenseHistoryTable,
  auditLogsTable,
  supportTicketsTable,
  announcementsTable,
  salesTable,
  saleItemsTable,
  licenseCodesTable,
} from "@workspace/db";
import { eq, ilike, count, and, sql, desc, asc, or, gte, inArray } from "drizzle-orm";
import { requireSuperAdmin, requireAuth } from "../middlewares/session";
import { hashPassword } from "../lib/auth";
import { sendLicenseExpiringEmail } from "../lib/email";
import { z } from "zod";

const router: IRouter = Router();

async function recordAudit(
  actorId: string | null,
  actorEmail: string | null,
  actorRole: string | null,
  action: string,
  targetType: string | null,
  targetId: string | null,
  targetLabel: string | null,
  details: Record<string, unknown> | null,
  ipAddress: string | null
) {
  try {
    await db.insert(auditLogsTable).values({
      actorId,
      actorEmail,
      actorRole,
      action,
      targetType,
      targetId,
      targetLabel,
      details,
      ipAddress,
    });
  } catch (_) {}
}

router.get("/stores", requireSuperAdmin, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;
  const offset = (page - 1) * limit;

  try {
    const whereClause = and(
      search
        ? or(
            ilike(storesTable.businessName, `%${search}%`),
            ilike(storesTable.phone, `%${search}%`),
            ilike(storesTable.email, `%${search}%`)
          )
        : undefined,
      status
        ? eq(licensesTable.status, status as "trial" | "active" | "expired" | "suspended")
        : undefined
    );

    const stores = await db
      .select({ store: storesTable, license: licensesTable })
      .from(storesTable)
      .leftJoin(licensesTable, eq(licensesTable.storeId, storesTable.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(storesTable.createdAt));

    const [{ total }] = await db
      .select({ total: count() })
      .from(storesTable)
      .leftJoin(licensesTable, eq(licensesTable.storeId, storesTable.id))
      .where(whereClause);

    const data = stores.map(({ store, license }) => ({ ...store, license: license ?? null }));

    res.json({ data, total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) });
  } catch (err) {
    req.log.error({ err }, "Admin get all stores error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/stores/:storeId", requireSuperAdmin, async (req, res) => {
  const { storeId } = req.params;
  try {
    const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
    if (!store) { res.status(404).json({ error: "Tienda no encontrada" }); return; }
    const [license] = await db.select().from(licensesTable).where(eq(licensesTable.storeId, storeId)).limit(1);
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
    ownerName: z.string().optional(),
    address: z.string().optional(),
    district: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    documentNumber: z.string().optional(),
    isActive: z.boolean().optional(),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: "Datos inválidos" }); return; }

  try {
    const [updated] = await db
      .update(storesTable)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(storesTable.id, storeId))
      .returning();
    if (!updated) { res.status(404).json({ error: "Tienda no encontrada" }); return; }

    await recordAudit(
      req.user?.id ?? null,
      req.user?.email ?? null,
      req.user?.role ?? null,
      "store.update",
      "store",
      storeId,
      updated.businessName,
      result.data as Record<string, unknown>,
      req.ip ?? null
    );

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
    plan: z.enum(["trial", "monthly", "quarterly", "semi_annual", "annual", "free"]).optional(),
    startsAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    notes: z.string().optional(),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: "Datos inválidos" }); return; }
  const data = result.data;

  try {
    const [existing] = await db
      .select()
      .from(licensesTable)
      .where(eq(licensesTable.storeId, storeId))
      .limit(1);

    let license;
    if (existing) {
      await db.insert(licenseHistoryTable).values({
        storeId,
        licenseId: existing.id,
        actorId: req.user?.id ?? null,
        actorEmail: req.user?.email ?? null,
        prevStatus: existing.status,
        newStatus: data.status,
        prevPlan: existing.plan,
        newPlan: data.plan ?? null,
        prevExpiresAt: existing.expiresAt ?? null,
        newExpiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        notes: data.notes ?? null,
      });

      const [updated] = await db
        .update(licensesTable)
        .set({
          status: data.status,
          plan: data.plan,
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
          plan: data.plan ?? "trial",
          startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
          notes: data.notes,
        })
        .returning();
      license = created;
    }

    await recordAudit(
      req.user?.id ?? null,
      req.user?.email ?? null,
      req.user?.role ?? null,
      "license.update",
      "store",
      storeId,
      null,
      { status: data.status, plan: data.plan } as Record<string, unknown>,
      req.ip ?? null
    );

    res.json(license);
  } catch (err) {
    req.log.error({ err }, "Admin update license error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/stores/:storeId/license-history", requireSuperAdmin, async (req, res) => {
  const { storeId } = req.params;
  try {
    const history = await db
      .select()
      .from(licenseHistoryTable)
      .where(eq(licenseHistoryTable.storeId, storeId))
      .orderBy(desc(licenseHistoryTable.createdAt));
    res.json(history);
  } catch (err) {
    req.log.error({ err }, "Admin license history error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/stores/:storeId/users", requireSuperAdmin, async (req, res) => {
  const { storeId } = req.params;
  try {
    const users = await db
      .select({
        id: usersTable.id,
        storeId: usersTable.storeId,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.storeId, storeId))
      .orderBy(asc(usersTable.createdAt));
    res.json(users);
  } catch (err) {
    req.log.error({ err }, "Admin get store users error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/stores/:storeId/users/:userId", requireSuperAdmin, async (req, res) => {
  const { storeId, userId } = req.params;
  const schema = z.object({
    isActive: z.boolean().optional(),
    role: z.enum(["store_admin", "store_staff", "cashier"]).optional(),
    resetPassword: z.string().min(8).optional(),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: "Datos inválidos" }); return; }

  try {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (result.data.isActive !== undefined) updateData.isActive = result.data.isActive;
    if (result.data.role) updateData.role = result.data.role;
    if (result.data.resetPassword) {
      updateData.passwordHash = hashPassword(result.data.resetPassword);
    }

    const [updated] = await db
      .update(usersTable)
      .set(updateData as typeof usersTable.$inferInsert)
      .where(and(eq(usersTable.id, userId), eq(usersTable.storeId, storeId)))
      .returning({
        id: usersTable.id,
        storeId: usersTable.storeId,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
      });

    if (!updated) { res.status(404).json({ error: "Usuario no encontrado" }); return; }

    await recordAudit(
      req.user?.id ?? null,
      req.user?.email ?? null,
      req.user?.role ?? null,
      "user.update",
      "user",
      userId,
      updated.email,
      { isActive: result.data.isActive, role: result.data.role, passwordReset: !!result.data.resetPassword } as Record<string, unknown>,
      req.ip ?? null
    );

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Admin update store user error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/stats", requireSuperAdmin, async (req, res) => {
  try {
    const [totalResult] = await db.select({ total: count() }).from(storesTable);

    const licenseStats = await db
      .select({ status: licensesTable.status, count: count() })
      .from(licensesTable)
      .groupBy(licensesTable.status);

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [newThisMonthResult] = await db
      .select({ count: count() })
      .from(storesTable)
      .where(sql`${storesTable.createdAt} >= ${firstOfMonth}`);

    const [salesStats] = await db
      .select({
        totalAmount: sql<string>`COALESCE(SUM(CAST(${salesTable.total} AS NUMERIC)), 0)`,
        totalCount: count(),
      })
      .from(salesTable)
      .where(eq(salesTable.status, "paid"));

    const monthlyRows = await db
      .select({
        month: sql<string>`TO_CHAR(${storesTable.createdAt}, 'YYYY-MM')`,
        stores: count(),
      })
      .from(storesTable)
      .where(sql`${storesTable.createdAt} >= NOW() - INTERVAL '12 months'`)
      .groupBy(sql`TO_CHAR(${storesTable.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${storesTable.createdAt}, 'YYYY-MM')`);

    const statsByStatus: Record<string, number> = {};
    for (const row of licenseStats) statsByStatus[row.status] = Number(row.count);

    res.json({
      totalStores: Number(totalResult.total),
      activeStores: statsByStatus["active"] ?? 0,
      trialStores: statsByStatus["trial"] ?? 0,
      expiredStores: statsByStatus["expired"] ?? 0,
      suspendedStores: statsByStatus["suspended"] ?? 0,
      newThisMonth: Number(newThisMonthResult.count),
      totalSalesAmount: Number(salesStats.totalAmount),
      totalSalesCount: Number(salesStats.totalCount),
      monthlyGrowth: monthlyRows.map((r) => ({ month: r.month, stores: Number(r.stores) })),
    });
  } catch (err) {
    req.log.error({ err }, "Admin stats error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/audit-logs", requireSuperAdmin, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const targetType = req.query.targetType as string | undefined;
  const targetId = req.query.targetId as string | undefined;
  const actorId = req.query.actorId as string | undefined;

  try {
    const where = and(
      targetType ? eq(auditLogsTable.targetType, targetType) : undefined,
      targetId ? eq(auditLogsTable.targetId, targetId) : undefined,
      actorId ? eq(auditLogsTable.actorId, actorId) : undefined
    );

    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(where)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db.select({ total: count() }).from(auditLogsTable).where(where);

    res.json({
      data: logs,
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Admin audit logs error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/announcements", requireSuperAdmin, async (req, res) => {
  try {
    const items = await db
      .select()
      .from(announcementsTable)
      .orderBy(desc(announcementsTable.createdAt));
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Admin get announcements error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/announcements", requireSuperAdmin, async (req, res) => {
  const schema = z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    type: z.enum(["info", "warning", "success", "maintenance"]).optional(),
    isActive: z.boolean().optional(),
    expiresAt: z.string().datetime().optional(),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: "Datos inválidos" }); return; }

  try {
    const [item] = await db
      .insert(announcementsTable)
      .values({
        title: result.data.title,
        body: result.data.body,
        type: result.data.type ?? "info",
        isActive: result.data.isActive ?? true,
        expiresAt: result.data.expiresAt ? new Date(result.data.expiresAt) : undefined,
      })
      .returning();

    await recordAudit(
      req.user?.id ?? null,
      req.user?.email ?? null,
      req.user?.role ?? null,
      "announcement.create",
      "announcement",
      item.id,
      item.title,
      null,
      req.ip ?? null
    );

    res.status(201).json(item);
  } catch (err) {
    req.log.error({ err }, "Admin create announcement error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/announcements/:announcementId", requireSuperAdmin, async (req, res) => {
  const { announcementId } = req.params;
  const schema = z.object({
    title: z.string().min(1).optional(),
    body: z.string().min(1).optional(),
    type: z.enum(["info", "warning", "success", "maintenance"]).optional(),
    isActive: z.boolean().optional(),
    expiresAt: z.string().datetime().nullish(),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: "Datos inválidos" }); return; }

  try {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (result.data.title !== undefined) updateData.title = result.data.title;
    if (result.data.body !== undefined) updateData.body = result.data.body;
    if (result.data.type !== undefined) updateData.type = result.data.type;
    if (result.data.isActive !== undefined) updateData.isActive = result.data.isActive;
    if (result.data.expiresAt !== undefined) {
      updateData.expiresAt = result.data.expiresAt ? new Date(result.data.expiresAt) : null;
    }

    const [updated] = await db
      .update(announcementsTable)
      .set(updateData as typeof announcementsTable.$inferInsert)
      .where(eq(announcementsTable.id, announcementId))
      .returning();

    if (!updated) { res.status(404).json({ error: "Anuncio no encontrado" }); return; }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Admin update announcement error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.delete("/announcements/:announcementId", requireSuperAdmin, async (req, res) => {
  const { announcementId } = req.params;
  try {
    await db.delete(announcementsTable).where(eq(announcementsTable.id, announcementId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Admin delete announcement error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/support-tickets", requireSuperAdmin, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const statusFilter = req.query.status as string | undefined;
  const priorityFilter = req.query.priority as string | undefined;

  try {
    const where = and(
      statusFilter ? eq(supportTicketsTable.status, statusFilter as "open" | "in_progress" | "resolved" | "closed") : undefined,
      priorityFilter ? eq(supportTicketsTable.priority, priorityFilter as "low" | "medium" | "high" | "urgent") : undefined
    );

    const tickets = await db
      .select()
      .from(supportTicketsTable)
      .where(where)
      .orderBy(desc(supportTicketsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db.select({ total: count() }).from(supportTicketsTable).where(where);

    res.json({ data: tickets, total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) });
  } catch (err) {
    req.log.error({ err }, "Admin get support tickets error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/support-tickets/:ticketId", requireSuperAdmin, async (req, res) => {
  const { ticketId } = req.params;
  try {
    const [ticket] = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.id, ticketId))
      .limit(1);
    if (!ticket) { res.status(404).json({ error: "Ticket no encontrado" }); return; }
    res.json(ticket);
  } catch (err) {
    req.log.error({ err }, "Admin get ticket error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/support-tickets/:ticketId", requireSuperAdmin, async (req, res) => {
  const { ticketId } = req.params;
  const schema = z.object({
    status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    assignedTo: z.string().optional(),
    response: z.string().optional(),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: "Datos inválidos" }); return; }

  try {
    const [existing] = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.id, ticketId))
      .limit(1);
    if (!existing) { res.status(404).json({ error: "Ticket no encontrado" }); return; }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (result.data.status) {
      updateData.status = result.data.status;
      if (result.data.status === "resolved" || result.data.status === "closed") {
        updateData.resolvedAt = new Date();
      }
    }
    if (result.data.priority) updateData.priority = result.data.priority;
    if (result.data.assignedTo !== undefined) updateData.assignedTo = result.data.assignedTo;
    if (result.data.response) {
      const prevResponses = (existing.responses as { author: string; body: string; createdAt: string }[]) ?? [];
      updateData.responses = [
        ...prevResponses,
        {
          author: req.user?.email ?? "admin",
          body: result.data.response,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    const [updated] = await db
      .update(supportTicketsTable)
      .set(updateData as typeof supportTicketsTable.$inferInsert)
      .where(eq(supportTicketsTable.id, ticketId))
      .returning();

    await recordAudit(
      req.user?.id ?? null,
      req.user?.email ?? null,
      req.user?.role ?? null,
      "ticket.update",
      "support_ticket",
      ticketId,
      existing.subject,
      { status: result.data.status } as Record<string, unknown>,
      req.ip ?? null
    );

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Admin update ticket error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/analytics", requireSuperAdmin, async (req, res) => {
  try {
    const businessTypeRows = await db
      .select({
        businessType: storesTable.businessType,
        count: count(),
      })
      .from(storesTable)
      .groupBy(storesTable.businessType)
      .orderBy(desc(count()));

    const districtRows = await db
      .select({
        district: storesTable.district,
        count: count(),
      })
      .from(storesTable)
      .groupBy(storesTable.district)
      .orderBy(desc(count()))
      .limit(15);

    const licenseStatusRows = await db
      .select({
        status: licensesTable.status,
        count: count(),
      })
      .from(licensesTable)
      .groupBy(licensesTable.status);

    const licensePlanRows = await db
      .select({
        plan: licensesTable.plan,
        count: count(),
      })
      .from(licensesTable)
      .groupBy(licensesTable.plan);

    const monthlyGrowth = await db
      .select({
        month: sql<string>`TO_CHAR(${storesTable.createdAt}, 'YYYY-MM')`,
        stores: count(),
      })
      .from(storesTable)
      .where(sql`${storesTable.createdAt} >= NOW() - INTERVAL '12 months'`)
      .groupBy(sql`TO_CHAR(${storesTable.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${storesTable.createdAt}, 'YYYY-MM')`);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [newRecent] = await db
      .select({ count: count() })
      .from(storesTable)
      .where(gte(storesTable.createdAt, thirtyDaysAgo));

    const [totalSales] = await db
      .select({
        totalAmount: sql<number>`COALESCE(SUM(CAST(${salesTable.total} AS NUMERIC)), 0)::float`,
        totalCount: count(),
      })
      .from(salesTable)
      .where(eq(salesTable.status, "paid"));

    // Sales by store per month (top 5 stores by revenue)
    const topStoresByRevenue = await db
      .select({
        storeId: salesTable.storeId,
        revenue: sql<number>`COALESCE(SUM(CAST(${salesTable.total} AS NUMERIC)), 0)::float`,
        ordersCount: count(),
      })
      .from(salesTable)
      .where(and(eq(salesTable.status, "paid"), gte(salesTable.createdAt, thirtyDaysAgo)))
      .groupBy(salesTable.storeId)
      .orderBy(sql`SUM(CAST(${salesTable.total} AS NUMERIC)) DESC`)
      .limit(5);

    // Get store names for top stores
    const topStoreIds = topStoresByRevenue.map((r) => r.storeId);
    const storeNames = topStoreIds.length > 0
      ? await db
          .select({ id: storesTable.id, name: storesTable.businessName })
          .from(storesTable)
          .where(inArray(storesTable.id, topStoreIds))
      : [];
    const storeNameMap = new Map(storeNames.map((s) => [s.id, s.name]));

    res.json({
      byBusinessType: businessTypeRows.map((r) => ({ businessType: r.businessType, count: r.count })),
      byDistrict: districtRows.map((r) => ({ district: r.district || "Sin distrito", count: r.count })),
      licenseStatus: licenseStatusRows.map((r) => ({ status: r.status, count: r.count })),
      licensePlan: licensePlanRows.map((r) => ({ plan: r.plan, count: r.count })),
      monthlyGrowth: monthlyGrowth.map((r) => ({ month: r.month, stores: r.stores })),
      newStores30days: newRecent.count,
      totalSalesAmount: totalSales.totalAmount,
      totalSalesCount: totalSales.totalCount,
      topStores: topStoresByRevenue.map((r) => ({
        storeId: r.storeId,
        storeName: storeNameMap.get(r.storeId) ?? r.storeId,
        revenue: r.revenue,
        ordersCount: r.ordersCount,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Admin analytics error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── License Codes ────────────────────────────────────────────────────────────

router.get("/license-codes", requireSuperAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;
    const used = req.query.used as string | undefined;

    const conditions: ReturnType<typeof and>[] = [];
    if (used === "true")  conditions.push(sql`${licenseCodesTable.usedCount} >= ${licenseCodesTable.maxUses}`);
    if (used === "false") conditions.push(sql`${licenseCodesTable.usedCount} < ${licenseCodesTable.maxUses}`);

    const where = conditions.length ? and(...(conditions as [ReturnType<typeof and>])) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(licenseCodesTable)
      .where(where);

    const rows = await db
      .select()
      .from(licenseCodesTable)
      .where(where)
      .orderBy(desc(licenseCodesTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data: rows, total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) });
  } catch (err) {
    req.log.error({ err }, "list license-codes error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/license-codes", requireSuperAdmin, async (req, res) => {
  const schema = z.object({
    plan: z.enum(["trial", "monthly", "quarterly", "semi_annual", "annual", "free"]),
    durationDays: z.number().int().min(1),
    maxUses: z.number().int().min(1).default(1),
    notes: z.string().optional(),
    expiresAt: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });
    return;
  }

  const { plan, durationDays, maxUses, notes, expiresAt } = parsed.data;

  const year = new Date().getFullYear();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const code = `CAMILA-${year}-${suffix}`;

  const user = req.user!;

  try {
    const [created] = await db.insert(licenseCodesTable).values({
      id: crypto.randomUUID(),
      code,
      plan,
      durationDays,
      maxUses,
      notes: notes ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdByAdminId: user.id,
    }).returning();

    try {
      await db.insert(auditLogsTable).values({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "license_code_created",
        targetType: "license_code",
        targetId: created.id,
        targetLabel: code,
        details: { plan, durationDays, maxUses },
        ipAddress: req.ip ?? null,
      });
    } catch (_) {}

    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Código duplicado, intenta de nuevo" });
      return;
    }
    req.log.error({ err }, "create license-code error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.delete("/license-codes/:id", requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [code] = await db.select().from(licenseCodesTable).where(eq(licenseCodesTable.id, id)).limit(1);
    if (!code) {
      res.status(404).json({ error: "Código no encontrado" });
      return;
    }
    if (code.usedCount > 0) {
      res.status(409).json({ error: "No se puede eliminar un código ya utilizado" });
      return;
    }
    await db.delete(licenseCodesTable).where(eq(licenseCodesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "delete license-code error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── Notify expiring licenses ─────────────────────────────────────────────────
router.post("/notify-expiring", requireSuperAdmin, async (req, res) => {
  try {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiring = await db
      .select({
        storeId: licensesTable.storeId,
        expiresAt: licensesTable.expiresAt,
        businessName: storesTable.businessName,
        email: storesTable.email,
      })
      .from(licensesTable)
      .innerJoin(storesTable, eq(storesTable.id, licensesTable.storeId))
      .where(
        and(
          gte(licensesTable.expiresAt, now),
          sql`${licensesTable.expiresAt} <= ${in3Days}`,
          or(
            eq(licensesTable.status, "trial"),
            eq(licensesTable.status, "active"),
          ),
        ),
      );

    let sent = 0;
    for (const row of expiring) {
      await sendLicenseExpiringEmail(row.email, row.businessName, row.expiresAt);
      sent++;
    }

    res.json({ success: true, notified: sent, stores: expiring.map((r) => r.businessName) });
  } catch (err) {
    req.log.error({ err }, "notify-expiring error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
