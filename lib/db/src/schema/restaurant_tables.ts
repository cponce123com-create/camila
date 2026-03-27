import {
  pgTable,
  text,
  timestamp,
  integer,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const tableStatusEnum = pgEnum("table_status", [
  "free",
  "occupied",
  "to_pay",
  "closed",
]);

export const restaurantTablesTable = pgTable("restaurant_tables", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  zone: text("zone"),
  capacity: integer("capacity").default(4),
  status: tableStatusEnum("status").default("free").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertRestaurantTableSchema = createInsertSchema(restaurantTablesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRestaurantTable = z.infer<typeof insertRestaurantTableSchema>;
export type RestaurantTable = typeof restaurantTablesTable.$inferSelect;
