import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  restaurantOrdersTable,
  restaurantOrderItemsTable,
  restaurantTablesTable,
} from "@workspace/db";
import { eq, and, gte, lte, sql, count, desc } from "drizzle-orm";
import { requireAuth } from "../../middlewares/session";

const router: IRouter = Router();

function parseDateRange(from?: string, to?: string): { fromDate: Date; toDate: Date } {
  const toDate = to ? new Date(to) : new Date();
  toDate.setHours(23, 59, 59, 999);
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 29 * 24 * 60 * 60 * 1000);
  fromDate.setHours(0, 0, 0, 0);
  return { fromDate, toDate };
}

router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda asociada" }); return; }
  const storeId = user.storeId;
  const { fromDate, toDate } = parseDateRange(
    req.query.from as string,
    req.query.to as string
  );

  try {
    const ordersWhere = and(
      eq(restaurantOrdersTable.storeId, storeId),
      eq(restaurantOrdersTable.status, "paid"),
      gte(restaurantOrdersTable.openedAt, fromDate),
      lte(restaurantOrdersTable.openedAt, toDate),
    );

    const [totals] = await db
      .select({
        ordersCount: count(),
        revenue: sql<number>`COALESCE(SUM(CAST(${restaurantOrdersTable.total} AS NUMERIC)), 0)::float`,
        avgTicket: sql<number>`COALESCE(AVG(CAST(${restaurantOrdersTable.total} AS NUMERIC)), 0)::float`,
        avgServiceMinutes: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${restaurantOrdersTable.closedAt} - ${restaurantOrdersTable.openedAt})) / 60), 0)::float`,
        avgGuests: sql<number>`COALESCE(AVG(${restaurantOrdersTable.guestCount}), 0)::float`,
      })
      .from(restaurantOrdersTable)
      .where(ordersWhere);

    // Trend by day
    const trendRows = await db
      .select({
        date: sql<string>`DATE(${restaurantOrdersTable.openedAt})::text`,
        revenue: sql<number>`COALESCE(SUM(CAST(${restaurantOrdersTable.total} AS NUMERIC)), 0)::float`,
        orders: count(),
      })
      .from(restaurantOrdersTable)
      .where(ordersWhere)
      .groupBy(sql`DATE(${restaurantOrdersTable.openedAt})`)
      .orderBy(sql`DATE(${restaurantOrdersTable.openedAt})`);

    // Top tables
    const topTablesRows = await db
      .select({
        tableId: restaurantOrdersTable.tableId,
        ordersCount: count(),
        revenue: sql<number>`COALESCE(SUM(CAST(${restaurantOrdersTable.total} AS NUMERIC)), 0)::float`,
        avgTicket: sql<number>`COALESCE(AVG(CAST(${restaurantOrdersTable.total} AS NUMERIC)), 0)::float`,
      })
      .from(restaurantOrdersTable)
      .where(ordersWhere)
      .groupBy(restaurantOrdersTable.tableId)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    // Get table names
    const tables = await db
      .select({ id: restaurantTablesTable.id, name: restaurantTablesTable.name })
      .from(restaurantTablesTable)
      .where(eq(restaurantTablesTable.storeId, storeId));
    const tableMap = new Map(tables.map((t) => [t.id, t.name]));

    const topTables = topTablesRows.map((r) => ({
      tableId: r.tableId,
      tableName: tableMap.get(r.tableId) ?? r.tableId,
      ordersCount: r.ordersCount,
      revenue: r.revenue,
      avgTicket: r.avgTicket,
    }));

    // Top dishes
    const topDishesRows = await db
      .select({
        productName: restaurantOrderItemsTable.productName,
        productId: restaurantOrderItemsTable.productId,
        quantity: sql<number>`SUM(${restaurantOrderItemsTable.quantity})::int`,
        revenue: sql<number>`COALESCE(SUM(CAST(${restaurantOrderItemsTable.subtotal} AS NUMERIC)), 0)::float`,
      })
      .from(restaurantOrderItemsTable)
      .innerJoin(restaurantOrdersTable, eq(restaurantOrdersTable.id, restaurantOrderItemsTable.orderId))
      .where(and(
        eq(restaurantOrderItemsTable.storeId, storeId),
        eq(restaurantOrdersTable.status, "paid"),
        gte(restaurantOrdersTable.openedAt, fromDate),
        lte(restaurantOrdersTable.openedAt, toDate),
      ))
      .groupBy(restaurantOrderItemsTable.productId, restaurantOrderItemsTable.productName)
      .orderBy(sql`SUM(${restaurantOrderItemsTable.quantity}) DESC`)
      .limit(10);

    // Payment methods
    const paymentRows = await db
      .select({
        method: restaurantOrdersTable.paymentMethod,
        count: count(),
        revenue: sql<number>`COALESCE(SUM(CAST(${restaurantOrdersTable.total} AS NUMERIC)), 0)::float`,
      })
      .from(restaurantOrdersTable)
      .where(ordersWhere)
      .groupBy(restaurantOrdersTable.paymentMethod);

    // Service time by hour of day
    const serviceByHour = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${restaurantOrdersTable.openedAt})::int`,
        avgMinutes: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${restaurantOrdersTable.closedAt} - ${restaurantOrdersTable.openedAt})) / 60), 0)::float`,
        ordersCount: count(),
      })
      .from(restaurantOrdersTable)
      .where(and(ordersWhere, sql`${restaurantOrdersTable.closedAt} IS NOT NULL`))
      .groupBy(sql`EXTRACT(HOUR FROM ${restaurantOrdersTable.openedAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${restaurantOrdersTable.openedAt})`);

    res.json({
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      totals: {
        ordersCount: totals.ordersCount,
        revenue: totals.revenue,
        avgTicket: Math.round(totals.avgTicket * 100) / 100,
        avgServiceMinutes: Math.round(totals.avgServiceMinutes * 10) / 10,
        avgGuests: Math.round(totals.avgGuests * 10) / 10,
      },
      trend: trendRows,
      topTables,
      topDishes: topDishesRows,
      paymentMethods: paymentRows.map((r) => ({
        method: r.method ?? "other",
        count: r.count,
        revenue: r.revenue,
      })),
      serviceByHour,
    });
  } catch (err) {
    req.log.error({ err }, "Restaurant analytics error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
