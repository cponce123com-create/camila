import {
  pgTable,
  text,
  timestamp,
  numeric,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { storesTable } from "./stores";
import { usersTable } from "./users";
import { clientsTable } from "./clients";
import { paymentMethodEnum } from "./restaurant_orders";

export const saleStatusEnum = pgEnum("sale_status", [
  "open", "paid", "cancelled", "refunded",
]);

export const salesTable = pgTable("sales", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }),
  receiptCode: text("receipt_code").notNull(),
  clientId: text("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  clientName: text("client_name"),
  clientPhone: text("client_phone"),
  staffUserId: text("staff_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  status: saleStatusEnum("status").default("paid").notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).default("0").notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  tax: numeric("tax", { precision: 12, scale: 2 }).default("0").notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).default("0").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").default("cash").notNull(),
  notes: text("notes"),
  soldAt: timestamp("sold_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("sales_store_id_idx").on(t.storeId),
  index("sales_store_id_created_at_idx").on(t.storeId, t.createdAt),
  index("sales_status_idx").on(t.status),
  index("sales_store_id_status_idx").on(t.storeId, t.status),
]);

export type Sale = typeof salesTable.$inferSelect;
export type NewSale = typeof salesTable.$inferInsert;
