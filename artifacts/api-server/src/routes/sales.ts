import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { salesTable, saleItemsTable, usersTable, clientsTable } from "@workspace/db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import { z } from "zod";
import { encodeCursor, decodeCursor, buildCursorCondition } from "../lib/cursor";

const router: IRouter = Router();

function generateReceiptCode(storeId: string): string {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `R${yy}${mm}${dd}-${rand}`;
}

async function getSaleWithItems(saleId: string, storeId: string) {
  const [sale] = await db
    .select({
      id: salesTable.id,
      storeId: salesTable.storeId,
      receiptCode: salesTable.receiptCode,
      clientId: salesTable.clientId,
      clientName: salesTable.clientName,
      clientPhone: salesTable.clientPhone,
      staffUserId: salesTable.staffUserId,
      staffName: usersTable.name,
      status: salesTable.status,
      subtotal: salesTable.subtotal,
      discount: salesTable.discount,
      discountPercent: salesTable.discountPercent,
      tax: salesTable.tax,
      total: salesTable.total,
      paymentMethod: salesTable.paymentMethod,
      notes: salesTable.notes,
      soldAt: salesTable.soldAt,
      createdAt: salesTable.createdAt,
      updatedAt: salesTable.updatedAt,
    })
    .from(salesTable)
    .leftJoin(usersTable, eq(salesTable.staffUserId, usersTable.id))
    .where(and(eq(salesTable.id, saleId), eq(salesTable.storeId, storeId)))
    .limit(1);

  if (!sale) return null;

  const items = await db
    .select()
    .from(saleItemsTable)
    .where(eq(saleItemsTable.saleId, saleId));

  return { ...sale, items };
}

// GET /sales
router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;
  const staffUserId = req.query.staffUserId as string | undefined;
  const paymentMethod = req.query.paymentMethod as string | undefined;
  const status = req.query.status as string | undefined;
  const clientId = req.query.clientId as string | undefined;
  // Cursor-based pagination support
  const cursorStr = req.query.cursor as string | undefined;
  let parsedCursor = cursorStr ? decodeCursor(cursorStr) : null;
  if (cursorStr && !parsedCursor) {
    res.status(400).json({ error: "Cursor inválido" });
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || "20")));
  const offset = parsedCursor ? 0 : (page - 1) * limit;

  try {
    const conditions = [
      eq(salesTable.storeId, user.storeId),
      dateFrom ? gte(salesTable.soldAt, new Date(dateFrom)) : undefined,
      dateTo ? lte(salesTable.soldAt, new Date(dateTo + "T23:59:59")) : undefined,
      staffUserId ? eq(salesTable.staffUserId, staffUserId) : undefined,
      paymentMethod ? eq(salesTable.paymentMethod, paymentMethod as any) : undefined,
      status ? eq(salesTable.status, status as any) : undefined,
      clientId ? eq(salesTable.clientId, clientId) : undefined,
      parsedCursor
        ? buildCursorCondition(parsedCursor, salesTable.createdAt, salesTable.id)
        : undefined,
    ].filter(Boolean) as any[];

    const fetchLimit = parsedCursor ? limit + 1 : limit;

    const rawData = await db
      .select({
        id: salesTable.id,
        storeId: salesTable.storeId,
        receiptCode: salesTable.receiptCode,
        clientId: salesTable.clientId,
        clientName: salesTable.clientName,
        clientPhone: salesTable.clientPhone,
        staffUserId: salesTable.staffUserId,
        staffName: usersTable.name,
        status: salesTable.status,
        subtotal: salesTable.subtotal,
        discount: salesTable.discount,
        discountPercent: salesTable.discountPercent,
        tax: salesTable.tax,
        total: salesTable.total,
        paymentMethod: salesTable.paymentMethod,
        notes: salesTable.notes,
        soldAt: salesTable.soldAt,
        createdAt: salesTable.createdAt,
        updatedAt: salesTable.updatedAt,
      })
      .from(salesTable)
      .leftJoin(usersTable, eq(salesTable.staffUserId, usersTable.id))
      .where(and(...conditions))
      .orderBy(desc(salesTable.createdAt), desc(salesTable.id))
      .limit(fetchLimit)
      .offset(offset);

    const hasMore = parsedCursor && rawData.length > limit;
    const data = hasMore ? rawData.slice(0, limit) : rawData;

    const nextCursor = hasMore && data.length > 0
      ? encodeCursor({
          createdAt: (data[data.length - 1].createdAt as Date).toISOString(),
          id: data[data.length - 1].id,
        })
      : null;

    const total = parsedCursor
      ? null
      : (await db.select({ count: sql<number>`count(*)::int` }).from(salesTable).where(and(...conditions)))[0].count;

    // Compute day totals
    const [todayStats] = await db
      .select({
        totalToday: sql<number>`coalesce(sum(total::numeric),0)::float`,
        countToday: sql<number>`count(*)::int`,
      })
      .from(salesTable)
      .where(and(
        eq(salesTable.storeId, user.storeId),
        gte(salesTable.soldAt, new Date(new Date().setHours(0, 0, 0, 0))),
        eq(salesTable.status, "paid"),
      ));

    res.json({
      data,
      ...(parsedCursor
        ? { nextCursor, hasMore: Boolean(hasMore) }
        : { total, page, limit, totalPages: Math.ceil((total ?? 0) / limit) }),
      todayTotal: todayStats.totalToday,
      todayCount: todayStats.countToday,
    });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener ventas" });
  }
});

