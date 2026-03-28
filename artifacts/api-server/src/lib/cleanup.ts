import { db, sessionsTable } from "@workspace/db";
import { lt } from "drizzle-orm";
import { logger } from "./logger";

export async function cleanExpiredSessions(): Promise<void> {
  try {
    const deleted = await db
      .delete(sessionsTable)
      .where(lt(sessionsTable.expiresAt, new Date()))
      .returning({ id: sessionsTable.id });

    logger.info({ count: deleted.length }, "Cleanup: expired sessions deleted");
  } catch (err) {
    logger.error({ err }, "Cleanup: failed to delete expired sessions");
  }
}
