import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";
import { dailyMenusTable } from "./daily_menus";
import { productsTable } from "./products";

export const dailyMenuItemsTable = pgTable("daily_menu_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  menuId: text("menu_id")
    .notNull()
    .references(() => dailyMenusTable.id, { onDelete: "cascade" }),
  storeId: text("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => productsTable.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  description: text("description"),
  specialPrice: numeric("special_price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertDailyMenuItemSchema = createInsertSchema(dailyMenuItemsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDailyMenuItem = z.infer<typeof insertDailyMenuItemSchema>;
export type DailyMenuItem = typeof dailyMenuItemsTable.$inferSelect;
