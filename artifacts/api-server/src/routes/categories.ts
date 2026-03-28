import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth, requireStoreAdmin } from "../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  try {
    const allCats = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.storeId, user.storeId))
      .orderBy(categoriesTable.sortOrder, categoriesTable.name);

    // Build tree: parent categories with nested subcategories
    const roots = allCats.filter((c) => !c.parentId);
    const childMap = new Map<string, typeof allCats>();
    for (const cat of allCats) {
      if (cat.parentId) {
        const children = childMap.get(cat.parentId) || [];
        children.push(cat);
        childMap.set(cat.parentId, children);
      }
    }

    const nested = roots.map((root) => ({
      ...root,
      subcategories: childMap.get(root.id) || [],
    }));

    res.json(nested);
  } catch (err) {
    req.log.error({ err }, "Get categories error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  if (!user.storeId) {
    res.status(400).json({ error: "Sin tienda asociada" });
    return;
  }

  const schema = z.object({
    name: z.string().min(1),
    description: z.preprocess(v => v === "" ? undefined : v, z.string().optional()),
    parentId: z.preprocess(v => v === "" ? undefined : v, z.string().optional()),
    imageUrl: z.preprocess(v => v === "" ? undefined : v, z.string().url().optional()),
    sortOrder: z.number().int().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  // Validate parentId belongs to same store
  if (result.data.parentId) {
    const [parent] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.id, result.data.parentId),
          eq(categoriesTable.storeId, user.storeId)
        )
      )
      .limit(1);

    if (!parent) {
      res.status(400).json({ error: "Categoría padre no encontrada" });
      return;
    }
  }

  try {
    const [cat] = await db
      .insert(categoriesTable)
      .values({ ...result.data, storeId: user.storeId })
      .returning();
    res.status(201).json({ ...cat, subcategories: [] });
  } catch (err) {
    req.log.error({ err }, "Create category error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/reorder", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;

  const schema = z.object({
    orderedIds: z.array(z.string()),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  try {
    await Promise.all(
      result.data.orderedIds.map((id, index) =>
        db
          .update(categoriesTable)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(
            and(
              eq(categoriesTable.id, id),
              eq(categoriesTable.storeId, user.storeId!)
            )
          )
      )
    );

    res.json({ success: true, message: "Orden de categorías actualizado" });
  } catch (err) {
    req.log.error({ err }, "Reorder categories error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/:categoryId", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  const { categoryId } = req.params;

  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    parentId: z.string().optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    sortOrder: z.number().int().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  try {
    const [updated] = await db
      .update(categoriesTable)
      .set({ ...result.data, updatedAt: new Date() })
      .where(
        and(
          eq(categoriesTable.id, categoryId),
          eq(categoriesTable.storeId, user.storeId!)
        )
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Categoría no encontrada" });
      return;
    }

    res.json({ ...updated, subcategories: [] });
  } catch (err) {
    req.log.error({ err }, "Update category error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.delete("/:categoryId", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  const { categoryId } = req.params;

  try {
    // Move subcategories to root (clear parentId)
    await db
      .update(categoriesTable)
      .set({ parentId: null, updatedAt: new Date() })
      .where(
        and(
          eq(categoriesTable.parentId, categoryId),
          eq(categoriesTable.storeId, user.storeId!)
        )
      );

    await db
      .delete(categoriesTable)
      .where(
        and(
          eq(categoriesTable.id, categoryId),
          eq(categoriesTable.storeId, user.storeId!)
        )
      );

    res.json({ success: true, message: "Categoría eliminada" });
  } catch (err) {
    req.log.error({ err }, "Delete category error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
