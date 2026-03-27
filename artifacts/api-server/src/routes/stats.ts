import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  categoriesTable,
  inventoryMovementsTable,
} from "@workspace/db";
import { eq, and, lte, sql, gte, count, sum } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  const period = (req.query.period as string) || "month";

  const now = new Date();
  let periodStart: Date;
  if (period === "today") {
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    const day = now.getDay();
    periodStart = new Date(now);
    periodStart.setDate(now.getDate() - day);
    periodStart.setHours(0, 0, 0, 0);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  try {
    const storeId = user.storeId;

    // Product counts
    const products = await db
      .select({
        isActive: productsTable.isActive,
        isFeatured: productsTable.isFeatured,
        stock: productsTable.stock,
        minStock: productsTable.minStock,
        costPrice: productsTable.costPrice,
        categoryId: productsTable.categoryId,
        price: productsTable.price,
        name: productsTable.name,
        id: productsTable.id,
        storeId: productsTable.storeId,
        description: productsTable.description,
        longDescription: productsTable.longDescription,
        salePrice: productsTable.salePrice,
        saleStartDate: productsTable.saleStartDate,
        saleEndDate: productsTable.saleEndDate,
        sku: productsTable.sku,
        barcode: productsTable.barcode,
        imageUrl: productsTable.imageUrl,
        unit: productsTable.unit,
        tags: productsTable.tags,
        createdAt: productsTable.createdAt,
        updatedAt: productsTable.updatedAt,
      })
      .from(productsTable)
      .where(eq(productsTable.storeId, storeId));

    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.isActive).length;
    const inactiveProducts = products.filter((p) => !p.isActive).length;
    const featuredProducts = products.filter((p) => p.isFeatured).length;
    const lowStockProducts = products.filter(
      (p) => p.stock <= p.minStock && p.stock > 0
    );
    const outOfStockCount = products.filter((p) => p.stock === 0).length;
    const lowStockCount = lowStockProducts.length;

    // Stock value: sum of (costPrice * stock) for active products
    let stockValue = 0;
    for (const p of products) {
      if (p.isActive && p.costPrice) {
        stockValue += parseFloat(String(p.costPrice)) * p.stock;
      }
    }

    // Category counts
    const cats = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.storeId, storeId));

    const totalCategories = cats.length;

    // Products by category
    const catMap = new Map<string, { name: string; count: number; stockValue: number }>();
    for (const cat of cats) {
      catMap.set(cat.id, { name: cat.name, count: 0, stockValue: 0 });
    }

    for (const p of products) {
      if (p.categoryId && catMap.has(p.categoryId)) {
        const entry = catMap.get(p.categoryId)!;
        entry.count++;
        if (p.costPrice) {
          entry.stockValue += parseFloat(String(p.costPrice)) * p.stock;
        }
      }
    }

    const productsByCategory = Array.from(catMap.entries()).map(([id, v]) => ({
      categoryId: id,
      categoryName: v.name,
      productCount: v.count,
      stockValue: Math.round(v.stockValue * 100) / 100,
    }));

    // Inventory movements in period
    const movements = await db
      .select({
        type: inventoryMovementsTable.type,
        quantity: inventoryMovementsTable.quantity,
      })
      .from(inventoryMovementsTable)
      .where(
        and(
          eq(inventoryMovementsTable.storeId, storeId),
          gte(inventoryMovementsTable.createdAt, periodStart)
        )
      );

    const inventoryIn = movements
      .filter((m) => m.type === "in")
      .reduce((acc, m) => acc + Math.abs(m.quantity), 0);
    const inventoryOut = movements
      .filter((m) => m.type === "out")
      .reduce((acc, m) => acc + Math.abs(m.quantity), 0);
    const inventoryMovementsCount = movements.length;

    res.json({
      totalProducts,
      activeProducts,
      inactiveProducts,
      featuredProducts,
      totalCategories,
      lowStockCount,
      outOfStockCount,
      stockValue: Math.round(stockValue * 100) / 100,
      inventoryIn,
      inventoryOut,
      inventoryMovements: inventoryMovementsCount,
      productsByCategory,
      lowStockProducts: lowStockProducts.slice(0, 10),
      period,
    });
  } catch (err) {
    req.log.error({ err }, "Get store stats error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
