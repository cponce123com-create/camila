import {
  pgTable,
  text,
  timestamp,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const dailyMenusTable = pgTable("daily_menus", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  notes: text("notes"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertDailyMenuSchema = createInsertSchema(dailyMenusTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDailyMenu = z.infer<typeof insertDailyMenuSchema>;
export type DailyMenu = typeof dailyMenusTable.$inferSelect;
