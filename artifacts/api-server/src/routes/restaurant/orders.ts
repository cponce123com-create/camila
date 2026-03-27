import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  restaurantOrdersTable,
  restaurantOrderItemsTable,
  restaurantTablesTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

const orderItemInputSchema = z.object({
  productId: z.string().optional(),
  productName: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().min(1).default(1),
  notes: z.string().optional(),
});

function calcTotals(
  items: { unitPrice: string | number; quantity: number; status: string }[],
  discountAmt: number,
  discountPct: number,
) {
  const subtotal = items
    .filter((i) => i.status !== "cancelled")
    .reduce((s, i) => s + parseFloat(String(i.unitPrice)) * i.quantity, 0);
  const discountValue = discountPct > 0
    ? subtotal * (discountPct / 100)
    : discountAmt;
  const total = Math.max(0, subtotal - discountValue);
  return { subtotal, total };
}

async function getOrderWithItems(orderId: string, storeId: string) {
  const [order] = await db
    .select({
      id: restaurantOrdersTable.id,
      storeId: restaurantOrdersTable.storeId,
      tableId: restaurantOrdersTable.tableId,
      tableName: restaurantTablesTable.name,
      tableZone: restaurantTablesTable.zone,
      status: restaurantOrdersTable.status,
      staffUserId: restaurantOrdersTable.staffUserId,
      staffName: usersTable.name,
      guestCount: restaurantOrdersTable.guestCount,
      notes: restaurantOrdersTable.notes,
      subtotal: restaurantOrdersTable.subtotal,
      discount: restaurantOrdersTable.discount,
      discountPercent: restaurantOrdersTable.discountPercent,
      total: restaurantOrdersTable.total,
      paymentMethod: restaurantOrdersTable.paymentMethod,
      openedAt: restaurantOrdersTable.openedAt,
      closedAt: restaurantOrdersTable.closedAt,
      createdAt: restaurantOrdersTable.createdAt,
      updatedAt: restaurantOrdersTable.updatedAt,
    })
    .from(restaurantOrdersTable)
    .leftJoin(restaurantTablesTable, eq(restaurantOrdersTable.tableId, restaurantTablesTable.id))
    .leftJoin(usersTable, eq(restaurantOrdersTable.staffUserId, usersTable.id))
    .where(and(eq(restaurantOrdersTable.id, orderId), eq(restaurantOrdersTable.storeId, storeId)))
    .limit(1);

  if (!order) return null;

  const items = await db
    .select()
    .from(restaurantOrderItemsTable)
    .where(eq(restaurantOrderItemsTable.orderId, orderId))
    .orderBy(restaurantOrderItemsTable.sortOrder);

  return { ...order, items };
}

// GET /restaurant/orders
router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const tableId = req.query.tableId as string | undefined;
  const status = req.query.status as string | undefined;
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || "20")));
  const offset = (page - 1) * limit;

  try {
    const conditions = [
      eq(restaurantOrdersTable.storeId, user.storeId),
      tableId ? eq(restaurantOrdersTable.tableId, tableId) : undefined,
      status ? eq(restaurantOrdersTable.status, status as any) : undefined,
      dateFrom ? gte(restaurantOrdersTable.openedAt, new Date(dateFrom)) : undefined,
      dateTo ? lte(restaurantOrdersTable.openedAt, new Date(dateTo)) : undefined,
    ].filter(Boolean) as any[];

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(restaurantOrdersTable)
      .where(and(...conditions));

    const orders = await db
      .select({
        id: restaurantOrdersTable.id,
        storeId: restaurantOrdersTable.storeId,
        tableId: restaurantOrdersTable.tableId,
        tableName: restaurantTablesTable.name,
        tableZone: restaurantTablesTable.zone,
        status: restaurantOrdersTable.status,
        staffUserId: restaurantOrdersTable.staffUserId,
        staffName: usersTable.name,
        guestCount: restaurantOrdersTable.guestCount,
        notes: restaurantOrdersTable.notes,
        subtotal: restaurantOrdersTable.subtotal,
        discount: restaurantOrdersTable.discount,
        discountPercent: restaurantOrdersTable.discountPercent,
        total: restaurantOrdersTable.total,
        paymentMethod: restaurantOrdersTable.paymentMethod,
        openedAt: restaurantOrdersTable.openedAt,
        closedAt: restaurantOrdersTable.closedAt,
        createdAt: restaurantOrdersTable.createdAt,
        updatedAt: restaurantOrdersTable.updatedAt,
      })
      .from(restaurantOrdersTable)
      .leftJoin(restaurantTablesTable, eq(restaurantOrdersTable.tableId, restaurantTablesTable.id))
      .leftJoin(usersTable, eq(restaurantOrdersTable.staffUserId, usersTable.id))
      .where(and(...conditions))
      .orderBy(desc(restaurantOrdersTable.openedAt))
      .limit(limit)
      .offset(offset);

    res.json({ data: orders, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener pedidos" });
  }
});

