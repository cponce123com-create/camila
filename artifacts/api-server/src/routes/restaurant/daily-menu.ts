import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { dailyMenusTable, dailyMenuItemsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

async function getMenuWithItems(menuId: string, storeId: string) {
  const [menu] = await db
    .select()
    .from(dailyMenusTable)
    .where(and(eq(dailyMenusTable.id, menuId), eq(dailyMenusTable.storeId, storeId)))
    .limit(1);

  if (!menu) return null;

  const items = await db
    .select()
    .from(dailyMenuItemsTable)
    .where(eq(dailyMenuItemsTable.menuId, menuId))
    .orderBy(asc(dailyMenuItemsTable.sortOrder));

  return { ...menu, items };
}

// GET /restaurant/daily-menu
router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  try {
    const [menu] = await db
      .select()
      .from(dailyMenusTable)
      .where(and(
        eq(dailyMenusTable.storeId, user.storeId),
        eq(dailyMenusTable.date, date),
      ))
      .limit(1);

    if (!menu) {
      res.json({ date, items: [], isPublished: false });
      return;
    }

    const result = await getMenuWithItems(menu.id, user.storeId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener menú del día" });
  }
});

// POST /restaurant/daily-menu (create or update today's menu)
router.post("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const schema = z.object({
    date: z.string().optional(),
    notes: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const date = parsed.data.date || new Date().toISOString().slice(0, 10);

  try {
    let [menu] = await db
      .select()
      .from(dailyMenusTable)
      .where(and(eq(dailyMenusTable.storeId, user.storeId), eq(dailyMenusTable.date, date)))
      .limit(1);

    if (!menu) {
      [menu] = await db.insert(dailyMenusTable).values({
        storeId: user.storeId,
        date,
        notes: parsed.data.notes,
      }).returning();
    } else {
      [menu] = await db.update(dailyMenusTable)
        .set({ notes: parsed.data.notes, updatedAt: new Date() })
        .where(eq(dailyMenusTable.id, menu.id))
        .returning();
    }

    const result = await getMenuWithItems(menu.id, user.storeId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Error al crear menú" });
  }
});

// POST /restaurant/daily-menu/:menuId/items
router.post("/:menuId/items", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const schema = z.object({
    productId: z.string().optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    specialPrice: z.number().positive().optional(),
    notes: z.string().optional(),
    sortOrder: z.number().int().default(0),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const { menuId } = req.params;
  const menu = await getMenuWithItems(menuId, user.storeId);
  if (!menu) { res.status(404).json({ error: "Menú no encontrado" }); return; }

  try {
    const [item] = await db.insert(dailyMenuItemsTable).values({
      menuId,
      storeId: user.storeId,
      productId: parsed.data.productId ?? null,
      name: parsed.data.name,
      description: parsed.data.description,
      specialPrice: parsed.data.specialPrice ? String(parsed.data.specialPrice) : null,
      notes: parsed.data.notes,
      sortOrder: parsed.data.sortOrder,
    }).returning();

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: "Error al agregar item al menú" });
  }
});

// PATCH /restaurant/daily-menu/:menuId/items/:itemId
router.patch("/:menuId/items/:itemId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    specialPrice: z.number().positive().optional().nullable(),
    notes: z.string().optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const { menuId, itemId } = req.params;

  const [item] = await db
    .select()
    .from(dailyMenuItemsTable)
    .where(and(
      eq(dailyMenuItemsTable.id, itemId),
      eq(dailyMenuItemsTable.menuId, menuId),
      eq(dailyMenuItemsTable.storeId, user.storeId),
    ))
    .limit(1);

  if (!item) { res.status(404).json({ error: "Item no encontrado" }); return; }

  const updateData: any = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.specialPrice !== undefined) {
    updateData.specialPrice = parsed.data.specialPrice !== null ? String(parsed.data.specialPrice) : null;
  }

  try {
    const [updated] = await db
      .update(dailyMenuItemsTable)
      .set(updateData)
      .where(eq(dailyMenuItemsTable.id, itemId))
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar item" });
  }
});

// DELETE /restaurant/daily-menu/:menuId/items/:itemId
router.delete("/:menuId/items/:itemId", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const { menuId, itemId } = req.params;

  const [item] = await db
    .select()
    .from(dailyMenuItemsTable)
    .where(and(
      eq(dailyMenuItemsTable.id, itemId),
      eq(dailyMenuItemsTable.menuId, menuId),
      eq(dailyMenuItemsTable.storeId, user.storeId),
    ))
    .limit(1);

  if (!item) { res.status(404).json({ error: "Item no encontrado" }); return; }

  try {
    await db.delete(dailyMenuItemsTable).where(eq(dailyMenuItemsTable.id, itemId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar item" });
  }
});

// POST /restaurant/daily-menu/:menuId/publish
router.post("/:menuId/publish", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) { res.status(400).json({ error: "Sin tienda" }); return; }

  const schema = z.object({ isPublished: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const { menuId } = req.params;
  const menu = await getMenuWithItems(menuId, user.storeId);
  if (!menu) { res.status(404).json({ error: "Menú no encontrado" }); return; }

  try {
    await db.update(dailyMenusTable)
      .set({
        isPublished: parsed.data.isPublished,
        publishedAt: parsed.data.isPublished ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(dailyMenusTable.id, menuId));

    const result = await getMenuWithItems(menuId, user.storeId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Error al publicar menú" });
  }
});

export default router;
