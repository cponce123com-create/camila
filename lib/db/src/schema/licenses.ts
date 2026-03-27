import {
  pgTable,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const licenseStatusEnum = pgEnum("license_status", [
  "trial",
  "active",
  "expired",
  "suspended",
]);

export const licensesTable = pgTable("licenses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .unique()
    .references(() => storesTable.id, { onDelete: "cascade" }),
  status: licenseStatusEnum("status").default("trial").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertLicenseSchema = createInsertSchema(licensesTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertLicense = z.infer<typeof insertLicenseSchema>;
export type License = typeof licensesTable.$inferSelect;
