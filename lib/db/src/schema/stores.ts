import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const businessTypeEnum = pgEnum("business_type", [
  "clothing",
  "restaurant",
  "bakery",
  "fair_booth",
  "general_catalog",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "DNI",
  "RUC10",
  "RUC20",
]);

export const storesTable = pgTable("stores", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text("slug").unique(),
  businessName: text("business_name").notNull(),
  businessType: businessTypeEnum("business_type").notNull(),
  documentType: documentTypeEnum("document_type").notNull(),
  documentNumber: text("document_number").notNull(),
  ownerName: text("owner_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().unique(),
  address: text("address"),
  district: text("district").notNull(),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  primaryColor: text("primary_color").default("#1a5c2e"),
  description: text("description"),
  whatsapp: text("whatsapp"),
  socialInstagram: text("social_instagram"),
  socialFacebook: text("social_facebook"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("stores_created_at_idx").on(t.createdAt),
  index("stores_is_active_idx").on(t.isActive),
  index("stores_business_type_idx").on(t.businessType),
  uniqueIndex("stores_slug_idx").on(t.slug),
]);

export const insertStoreSchema = createInsertSchema(storesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof storesTable.$inferSelect;
