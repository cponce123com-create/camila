import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

export const announcementTypeEnum = pgEnum("announcement_type", [
  "info",
  "warning",
  "success",
  "maintenance",
]);

export const announcementsTable = pgTable("announcements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: announcementTypeEnum("type").default("info").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  targetAll: boolean("target_all").default(true).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Announcement = typeof announcementsTable.$inferSelect;
