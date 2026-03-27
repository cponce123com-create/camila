import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  restaurantTablesTable,
  restaurantOrdersTable,
} from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { requireAuth } from "../../middlewares/session";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const tables = await db
      .select({ status: restaurantTablesTable.status })
      .from(restaurantTablesTable)
      .where(and(eq(restaurantTablesTable.storeId, user.storeId), eq(restaurantTablesTable.isActive, true)));

    const tablesToday = {
      total: tables.length,
      free: tables.filter((t) => t.status === "free").length,
      occupied: tables.filter((t) => t.status === "occupied").length,
      toPay: tables.filter((t) => t.status === "to_pay").length,
    };

    const [ordersStats] = await db
      .select({
        ordersToday: sql<number>`count(*)::int`,
        revenueToday: sql<number>`coalesce(sum(total::numeric), 0)::float`,
        avgOrderValue: sql<number>`coalesce(avg(total::numeric), 0)::float`,
      })
      .from(restaurantOrdersTable)
      .where(and(
        eq(restaurantOrdersTable.storeId, user.storeId),
        gte(restaurantOrdersTable.openedAt, today),
      ));

    const [openOrders] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(restaurantOrdersTable)
      .where(and(
        eq(restaurantOrdersTable.storeId, user.storeId),
        eq(restaurantOrdersTable.status, "open"),
      ));

    res.json({
      ordersToday: ordersStats.ordersToday,
      revenueToday: ordersStats.revenueToday,
      avgOrderValue: ordersStats.avgOrderValue,
      tablesOccupied: tablesToday.occupied,
      tablesFree: tablesToday.free,
      tablesToPay: tablesToday.toPay,
      totalTables: tablesToday.total,
      openOrders: openOrders.count,
    });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

export default router;