// POST /sales
router.post("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const saleItemSchema = z.object({
    productId: z.string().optional(),
    productName: z.string().min(1),
    productSku: z.string().nullish(),
    unitPrice: z.number().nonnegative(),
    quantity: z.union([z.number(), z.string().transform(Number)]).pipe(z.number().min(1)).default(1),
    discount: z.number().nonnegative().default(0),
  });

  const schema = z.object({
    clientId: z.string().optional(),
    clientName: z.string().optional(),
    clientPhone: z.string().optional(),
    notes: z.string().optional(),
    discount: z.number().nonnegative().default(0),
    discountPercent: z.number().nonnegative().max(100).default(0),
    paymentMethod: z.enum(["cash", "card", "transfer", "other"]).default("cash"),
    items: z.array(saleItemSchema).min(1),
    soldAt: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    console.error("[sales POST] validation error:", JSON.stringify(parsed.error.issues), "body:", JSON.stringify(req.body));
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const { clientId, clientName, clientPhone, notes, discount, discountPercent, paymentMethod, items, soldAt } = parsed.data;

  // Calculate totals
  const lineSubtotal = items.reduce((s, i) => s + (i.unitPrice * i.quantity - i.discount), 0);
  const discountValue = discountPercent > 0
    ? lineSubtotal * (discountPercent / 100)
    : discount;
  const total = Math.max(0, lineSubtotal - discountValue);

  try {
    // Resolve client name if clientId provided
    let resolvedClientName = clientName;
    let resolvedClientPhone = clientPhone;
    if (clientId) {
      const [cl] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);
      if (cl) {
        resolvedClientName = resolvedClientName || cl.name;
        resolvedClientPhone = resolvedClientPhone || (cl.phone ?? undefined);
      }
    }

    const [sale] = await db.insert(salesTable).values({
      storeId: user.storeId,
      receiptCode: generateReceiptCode(user.storeId),
      clientId: clientId ?? null,
      clientName: resolvedClientName ?? null,
      clientPhone: resolvedClientPhone ?? null,
      staffUserId: user.id,
      subtotal: String(lineSubtotal),
      discount: String(discountValue),
      discountPercent: String(discountPercent),
      tax: "0",
      total: String(total),
      paymentMethod,
      notes,
      soldAt: soldAt ? new Date(soldAt) : new Date(),
    }).returning();

    const itemRows = items.map((item) => ({
      saleId: sale.id,
      storeId: user.storeId!,
      productId: item.productId ?? null,
      productName: item.productName,
      productSku: item.productSku ?? null,
      unitPrice: String(item.unitPrice),
      quantity: item.quantity,
      discount: String(item.discount),
      subtotal: String(item.unitPrice * item.quantity - item.discount),
    }));

    await db.insert(saleItemsTable).values(itemRows);

    const result = await getSaleWithItems(sale.id, user.storeId);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar venta" });
  }
});

// GET /sales/:saleId
router.get("/:saleId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const result = await getSaleWithItems(req.params.saleId, user.storeId);
  if (!result) { res.status(404).json({ error: "Venta no encontrada" }); return; }
  res.json(result);
});

// PATCH /sales/:saleId
router.patch("/:saleId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const schema = z.object({
    status: z.enum(["paid", "cancelled", "refunded"]).optional(),
    notes: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const { saleId } = req.params;
  const [existing] = await db
    .select()
    .from(salesTable)
    .where(and(eq(salesTable.id, saleId), eq(salesTable.storeId, user.storeId)))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "Venta no encontrada" }); return; }

  try {
    await db.update(salesTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(salesTable.id, saleId));
    const result = await getSaleWithItems(saleId, user.storeId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar venta" });
  }
});

// DELETE /sales/:saleId
router.delete("/:saleId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const { saleId } = req.params;
  const [existing] = await db
    .select()
    .from(salesTable)
    .where(and(eq(salesTable.id, saleId), eq(salesTable.storeId, user.storeId)))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "Venta no encontrada" }); return; }

  try {
    await db.delete(salesTable).where(eq(salesTable.id, saleId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar venta" });
  }
});

export default router;
