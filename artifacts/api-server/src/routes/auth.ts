import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  storesTable,
  usersTable,
  licensesTable,
  sessionsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken, generateResetToken } from "../lib/auth";
import { generateUniqueSlug } from "../lib/slug";
import { requireAuth, sessionMiddleware } from "../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const registerSchema = z.object({
  businessName: z.string().min(2),
  businessType: z.enum(["clothing", "restaurant", "bakery", "fair_booth", "general_catalog"]),
  documentType: z.enum(["DNI", "RUC10", "RUC20"]),
  documentNumber: z.string().min(8).max(11),
  ownerName: z.string().min(2),
  phone: z.string().min(9),
  email: z.string().email(),
  password: z.string().min(8),
  address: z.string().optional(),
  district: z.string().min(2),
  logoUrl: z.string().url().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/register", async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  const data = result.data;

  try {
    const [existingStore] = await db
      .select({ id: storesTable.id })
      .from(storesTable)
      .where(eq(storesTable.email, data.email))
      .limit(1);

    if (existingStore) {
      res.status(409).json({ error: "Ya existe una tienda con este correo" });
      return;
    }

    const [existingUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, data.email))
      .limit(1);

    if (existingUser) {
      res.status(409).json({ error: "Ya existe una cuenta con este correo" });
      return;
    }

    const storeId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const licenseId = crypto.randomUUID();

    const slug = await generateUniqueSlug(data.businessName);

    const [store] = await db.insert(storesTable).values({
      id: storeId,
      slug,
      businessName: data.businessName,
      businessType: data.businessType,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      ownerName: data.ownerName,
      phone: data.phone,
      email: data.email,
      address: data.address,
      district: data.district,
      logoUrl: data.logoUrl,
    }).returning();

    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 30);

    const [license] = await db.insert(licensesTable).values({
      id: licenseId,
      storeId: storeId,
      status: "trial",
      startsAt: new Date(),
      expiresAt: trialExpiry,
      notes: "Período de prueba de 30 días",
    }).returning();

    const passwordHash = hashPassword(data.password);
    const [user] = await db.insert(usersTable).values({
      id: userId,
      storeId: storeId,
      name: data.ownerName,
      email: data.email,
      passwordHash,
      role: "store_admin",
    }).returning();

    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await db.insert(sessionsTable).values({
      userId: user.id,
      token,
      expiresAt,
    });

    res.cookie("camila_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
    });

    res.status(201).json({
      user: {
        id: user.id,
        storeId: user.storeId,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      store: {
        ...store,
        license: {
          id: license.id,
          storeId: license.storeId,
          status: license.status,
          startsAt: license.startsAt,
          expiresAt: license.expiresAt,
          notes: license.notes,
          updatedAt: license.updatedAt,
        },
      },
      token,
    });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const { email, password } = result.data;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "Correo o contraseña incorrectos" });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ error: "Tu cuenta está desactivada" });
      return;
    }

    let store: typeof storesTable.$inferSelect | null = null;
    let license: typeof licensesTable.$inferSelect | null = null;

    if (user.storeId) {
      const [s] = await db
        .select()
        .from(storesTable)
        .where(eq(storesTable.id, user.storeId))
        .limit(1);
      store = s ?? null;

      if (store) {
        const [l] = await db
          .select()
          .from(licensesTable)
          .where(eq(licensesTable.storeId, store.id))
          .limit(1);
        license = l ?? null;
      }
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await db.insert(sessionsTable).values({
      userId: user.id,
      token,
      expiresAt,
    });

    res.cookie("camila_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
    });

    res.json({
      user: {
        id: user.id,
        storeId: user.storeId,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      store: store
        ? { ...store, license }
        : null,
      token,
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  const token = req.cookies?.camila_session;
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.clearCookie("camila_session");
  res.json({ success: true, message: "Sesión cerrada" });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = req.user!;
  try {
    let store: typeof storesTable.$inferSelect | null = null;
    let license: typeof licensesTable.$inferSelect | null = null;

    if (user.storeId) {
      const [s] = await db
        .select()
        .from(storesTable)
        .where(eq(storesTable.id, user.storeId))
        .limit(1);
      store = s ?? null;

      if (store) {
        const [l] = await db
          .select()
          .from(licensesTable)
          .where(eq(licensesTable.storeId, store.id))
          .limit(1);
        license = l ?? null;
      }
    }

    res.json({
      user: {
        id: user.id,
        storeId: user.storeId,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: new Date(),
      },
      store: store ? { ...store, license } : null,
      license,
    });
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const schema = z.object({ email: z.string().email() });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Correo inválido" });
    return;
  }

  const { email } = result.data;
  try {
    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (user) {
      const resetToken = generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db
        .update(usersTable)
        .set({
          resetToken,
          resetTokenExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, user.id));

      req.log.info({ email, resetToken }, "Password reset token generated");
    }

    res.json({ success: true, message: "Si el correo existe, recibirás instrucciones." });
  } catch (err) {
    req.log.error({ err }, "Forgot password error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/reset-password", async (req, res) => {
  const schema = z.object({
    token: z.string(),
    password: z.string().min(8),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const { token, password } = result.data;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.resetToken, token))
      .limit(1);

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      res.status(400).json({ error: "Token inválido o expirado" });
      return;
    }

    const passwordHash = hashPassword(password);
    await db
      .update(usersTable)
      .set({
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id));

    await db.delete(sessionsTable).where(eq(sessionsTable.userId, user.id));

    res.json({ success: true, message: "Contraseña actualizada exitosamente" });
  } catch (err) {
    req.log.error({ err }, "Reset password error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
