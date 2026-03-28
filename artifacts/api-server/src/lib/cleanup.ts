import { db, sessionsTable, licensesTable, usersTable, storesTable } from "@workspace/db";
import { lt, and, gte, lte, inArray, or, isNull, sql } from "drizzle-orm";
import { logger } from "./logger";
import { sendLicenseExpiringEmail } from "./email";

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

export async function notifyExpiringLicenses(): Promise<void> {
  try {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find licenses expiring within 3 days that haven't been notified in the last 24h
    const expiringLicenses = await db
      .select({
        id: licensesTable.id,
        storeId: licensesTable.storeId,
        expiresAt: licensesTable.expiresAt,
      })
      .from(licensesTable)
      .where(
        and(
          inArray(licensesTable.status, ["active", "trial"]),
          gte(licensesTable.expiresAt, now),
          lte(licensesTable.expiresAt, in3Days),
          or(
            isNull(licensesTable.lastExpiryNoticeSentAt),
            lt(licensesTable.lastExpiryNoticeSentAt, cutoff24h),
          ),
        ),
      );

    if (expiringLicenses.length === 0) {
      logger.info("Notify: no expiring licenses to notify");
      return;
    }

    logger.info({ count: expiringLicenses.length }, "Notify: expiring licenses found");

    for (const license of expiringLicenses) {
      try {
        // Get store name + the store_admin email
        const [storeRow] = await db
          .select({ businessName: storesTable.businessName })
          .from(storesTable)
          .where(sql`${storesTable.id} = ${license.storeId}`)
          .limit(1);

        const [adminUser] = await db
          .select({ email: usersTable.email, name: usersTable.name })
          .from(usersTable)
          .where(
            and(
              sql`${usersTable.storeId} = ${license.storeId}`,
              sql`${usersTable.role} = 'store_admin'`,
              sql`${usersTable.isActive} = true`,
            ),
          )
          .limit(1);

        if (!storeRow || !adminUser || !license.expiresAt) {
          logger.warn({ licenseId: license.id }, "Notify: skipping license — missing store/user/expiresAt");
          continue;
        }

        await sendLicenseExpiringEmail(adminUser.email, storeRow.businessName, license.expiresAt);

        // Mark notice sent
        await db
          .update(licensesTable)
          .set({ lastExpiryNoticeSentAt: now })
          .where(sql`${licensesTable.id} = ${license.id}`);

        logger.info(
          { licenseId: license.id, to: adminUser.email, businessName: storeRow.businessName },
          "Notify: expiry notice sent",
        );
      } catch (innerErr) {
        logger.error({ err: innerErr, licenseId: license.id }, "Notify: failed to notify for license");
      }
    }
  } catch (err) {
    logger.error({ err }, "Notify: failed to run notifyExpiringLicenses");
  }
}
