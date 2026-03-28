import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { storesTable } from "./stores";
import { usersTable } from "./users";
import { licensePlanEnum } from "./licenses";

export const licenseCodesTable = pgTable("license_codes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(),
  plan: licensePlanEnum("plan").notNull(),
  durationDays: integer("duration_days").notNull(),
  maxUses: integer("max_uses").default(1).notNull(),
  usedCount: integer("used_count").default(0).notNull(),
  usedByStoreId: text("used_by_store_id").references(() => storesTable.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdByAdminId: text("created_by_admin_id").references(() => usersTable.id, { onDelete: "set null" }),
  notes: text("notes"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type LicenseCode = typeof licenseCodesTable.$inferSelect;
