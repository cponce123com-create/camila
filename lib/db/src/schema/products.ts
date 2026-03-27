import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";
import { categoriesTable } from "./categories";

export const productsTable = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categoriesTable.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  description: text("description"),
  longDescription: text("long_description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }),
  saleStartDate: timestamp("sale_start_date", { withTimezone: true }),
  saleEndDate: timestamp("sale_end_date", { withTimezone: true }),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
  sku: text("sku"),
  barcode: text("barcode"),
  imageUrl: text("image_url"),
  stock: integer("stock").default(0).notNull(),
  minStock: integer("min_stock").default(0).notNull(),
  unit: text("unit").default("unidad"),
  isActive: boolean("is_active").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  soldOut: boolean("sold_out").default(false).notNull(),
  tags: text("tags").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
