import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  salesTable,
  saleItemsTable,
  productsTable,
  categoriesTable,
} from "@workspace/db";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";

const router: IRouter = Router();

function parseDateRange(from?: string, to?: string): { fromDate: Date; toDate: Date } {
  const toDate = to ? new Date(to) : new Date();
  toDate.setHours(23, 59, 59, 999);
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 29 * 24 * 60 * 60 * 1000);
  fromDate.setHours(0, 0, 0, 0);
  return { fromDate, toDate };
}

// GET /analytics/sales
router.get("/sales", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda asociada" }); return; }
  const storeId = user.storeId;
  const { fromDate, toDate } = parseDateRange(
    req.query.from as string,
    req.query.to as string
  );

  try {
    const [totals] = await db
      .select({
        revenue: sql<number>`COALESCE(SUM(CAST(${salesTable.total} AS NUMERIC)), 0)::float`,
        count: count(),
        avgOrder: sql<number>`COALESCE(AVG(CAST(${salesTable.total} AS NUMERIC)), 0)::float`,
        totalDiscount: sql<number>`COALESCE(SUM(CAST(${salesTable.discount} AS NUMERIC)), 0)::float`,
      })
      .from(salesTable)
      .where(and(
        eq(salesTable.storeId, storeId),
        eq(salesTable.status, "paid"),
        gte(salesTable.createdAt, fromDate),
        lte(salesTable.createdAt, toDate),
      ));

    const trendRows = await db
      .select({
        date: sql<string>`DATE(${salesTable.createdAt})::text`,
        revenue: sql<number>`COALESCE(SUM(CAST(${salesTable.total} AS NUMERIC)), 0)::float`,
        count: count(),
      })
      .from(salesTable)
      .where(and(
        eq(salesTable.storeId, storeId),
        eq(salesTable.status, "paid"),
        gte(salesTable.createdAt, fromDate),
        lte(salesTable.createdAt, toDate),
      ))
      .groupBy(sql`DATE(${salesTable.createdAt})`)
      .orderBy(sql`DATE(${salesTable.createdAt})`);

    const paymentRows = await db
      .select({
        method: salesTable.paymentMethod,
        count: count(),
        revenue: sql<number>`COALESCE(SUM(CAST(${salesTable.total} AS NUMERIC)), 0)::float`,
      })
      .from(salesTable)
      .where(and(
        eq(salesTable.storeId, storeId),
        eq(salesTable.status, "paid"),
        gte(salesTable.createdAt, fromDate),
        lte(salesTable.createdAt, toDate),
      ))
      .groupBy(salesTable.paymentMethod);

    const peakHoursRows = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${salesTable.createdAt})::int`,
        count: count(),
        revenue: sql<number>`COALESCE(SUM(CAST(${salesTable.total} AS NUMERIC)), 0)::float`,
      })
      .from(salesTable)
      .where(and(
        eq(salesTable.storeId, storeId),
        eq(salesTable.status, "paid"),
        gte(salesTable.createdAt, fromDate),
        lte(salesTable.createdAt, toDate),
      ))
      .groupBy(sql`EXTRACT(HOUR FROM ${salesTable.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${salesTable.createdAt})`);

    res.json({
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      totals: {
        revenue: totals.revenue,
        count: totals.count,
        avgOrder: totals.avgOrder,
        totalDiscount: totals.totalDiscount,
      },
      trend: trendRows.map((r) => ({ date: r.date, revenue: r.revenue, count: r.count })),
      paymentMethods: paymentRows.map((r) => ({
        method: r.method ?? "other",
        count: r.count,
        revenue: r.revenue,
      })),
      peakHours: peakHoursRows.map((r) => ({ hour: r.hour, count: r.count, revenue: r.revenue })),
    });
  } catch (err) {
    req.log.error({ err }, "Analytics sales error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /analytics/products
router.get("/products", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda asociada" }); return; }
  const storeId = user.storeId;
  const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 10));
  const { fromDate, toDate } = parseDateRange(
    req.query.from as string,
    req.query.to as string
  );

  try {
    const productSalesRows = await db
      .select({
        productId: saleItemsTable.productId,
        productName: saleItemsTable.productName,
        quantity: sql<number>`SUM(${saleItemsTable.quantity})::int`,
        revenue: sql<number>`COALESCE(SUM(CAST(${saleItemsTable.subtotal} AS NUMERIC)), 0)::float`,
      })
      .from(saleItemsTable)
      .innerJoin(salesTable, eq(salesTable.id, saleItemsTable.saleId))
      .where(and(
        eq(saleItemsTable.storeId, storeId),
        eq(salesTable.status, "paid"),
        gte(salesTable.createdAt, fromDate),
        lte(salesTable.createdAt, toDate),
      ))
      .groupBy(saleItemsTable.productId, saleItemsTable.productName)
      .orderBy(sql`SUM(${saleItemsTable.quantity}) DESC`);

    const topByQuantity = productSalesRows.slice(0, limit);
    const bottomByQuantity = [...productSalesRows].sort((a, b) => a.quantity - b.quantity).slice(0, limit);
    const topByRevenue = [...productSalesRows].sort((a, b) => b.revenue - a.revenue).slice(0, limit);

    // Category performance
    const categoryRows = await db
      .select({
        categoryId: productsTable.categoryId,
        quantity: sql<number>`SUM(${saleItemsTable.quantity})::int`,
        revenue: sql<number>`COALESCE(SUM(CAST(${saleItemsTable.subtotal} AS NUMERIC)), 0)::float`,
      })
      .from(saleItemsTable)
      .innerJoin(salesTable, eq(salesTable.id, saleItemsTable.saleId))
      .leftJoin(productsTable, eq(productsTable.id, saleItemsTable.productId))
      .where(and(
        eq(saleItemsTable.storeId, storeId),
        eq(salesTable.status, "paid"),
        gte(salesTable.createdAt, fromDate),
        lte(salesTable.createdAt, toDate),
      ))
      .groupBy(productsTable.categoryId)
      .orderBy(sql`SUM(${saleItemsTable.quantity}) DESC`);

    // Get category names
    const cats = await db
      .select({ id: categoriesTable.id, name: categoriesTable.name })
      .from(categoriesTable)
      .where(eq(categoriesTable.storeId, storeId));
    const catMap = new Map(cats.map((c) => [c.id, c.name]));

    const categories = categoryRows.map((r) => ({
      categoryId: r.categoryId,
      categoryName: catMap.get(r.categoryId ?? "") ?? "Sin categoría",
      quantity: r.quantity,
      revenue: r.revenue,
    }));

    res.json({
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      topByQuantity,
      topByRevenue,
      bottomByQuantity,
      categories,
    });
  } catch (err) {
    req.log.error({ err }, "Analytics products error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /analytics/inventory
router.get("/inventory", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda asociada" }); return; }
  const storeId = user.storeId;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const products = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        stock: productsTable.stock,
        minStock: productsTable.minStock,
        unit: productsTable.unit,
        sku: productsTable.sku,
        costPrice: productsTable.costPrice,
        price: productsTable.price,
      })
      .from(productsTable)
      .where(and(eq(productsTable.storeId, storeId), eq(productsTable.isActive, true)));

    const criticalStock = products
      .filter((p) => p.stock > 0 && p.stock <= p.minStock)
      .sort((a, b) => a.stock - b.stock);

    const outOfStock = products.filter((p) => p.stock === 0);

    // Inventory rotation: sold units in last 30 days per product
    const soldRows = await db
      .select({
        productName: saleItemsTable.productName,
        productId: saleItemsTable.productId,
        totalSold: sql<number>`SUM(${saleItemsTable.quantity})::int`,
      })
      .from(saleItemsTable)
      .innerJoin(salesTable, eq(salesTable.id, saleItemsTable.saleId))
      .where(and(
        eq(saleItemsTable.storeId, storeId),
        eq(salesTable.status, "paid"),
        gte(salesTable.createdAt, thirtyDaysAgo),
      ))
      .groupBy(saleItemsTable.productId, saleItemsTable.productName)
      .orderBy(sql`SUM(${saleItemsTable.quantity}) DESC`)
      .limit(20);

    const productMap = new Map(products.map((p) => [p.id, p]));

    const rotation = soldRows.map((r) => {
      const p = productMap.get(r.productId ?? "");
      const avgStock = p?.stock ?? 1;
      const rate = avgStock > 0 ? Math.round((r.totalSold / avgStock) * 100) / 100 : 0;
      return {
        productId: r.productId,
        productName: r.productName,
        totalSold: r.totalSold,
        currentStock: p?.stock ?? 0,
        rotationRate: rate,
      };
    });

    res.json({
      criticalStock,
      outOfStock,
      rotation,
      summary: {
        totalActive: products.length,
        criticalCount: criticalStock.length,
        outOfStockCount: outOfStock.length,
        stockValue: products.reduce((acc, p) => acc + Number(p.costPrice ?? 0) * p.stock, 0),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Analytics inventory error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
