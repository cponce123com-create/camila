import {
  pgTable,
  text,
  timestamp,
  numeric,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { storesTable } from "./stores";
import { salesTable } from "./sales";
import { productsTable } from "./products";

export const saleItemsTable = pgTable("sale_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  saleId: text("sale_id")
    .notNull()
    .references(() => salesTable.id, { onDelete: "cascade" }),
  storeId: text("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  productSku: text("product_sku"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).default("0").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).default("0").notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("sale_items_sale_id_idx").on(t.saleId),
  index("sale_items_store_id_idx").on(t.storeId),
  index("sale_items_product_id_idx").on(t.productId),
]);

export type SaleItem = typeof saleItemsTable.$inferSelect;
export type NewSaleItem = typeof saleItemsTable.$inferInsert;
