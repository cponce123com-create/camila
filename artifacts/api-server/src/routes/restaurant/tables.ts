import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  restaurantTablesTable,
  restaurantOrdersTable,
} from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

const tableSchema = z.object({
  name: z.string().min(1),
  zone: z.string().optional(),
  capacity: z.number().int().min(1).default(4),
  sortOrder: z.number().int().default(0),
  notes: z.string().optional(),
});

const updateTableSchema = tableSchema.partial().extend({
  status: z.enum(["free", "occupied", "to_pay", "closed"]).optional(),
  isActive: z.boolean().optional(),
});

// GET /restaurant/tables
router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const zone = req.query.zone as string | undefined;
  const status = req.query.status as string | undefined;
  const isActiveQ = req.query.isActive;
  const isActive = isActiveQ !== undefined ? isActiveQ === "true" : undefined;

  try {
    const tables = await db
      .select()
      .from(restaurantTablesTable)
      .where(and(
        eq(restaurantTablesTable.storeId, user.storeId),
        zone ? eq(restaurantTablesTable.zone, zone) : undefined,
        status ? eq(restaurantTablesTable.status, status as any) : undefined,
        isActive !== undefined ? eq(restaurantTablesTable.isActive, isActive) : undefined,
      ))
      .orderBy(asc(restaurantTablesTable.sortOrder), asc(restaurantTablesTable.name));

    // Attach active order IDs
    const openOrders = await db
      .select({ tableId: restaurantOrdersTable.tableId, id: restaurantOrdersTable.id })
      .from(restaurantOrdersTable)
      .where(and(
        eq(restaurantOrdersTable.storeId, user.storeId),
        eq(restaurantOrdersTable.status, "open"),
      ));

    const orderByTable = new Map(openOrders.map((o) => [o.tableId, o.id]));
    const result = tables.map((t) => ({
      ...t,
      activeOrderId: orderByTable.get(t.id) ?? null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener mesas" });
  }
});

// POST /restaurant/tables
router.post("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const parsed = tableSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  try {
    const [table] = await db.insert(restaurantTablesTable).values({
      storeId: user.storeId,
      ...parsed.data,
    }).returning();
    res.status(201).json(table);
  } catch (err) {
    res.status(500).json({ error: "Error al crear mesa" });
  }
});

// POST /restaurant/tables/bulk
router.post("/bulk", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const schema = z.object({
    count: z.number().int().min(1).max(100),
    prefix: z.string().min(1),
    zone: z.string().optional(),
    capacity: z.number().int().min(1).default(4),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const { count, prefix, zone, capacity } = parsed.data;

  // Find current max sortOrder
  const existing = await db
    .select({ sortOrder: restaurantTablesTable.sortOrder })
    .from(restaurantTablesTable)
    .where(eq(restaurantTablesTable.storeId, user.storeId))
    .orderBy(asc(restaurantTablesTable.sortOrder));
  const maxSort = existing.length > 0 ? (existing[existing.length - 1].sortOrder ?? 0) : 0;

  const rows = Array.from({ length: count }, (_, i) => ({
    storeId: user.storeId!,
    name: `${prefix} ${maxSort + i + 1}`,
    zone: zone ?? null,
    capacity,
    sortOrder: maxSort + i + 1,
  }));

  try {
    const tables = await db.insert(restaurantTablesTable).values(rows).returning();
    res.status(201).json(tables);
  } catch (err) {
    res.status(500).json({ error: "Error al crear mesas" });
  }
});

// PATCH /restaurant/tables/:tableId
router.patch("/:tableId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const { tableId } = req.params;
  const parsed = updateTableSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const [existing] = await db
    .select()
    .from(restaurantTablesTable)
    .where(and(eq(restaurantTablesTable.id, tableId), eq(restaurantTablesTable.storeId, user.storeId)))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Mesa no encontrada" }); return; }

  try {
    const [updated] = await db
      .update(restaurantTablesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(restaurantTablesTable.id, tableId))
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar mesa" });
  }
});

// DELETE /restaurant/tables/:tableId
router.delete("/:tableId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const { tableId } = req.params;

  const [existing] = await db
    .select()
    .from(restaurantTablesTable)
    .where(and(eq(restaurantTablesTable.id, tableId), eq(restaurantTablesTable.storeId, user.storeId)))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Mesa no encontrada" }); return; }

  try {
    await db.delete(restaurantTablesTable).where(eq(restaurantTablesTable.id, tableId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Error al eliminar mesa" });
  }
});

export default router;
