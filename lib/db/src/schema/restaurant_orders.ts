import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";
import { restaurantTablesTable } from "./restaurant_tables";
import { usersTable } from "./users";

export const orderStatusEnum = pgEnum("order_status", [
  "open",
  "completed",
  "paid",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card",
  "transfer",
  "other",
]);

export const restaurantOrdersTable = pgTable("restaurant_orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }),
  tableId: text("table_id")
    .notNull()
    .references(() => restaurantTablesTable.id, { onDelete: "restrict" }),
  status: orderStatusEnum("status").default("open").notNull(),
  staffUserId: text("staff_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  guestCount: integer("guest_count").default(1),
  notes: text("notes"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).default("0").notNull(),
  discount: numeric("discount", { precision: 10, scale: 2 }).default("0").notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).default("0").notNull(),
  paymentMethod: paymentMethodEnum("payment_method"),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertRestaurantOrderSchema = createInsertSchema(restaurantOrdersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRestaurantOrder = z.infer<typeof insertRestaurantOrderSchema>;
export type RestaurantOrder = typeof restaurantOrdersTable.$inferSelect;
