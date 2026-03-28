import { Router } from "express";
import { z } from "zod";
import { eq, sql, and, lt } from "drizzle-orm";
import { db, licensesTable, licenseHistoryTable, auditLogsTable, licenseCodesTable } from "@workspace/db";
import { requireAuth, requireStoreAdmin } from "../middlewares/session";
import crypto from "crypto";

const router = Router();

// ─── Plan config ─────────────────────────────────────────────────────────────

const PLANS = {
  monthly:     { id: "monthly",     name: "Mensual",    amount: 4900,  days: 30,  savings: null,  popular: false, description: "Acceso por 30 días" },
  quarterly:   { id: "quarterly",   name: "Trimestral", amount: 12900, days: 90,  savings: 12,    popular: false, description: "Acceso por 90 días" },
  semi_annual: { id: "semi_annual", name: "Semestral",  amount: 22900, days: 180, savings: 22,    popular: false, description: "Acceso por 180 días" },
  annual:      { id: "annual",      name: "Anual",      amount: 39900, days: 365, savings: 32,    popular: true,  description: "Acceso por 365 días" },
} as const;

type PlanKey = keyof typeof PLANS;

// ─── Custom error for transactional redeem logic ──────────────────────────────

class RedeemError extends Error {
  constructor(public readonly httpStatus: number, message: string) {
    super(message);
    this.name = "RedeemError";
  }
}

// ─── GET /api/payments/plans — public ────────────────────────────────────────

router.get("/plans", (_req, res) => {
  res.json(Object.values(PLANS));
});

// ─── POST /api/payments/webhook — Culqi webhook (no auth, raw body) ───────────

router.post("/webhook", async (req, res) => {
  res.status(200).json({ received: true });

  try {
    const webhookSecret = process.env.CULQI_WEBHOOK_SECRET;
    if (!webhookSecret) {
      req.log.error("CULQI_WEBHOOK_SECRET not configured");
      return;
    }

    const signature = req.headers["culqi-signature"] as string | undefined;
    const rawBody = req.body as Buffer;

    if (!signature || !Buffer.isBuffer(rawBody)) {
      req.log.warn("Culqi webhook: missing signature or raw body");
      return;
    }

    const hmac = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (hmac !== signature) {
      req.log.warn("Culqi webhook: invalid signature");
      return;
    }

    const payload = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    const eventType = payload["type"] as string | undefined;

    req.log.info({ eventType }, "Culqi webhook received");

    if (eventType === "charge.succeeded") {
      const data = payload["data"] as Record<string, unknown> | undefined;
      const chargeId = data?.["id"] as string | undefined;
      req.log.info({ chargeId }, "Culqi charge.succeeded — payment confirmed via webhook");
    } else if (eventType === "charge.failed") {
      const data = payload["data"] as Record<string, unknown> | undefined;
      const chargeId = data?.["id"] as string | undefined;
      const amount = data?.["amount"] as number | undefined;
      req.log.warn({ chargeId, amount }, "Culqi charge.failed");
    } else {
      req.log.info({ eventType }, "Culqi webhook: unhandled event type");
    }
  } catch (err) {
    req.log.error({ err }, "Culqi webhook processing error");
  }
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

  const now = new Date();
  let redeemResult: { license: typeof licensesTable.$inferSelect; durationDays: number } | null = null;

  try {
    redeemResult = await db.transaction(async (tx) => {
      // ── 1. Fetch and validate license code inside transaction ──────────────
      const [licenseCode] = await tx
        .select()
        .from(licenseCodesTable)
        .where(eq(licenseCodesTable.code, code))
        .limit(1);

      if (!licenseCode) {
        throw new RedeemError(404, "Código inválido o no encontrado");
      }

      if (licenseCode.expiresAt && licenseCode.expiresAt < now) {
        throw new RedeemError(410, "Este código ha vencido");
      }

      if (licenseCode.usedByStoreId === storeId) {
        throw new RedeemError(409, "Tu tienda ya canjeó este código");
      }

      // ── 2. Atomic increment — only if used_count < max_uses ───────────────
      const updatedCodes = await tx
        .update(licenseCodesTable)
        .set({
          usedCount: sql`used_count + 1`,
          usedByStoreId: storeId,
          usedAt: now,
        })
        .where(
          and(
            eq(licenseCodesTable.id, licenseCode.id),
            lt(licenseCodesTable.usedCount, licenseCodesTable.maxUses),
          ),
        )
        .returning({ id: licenseCodesTable.id });

      if (updatedCodes.length === 0) {
        throw new RedeemError(409, "Código ya no disponible");
      }

      // ── 3. Fetch current license ───────────────────────────────────────────
      const [existing] = await tx
        .select()
        .from(licensesTable)
        .where(eq(licensesTable.storeId, storeId))
        .limit(1);

      // Extend from current expiry if still active, otherwise from today
      const baseDate = existing?.expiresAt && existing.expiresAt > now ? existing.expiresAt : now;
      const newExpiresAt = new Date(baseDate);
      newExpiresAt.setDate(newExpiresAt.getDate() + licenseCode.durationDays);

      let license: typeof licensesTable.$inferSelect;

      if (existing) {
        await tx.insert(licenseHistoryTable).values({
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

        const [updated] = await tx
          .update(licensesTable)
          .set({ status: "active", plan: licenseCode.plan, expiresAt: newExpiresAt, updatedAt: now })
          .where(eq(licensesTable.storeId, storeId))
          .returning();
        license = updated;
      } else {
        const [created] = await tx
          .insert(licensesTable)
          .values({ storeId, status: "active", plan: licenseCode.plan, startsAt: now, expiresAt: newExpiresAt })
          .returning();
        license = created;
      }

      return { license, durationDays: licenseCode.durationDays };
    });

    // ── 4. Audit log (outside transaction, best-effort) ───────────────────────
    try {
      await db.insert(auditLogsTable).values({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "code_redeemed",
        targetType: "store",
        targetId: storeId,
        targetLabel: code,
        details: { code, durationDays: redeemResult!.durationDays },
        ipAddress: req.ip ?? null,
      });
    } catch (_) {}

    res.json({
      success: true,
      license: redeemResult!.license,
      message: `Licencia activada por ${redeemResult!.durationDays} días`,
    });
  } catch (err) {
    if (err instanceof RedeemError) {
      res.status(err.httpStatus).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "redeem-code error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
