import { pgTable, text, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { storesTable } from "./stores";

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const supportTicketsTable = pgTable("support_tickets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .references(() => storesTable.id, { onDelete: "cascade" }),
  storeName: text("store_name"),
  requesterName: text("requester_name"),
  requesterEmail: text("requester_email"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: ticketStatusEnum("status").default("open").notNull(),
  priority: ticketPriorityEnum("priority").default("medium").notNull(),
  assignedTo: text("assigned_to"),
  responses: jsonb("responses").$type<{ author: string; body: string; createdAt: string }[]>().default([]),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SupportTicket = typeof supportTicketsTable.$inferSelect;
