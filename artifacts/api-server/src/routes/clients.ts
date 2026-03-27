import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { clientsTable } from "@workspace/db";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

const clientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

// GET /clients
router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const search = req.query.search as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || "20")));
  const offset = (page - 1) * limit;

  try {
    const conditions = [
      eq(clientsTable.storeId, user.storeId),
      search
        ? or(
            ilike(clientsTable.name, `%${search}%`),
            ilike(clientsTable.phone ?? "", `%${search}%`),
          )
        : undefined,
    ].filter(Boolean) as any[];

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clientsTable)
      .where(and(...conditions));

    const data = await db
      .select()
      .from(clientsTable)
      .where(and(...conditions))
      .orderBy(desc(clientsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener clientes" });
  }
});

// POST /clients
router.post("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  try {
    const [client] = await db.insert(clientsTable).values({
      storeId: user.storeId,
      ...parsed.data,
    }).returning();
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: "Error al crear cliente" });
  }
});

// PATCH /clients/:clientId
router.patch("/:clientId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const parsed = clientSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const { clientId } = req.params;

  const [existing] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.storeId, user.storeId)))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "Cliente no encontrado" }); return; }

  try {
    const [updated] = await db
      .update(clientsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(clientsTable.id, clientId))
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar cliente" });
  }
});

// DELETE /clients/:clientId
router.delete("/:clientId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const { clientId } = req.params;
  const [existing] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.storeId, user.storeId)))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "Cliente no encontrado" }); return; }

  try {
    await db.delete(clientsTable).where(eq(clientsTable.id, clientId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar cliente" });
  }
});

export default router;
