import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { storesTable } from "./stores";

export const clientsTable = pgTable("clients", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Client = typeof clientsTable.$inferSelect;
export type NewClient = typeof clientsTable.$inferInsert;