// POST /restaurant/orders
router.post("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const schema = z.object({
    tableId: z.string().min(1),
    guestCount: z.number().int().min(1).default(1),
    notes: z.string().optional(),
    items: z.array(orderItemInputSchema).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const { tableId, guestCount, notes, items = [] } = parsed.data;

  // Verify table belongs to store
  const [table] = await db
    .select()
    .from(restaurantTablesTable)
    .where(and(eq(restaurantTablesTable.id, tableId), eq(restaurantTablesTable.storeId, user.storeId)))
    .limit(1);

  if (!table) { res.status(404).json({ error: "Mesa no encontrada" }); return; }

  try {
    const [order] = await db.insert(restaurantOrdersTable).values({
      storeId: user.storeId,
      tableId,
      staffUserId: user.id,
      guestCount,
      notes,
      subtotal: "0",
      discount: "0",
      discountPercent: "0",
      total: "0",
    }).returning();

    // Update table status to occupied
    await db.update(restaurantTablesTable)
      .set({ status: "occupied", updatedAt: new Date() })
      .where(eq(restaurantTablesTable.id, tableId));

    // Add initial items if provided
    if (items.length > 0) {
      const itemRows = items.map((item, i) => ({
        orderId: order.id,
        storeId: user.storeId!,
        productId: item.productId ?? null,
        productName: item.productName,
        unitPrice: String(item.unitPrice),
        quantity: item.quantity,
        subtotal: String(item.unitPrice * item.quantity),
        notes: item.notes,
        sortOrder: i,
      }));
      await db.insert(restaurantOrderItemsTable).values(itemRows);
      const { subtotal, total } = calcTotals(
        itemRows.map((r) => ({ unitPrice: r.unitPrice, quantity: r.quantity, status: "pending" })),
        0, 0
      );
      await db.update(restaurantOrdersTable)
        .set({ subtotal: String(subtotal), total: String(total) })
        .where(eq(restaurantOrdersTable.id, order.id));
    }

    const result = await getOrderWithItems(order.id, user.storeId);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Error al crear pedido" });
  }
});

// GET /restaurant/orders/:orderId
router.get("/:orderId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const result = await getOrderWithItems(req.params.orderId, user.storeId);
  if (!result) { res.status(404).json({ error: "Pedido no encontrado" }); return; }
  res.json(result);
});

// PATCH /restaurant/orders/:orderId
router.patch("/:orderId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const updateSchema = z.object({
    status: z.enum(["open", "completed", "paid", "cancelled"]).optional(),
    notes: z.string().optional(),
    discount: z.number().nonnegative().optional(),
    discountPercent: z.number().nonnegative().max(100).optional(),
    paymentMethod: z.enum(["cash", "card", "transfer", "other"]).optional(),
    guestCount: z.number().int().min(1).optional(),
  });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const { orderId } = req.params;
  const order = await getOrderWithItems(orderId, user.storeId);
  if (!order) { res.status(404).json({ error: "Pedido no encontrado" }); return; }

  const updateData: any = { ...parsed.data, updatedAt: new Date() };

  // Recalculate totals when discount changes
  const discount = parsed.data.discount ?? parseFloat(String(order.discount));
  const discountPercent = parsed.data.discountPercent ?? parseFloat(String(order.discountPercent));
  const { subtotal, total } = calcTotals(order.items, discount, discountPercent);
  updateData.subtotal = String(subtotal);
  updateData.discount = String(discount);
  updateData.discountPercent = String(discountPercent);
  updateData.total = String(total);

  // Set closed time and update table status when completing/paying
  if (parsed.data.status === "paid" || parsed.data.status === "completed") {
    updateData.closedAt = new Date();
    await db.update(restaurantTablesTable)
      .set({ status: parsed.data.status === "paid" ? "free" : "to_pay", updatedAt: new Date() })
      .where(eq(restaurantTablesTable.id, order.tableId));
  }
  if (parsed.data.status === "cancelled") {
    updateData.closedAt = new Date();
    await db.update(restaurantTablesTable)
      .set({ status: "free", updatedAt: new Date() })
      .where(eq(restaurantTablesTable.id, order.tableId));
  }

  try {
    await db.update(restaurantOrdersTable)
      .set(updateData)
      .where(eq(restaurantOrdersTable.id, orderId));

    const result = await getOrderWithItems(orderId, user.storeId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar pedido" });
  }
});

