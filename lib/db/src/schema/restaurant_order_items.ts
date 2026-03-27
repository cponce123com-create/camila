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
import { restaurantOrdersTable } from "./restaurant_orders";
import { productsTable } from "./products";

export const orderItemStatusEnum = pgEnum("order_item_status", [
  "pending",
  "preparing",
  "served",
  "cancelled",
]);

export const restaurantOrderItemsTable = pgTable("restaurant_order_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id")
    .notNull()
    .references(() => restaurantOrdersTable.id, { onDelete: "cascade" }),
  storeId: text("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => productsTable.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  status: orderItemStatusEnum("status").default("pending").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertRestaurantOrderItemSchema = createInsertSchema(restaurantOrderItemsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRestaurantOrderItem = z.infer<typeof insertRestaurantOrderItemSchema>;
export type RestaurantOrderItem = typeof restaurantOrderItemsTable.$inferSelect;
