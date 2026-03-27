import {
  pgTable,
  text,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";
import { productsTable } from "./products";
import { productVariantsTable } from "./product_variants";
import { usersTable } from "./users";

export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "in",
  "out",
  "adjustment",
]);

export const inventoryMovementsTable = pgTable("inventory_movements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  variantId: text("variant_id").references(() => productVariantsTable.id, {
    onDelete: "set null",
  }),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  type: inventoryMovementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertInventoryMovementSchema = createInsertSchema(inventoryMovementsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
export type InventoryMovement = typeof inventoryMovementsTable.$inferSelect;