// POST /restaurant/orders/:orderId/items
router.post("/:orderId/items", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const schema = z.object({
    items: z.array(orderItemInputSchema).min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const { orderId } = req.params;
  const order = await getOrderWithItems(orderId, user.storeId);
  if (!order) { res.status(404).json({ error: "Pedido no encontrado" }); return; }
  if (order.status !== "open") { res.status(400).json({ error: "El pedido no está abierto" }); return; }

  const currentMax = order.items.reduce((m, i) => Math.max(m, i.sortOrder), 0);
  const itemRows = parsed.data.items.map((item, i) => ({
    orderId,
    storeId: user.storeId!,
    productId: item.productId ?? null,
    productName: item.productName,
    unitPrice: String(item.unitPrice),
    quantity: item.quantity,
    subtotal: String(item.unitPrice * item.quantity),
    notes: item.notes,
    sortOrder: currentMax + i + 1,
  }));

  try {
    await db.insert(restaurantOrderItemsTable).values(itemRows);

    // Recalculate totals
    const allItems = await db
      .select()
      .from(restaurantOrderItemsTable)
      .where(eq(restaurantOrderItemsTable.orderId, orderId));

    const { subtotal, total } = calcTotals(
      allItems,
      parseFloat(String(order.discount)),
      parseFloat(String(order.discountPercent))
    );

    await db.update(restaurantOrdersTable)
      .set({ subtotal: String(subtotal), total: String(total), updatedAt: new Date() })
      .where(eq(restaurantOrdersTable.id, orderId));

    const result = await getOrderWithItems(orderId, user.storeId);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Error al agregar items" });
  }
});

// PATCH /restaurant/orders/:orderId/items/:itemId
router.patch("/:orderId/items/:itemId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const updateItemSchema = z.object({
    quantity: z.number().int().min(1).optional(),
    notes: z.string().optional(),
    status: z.enum(["pending", "preparing", "served", "cancelled"]).optional(),
  });

  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const { orderId, itemId } = req.params;

  const [item] = await db
    .select()
    .from(restaurantOrderItemsTable)
    .where(and(
      eq(restaurantOrderItemsTable.id, itemId),
      eq(restaurantOrderItemsTable.orderId, orderId),
      eq(restaurantOrderItemsTable.storeId, user.storeId),
    ))
    .limit(1);

  if (!item) { res.status(404).json({ error: "Item no encontrado" }); return; }

  const newQty = parsed.data.quantity ?? item.quantity;
  const newSubtotal = parseFloat(String(item.unitPrice)) * newQty;

  try {
    const [updated] = await db
      .update(restaurantOrderItemsTable)
      .set({
        ...parsed.data,
        subtotal: String(newSubtotal),
        updatedAt: new Date(),
      })
      .where(eq(restaurantOrderItemsTable.id, itemId))
      .returning();

    // Recalculate order totals
    const order = await getOrderWithItems(orderId, user.storeId);
    if (order) {
      const { subtotal, total } = calcTotals(
        order.items,
        parseFloat(String(order.discount)),
        parseFloat(String(order.discountPercent))
      );
      await db.update(restaurantOrdersTable)
        .set({ subtotal: String(subtotal), total: String(total), updatedAt: new Date() })
        .where(eq(restaurantOrdersTable.id, orderId));
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar item" });
  }
});

// DELETE /restaurant/orders/:orderId/items/:itemId
router.delete("/:orderId/items/:itemId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const { orderId, itemId } = req.params;

  const [item] = await db
    .select()
    .from(restaurantOrderItemsTable)
    .where(and(
      eq(restaurantOrderItemsTable.id, itemId),
      eq(restaurantOrderItemsTable.orderId, orderId),
      eq(restaurantOrderItemsTable.storeId, user.storeId),
    ))
    .limit(1);

  if (!item) { res.status(404).json({ error: "Item no encontrado" }); return; }

  try {
    await db.delete(restaurantOrderItemsTable).where(eq(restaurantOrderItemsTable.id, itemId));

    // Recalculate
    const order = await getOrderWithItems(orderId, user.storeId);
    if (order) {
      const { subtotal, total } = calcTotals(
        order.items,
        parseFloat(String(order.discount)),
        parseFloat(String(order.discountPercent))
      );
      await db.update(restaurantOrdersTable)
        .set({ subtotal: String(subtotal), total: String(total), updatedAt: new Date() })
        .where(eq(restaurantOrdersTable.id, orderId));
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar item" });
  }
});

export default router;
