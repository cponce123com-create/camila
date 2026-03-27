import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { supportTicketsTable, storesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

router.post("/", requireAuth, async (req, res) => {
  const schema = z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: "Datos inválidos" }); return; }

  try {
    const storeId = req.user?.storeId ?? null;
    let storeName: string | null = null;
    if (storeId) {
      const [store] = await db
        .select({ businessName: storesTable.businessName })
        .from(storesTable)
        .where(eq(storesTable.id, storeId))
        .limit(1);
      storeName = store?.businessName ?? null;
    }

    const userId = req.user?.id;
    let requesterName: string | null = null;
    let requesterEmail: string | null = null;
    if (userId) {
      const [user] = await db
        .select({ name: usersTable.name, email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      requesterName = user?.name ?? null;
      requesterEmail = user?.email ?? null;
    }

    const [ticket] = await db
      .insert(supportTicketsTable)
      .values({
        storeId: storeId ?? undefined,
        storeName: storeName ?? undefined,
        requesterName: requesterName ?? undefined,
        requesterEmail: requesterEmail ?? undefined,
        subject: result.data.subject,
        body: result.data.body,
        priority: result.data.priority ?? "medium",
      })
      .returning();

    res.status(201).json(ticket);
  } catch (err) {
    req.log.error({ err }, "Create support ticket error");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
