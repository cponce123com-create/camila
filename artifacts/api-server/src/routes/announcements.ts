import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { announcementsTable } from "@workspace/db";
import { and, eq, or, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const now = new Date();
    const items = await db
      .select()
      .from(announcementsTable)
      .where(
        and(
          eq(announcementsTable.isActive, true),
          or(
            sql`${announcementsTable.expiresAt} IS NULL`,
            sql`${announcementsTable.expiresAt} > ${now}`
          )
        )
      );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── GET /active — authenticated, for dashboard banners ──────────────────────
router.get("/active", requireAuth, async (_req, res) => {
  try {
    const now = new Date();
    const items = await db
      .select()
      .from(announcementsTable)
      .where(
        and(
          eq(announcementsTable.isActive, true),
          or(
            sql`${announcementsTable.expiresAt} IS NULL`,
            sql`${announcementsTable.expiresAt} > ${now}`
          ),
          or(
            sql`${announcementsTable.startsAt} IS NULL`,
            sql`${announcementsTable.startsAt} <= ${now}`
          )
        )
      )
      .orderBy(desc(announcementsTable.createdAt))
      .limit(5);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
