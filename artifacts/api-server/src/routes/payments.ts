import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, licensesTable, licenseHistoryTable, auditLogsTable, licenseCodesTable } from "@workspace/db";
import { requireAuth, requireStoreAdmin } from "../middlewares/session";

const router = Router();

// ─── Plan config ─────────────────────────────────────────────────────────────

const PLANS = {
  monthly:     { id: "monthly",     name: "Mensual",    amount: 4900,  days: 30,  savings: null,  popular: false, description: "Acceso por 30 días" },
  quarterly:   { id: "quarterly",   name: "Trimestral", amount: 12900, days: 90,  savings: 12,    popular: false, description: "Acceso por 90 días" },
  semi_annual: { id: "semi_annual", name: "Semestral",  amount: 22900, days: 180, savings: 22,    popular: false, description: "Acceso por 180 días" },
  annual:      { id: "annual",      name: "Anual",      amount: 39900, days: 365, savings: 32,    popular: true,  description: "Acceso por 365 días" },
} as const;

type PlanKey = keyof typeof PLANS;

// ─── GET /api/payments/plans — public ────────────────────────────────────────

router.get("/plans", (_req, res) => {
  res.json(Object.values(PLANS));
});

// ─── POST /api/payments/create-charge ────────────────────────────────────────

router.post("/create-charge", requireAuth, requireStoreAdmin, async (req, res) => {
  const schema = z.object({
    token: z.string().min(1),
    plan: z.enum(["monthly", "quarterly", "semi_annual", "annual"]),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const { token, plan } = parsed.data;
  const user = req.user!;
  const storeId = user.storeId;

  if (!storeId) {
    res.status(400).json({ error: "Usuario sin tienda asociada" });
    return;
  }

  const secretKey = process.env.CULQI_SECRET_KEY;
  if (!secretKey) {
    res.status(503).json({ error: "Pasarela de pagos no configurada" });
    return;
  }

  const planConfig = PLANS[plan as PlanKey];

  try {
    // ── 1. Charge via Culqi API ──────────────────────────────────────────────
    const culqiRes = await fetch("https://api.culqi.com/v2/charges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: planConfig.amount,
        currency_code: "PEN",
        email: user.email,
        source_id: token,
        description: `Camila - Plan ${planConfig.name}`,
        capture: true,
      }),
    });

    const charge = (await culqiRes.json()) as Record<string, unknown>;

    if (!culqiRes.ok || charge["object"] === "error") {
      const msg =
        (charge["user_message"] as string) ||
        (charge["merchant_message"] as string) ||
        "Error al procesar el pago";
      res.status(402).json({ error: msg });
      return;
    }

    // ── 2. Update license ────────────────────────────────────────────────────
    const [existing] = await db
      .select()
      .from(licensesTable)
      .where(eq(licensesTable.storeId, storeId))
      .limit(1);

    const now = new Date();
    const newExpiresAt = new Date(now);
    newExpiresAt.setDate(newExpiresAt.getDate() + planConfig.days);

    let license;

    if (existing) {
      await db.insert(licenseHistoryTable).values({
        storeId,
        licenseId: existing.id,
        actorId: user.id,
        actorEmail: user.email,
        prevStatus: existing.status,
        newStatus: "active",
        prevPlan: existing.plan,
        newPlan: plan,
        prevExpiresAt: existing.expiresAt ?? null,
        newExpiresAt,
        notes: `Pago via Culqi · Cargo: ${charge["id"] ?? "n/a"}`,
      });

      const [updated] = await db
        .update(licensesTable)
        .set({ status: "active", plan, startsAt: now, expiresAt: newExpiresAt, updatedAt: now })
        .where(eq(licensesTable.storeId, storeId))
        .returning();
      license = updated;
    } else {
      const [created] = await db
        .insert(licensesTable)
        .values({ storeId, status: "active", plan, startsAt: now, expiresAt: newExpiresAt })
        .returning();
      license = created;
    }

    // ── 3. Audit log ─────────────────────────────────────────────────────────
    try {
      await db.insert(auditLogsTable).values({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "payment_success",
        targetType: "store",
        targetId: storeId,
        targetLabel: `Plan ${planConfig.name}`,
        details: {
          plan,
          amount: planConfig.amount,
          chargeId: charge["id"],
        },
        ipAddress: req.ip ?? null,
      });
    } catch (_) {}

    res.json({ success: true, license });
  } catch (err) {
    req.log.error({ err }, "Payment create-charge error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── POST /api/payments/redeem-code ──────────────────────────────────────────

router.post("/redeem-code", requireAuth, requireStoreAdmin, async (req, res) => {
  const schema = z.object({ code: z.string().min(1).toUpperCase() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const { code } = parsed.data;
  const user = req.user!;
  const storeId = user.storeId;

  if (!storeId) {
    res.status(400).json({ error: "Usuario sin tienda asociada" });
    return;
  }

  try {
    const [licenseCode] = await db
      .select()
      .from(licenseCodesTable)
      .where(eq(licenseCodesTable.code, code))
      .limit(1);

    if (!licenseCode) {
      res.status(404).json({ error: "Código inválido o no encontrado" });
      return;
    }

    const now = new Date();

    if (licenseCode.expiresAt && licenseCode.expiresAt < now) {
      res.status(410).json({ error: "Este código ha vencido" });
      return;
    }

    if (licenseCode.usedCount >= licenseCode.maxUses) {
      res.status(410).json({ error: "Este código ya fue utilizado y no tiene más usos disponibles" });
      return;
    }

    if (licenseCode.usedByStoreId === storeId) {
      res.status(409).json({ error: "Tu tienda ya canjeó este código" });
      return;
    }

    // ── Fetch current license ────────────────────────────────────────────────
    const [existing] = await db
      .select()
      .from(licensesTable)
      .where(eq(licensesTable.storeId, storeId))
      .limit(1);

    // Calculate new expiresAt: extend from current expiry if still active, otherwise from today
    const baseDate = existing?.expiresAt && existing.expiresAt > now ? existing.expiresAt : now;
    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + licenseCode.durationDays);

    let license;

    if (existing) {
      await db.insert(licenseHistoryTable).values({
        storeId,
        licenseId: existing.id,
        actorId: user.id,
        actorEmail: user.email,
        prevStatus: existing.status,
        newStatus: "active",
        prevPlan: existing.plan,
        newPlan: licenseCode.plan,
        prevExpiresAt: existing.expiresAt ?? null,
        newExpiresAt,
        notes: `Código canjeado: ${code}`,
      });

      const [updated] = await db
        .update(licensesTable)
        .set({ status: "active", plan: licenseCode.plan, expiresAt: newExpiresAt, updatedAt: now })
        .where(eq(licensesTable.storeId, storeId))
        .returning();
      license = updated;
    } else {
      const [created] = await db
        .insert(licensesTable)
        .values({ storeId, status: "active", plan: licenseCode.plan, startsAt: now, expiresAt: newExpiresAt })
        .returning();
      license = created;
    }

    // ── Increment usedCount ──────────────────────────────────────────────────
    await db
      .update(licenseCodesTable)
      .set({
        usedCount: licenseCode.usedCount + 1,
        usedByStoreId: storeId,
        usedAt: now,
      })
      .where(eq(licenseCodesTable.id, licenseCode.id));

    // ── Audit log ────────────────────────────────────────────────────────────
    try {
      await db.insert(auditLogsTable).values({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "code_redeemed",
        targetType: "store",
        targetId: storeId,
        targetLabel: code,
        details: { code, plan: licenseCode.plan, durationDays: licenseCode.durationDays },
        ipAddress: req.ip ?? null,
      });
    } catch (_) {}

    res.json({
      success: true,
      license,
      message: `Licencia activada por ${licenseCode.durationDays} días`,
    });
  } catch (err) {
    req.log.error({ err }, "redeem-code error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
