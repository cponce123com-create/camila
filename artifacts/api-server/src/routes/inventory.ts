import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { inventoryMovementsTable, productsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

router.post("/adjust", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  const schema = z.object({
    productId: z.string(),
    quantity: z.number().int(),
    type: z.enum(["in", "out", "adjustment"]),
    reason: z.string().optional(),
    notes: z.string().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  const data = result.data;

  try {
    const [product] = await db
      .select({ id: productsTable.id, stock: productsTable.stock })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.id, data.productId),
          eq(productsTable.storeId, user.storeId)
        )
      )
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const previousStock = product.stock;
    let newStock: number;

    if (data.type === "in") {
      newStock = previousStock + Math.abs(data.quantity);
    } else if (data.type === "out") {
      newStock = previousStock - Math.abs(data.quantity);
      if (newStock < 0) {
        res.status(400).json({ error: "Stock insuficiente" });
        return;
      }
    } else {
      newStock = data.quantity;
    }

    await db
      .update(productsTable)
      .set({ stock: newStock, updatedAt: new Date() })
      .where(eq(productsTable.id, product.id));

    const [movement] = await db
      .insert(inventoryMovementsTable)
      .values({
        storeId: user.storeId,
        productId: data.productId,
        userId: user.id,
        type: data.type,
        quantity: data.quantity,
        previousStock,
        newStock,
        reason: data.reason,
        notes: data.notes,
      })
      .returning();

    res.json(movement);
  } catch (err) {
    req.log.error({ err }, "Adjust inventory error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/movements", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;
  const productId = req.query.productId as string | undefined;

  try {
    const filters = [
      eq(inventoryMovementsTable.storeId, user.storeId),
      productId ? eq(inventoryMovementsTable.productId, productId) : undefined,
    ].filter(Boolean) as Parameters<typeof and>[];

    const movements = await db
      .select()
      .from(inventoryMovementsTable)
      .where(and(...filters))
      .limit(limit)
      .offset(offset)
      .orderBy(inventoryMovementsTable.createdAt);

    const [{ total }] = await db
      .select({ total: count() })
      .from(inventoryMovementsTable)
      .where(and(...filters));

    res.json({
      data: movements,
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Get inventory movements error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
