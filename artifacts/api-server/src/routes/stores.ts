import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  storesTable,
  usersTable,
  licensesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireStoreAdmin } from "../middlewares/session";
import { hashPassword } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res) => {
  const user = req.user!;

  if (!user.storeId) {
    res.status(404).json({ error: "No perteneces a ninguna tienda" });
    return;
  }

  try {
    const [store] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.id, user.storeId))
      .limit(1);

    if (!store) {
      res.status(404).json({ error: "Tienda no encontrada" });
      return;
    }

    const [license] = await db
      .select()
      .from(licensesTable)
      .where(eq(licensesTable.storeId, store.id))
      .limit(1);

    res.json({ ...store, license: license ?? null });
  } catch (err) {
    req.log.error({ err }, "Get my store error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/me", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;

  if (!user.storeId) {
    res.status(404).json({ error: "No perteneces a ninguna tienda" });
    return;
  }

  const schema = z.object({
    businessName: z.string().min(2).optional(),
    address: z.string().optional(),
    district: z.string().min(2).optional(),
    phone: z.string().min(9).optional(),
    logoUrl: z.string().url().optional().nullable(),
    bannerUrl: z.string().url().optional().nullable(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    description: z.string().optional(),
    whatsapp: z.string().optional(),
    socialInstagram: z.string().optional(),
    socialFacebook: z.string().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  try {
    const [updated] = await db
      .update(storesTable)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(storesTable.id, user.storeId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Update store error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/me/users", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;

  if (!user.storeId) {
    res.status(404).json({ error: "No perteneces a ninguna tienda" });
    return;
  }

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
      .where(eq(usersTable.storeId, user.storeId));

    res.json(users);
  } catch (err) {
    req.log.error({ err }, "Get store users error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/me/users", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;

  if (!user.storeId) {
    res.status(404).json({ error: "No perteneces a ninguna tienda" });
    return;
  }

  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["store_admin", "store_staff", "cashier"]),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  const data = result.data;

  try {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, data.email))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Ya existe un usuario con este correo" });
      return;
    }

    const passwordHash = hashPassword(data.password);
    const [newUser] = await db.insert(usersTable).values({
      storeId: user.storeId,
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    }).returning({
      id: usersTable.id,
      storeId: usersTable.storeId,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
    });

    res.status(201).json(newUser);
  } catch (err) {
    req.log.error({ err }, "Add store user error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.delete("/me/users/:userId", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  const { userId } = req.params;

  if (userId === user.id) {
    res.status(400).json({ error: "No puedes eliminar tu propia cuenta" });
    return;
  }

  try {
    const [target] = await db
      .select({ storeId: usersTable.storeId })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!target || target.storeId !== user.storeId) {
      res.status(404).json({ error: "Usuario no encontrado en tu tienda" });
      return;
    }

    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.json({ success: true, message: "Usuario eliminado" });
  } catch (err) {
    req.log.error({ err }, "Remove store user error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
