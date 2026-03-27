import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { storesTable } from "./stores";
import { licensesTable } from "./licenses";

export const licenseHistoryTable = pgTable("license_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }),
  licenseId: text("license_id")
    .references(() => licensesTable.id, { onDelete: "set null" }),
  actorId: text("actor_id"),
  actorEmail: text("actor_email"),
  prevStatus: text("prev_status"),
  newStatus: text("new_status"),
  prevPlan: text("prev_plan"),
  newPlan: text("new_plan"),
  prevExpiresAt: timestamp("prev_expires_at", { withTimezone: true }),
  newExpiresAt: timestamp("new_expires_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type LicenseHistory = typeof licenseHistoryTable.$inferSelect;
