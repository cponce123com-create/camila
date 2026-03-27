import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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
    const cats = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.storeId, user.storeId))
      .orderBy(categoriesTable.sortOrder, categoriesTable.name);

    res.json(cats);
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
    description: z.string().optional(),
    sortOrder: z.number().int().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", details: result.error.flatten() });
    return;
  }

  try {
    const [cat] = await db
      .insert(categoriesTable)
      .values({ ...result.data, storeId: user.storeId })
      .returning();
    res.status(201).json(cat);
  } catch (err) {
    req.log.error({ err }, "Create category error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/:categoryId", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  const { categoryId } = req.params;

  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
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

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Update category error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.delete("/:categoryId", requireAuth, requireStoreAdmin, async (req, res) => {
  const user = req.user!;
  const { categoryId } = req.params;

  try {
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
