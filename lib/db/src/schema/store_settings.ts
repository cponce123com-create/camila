import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const catalogViewEnum = pgEnum("catalog_view", [
  "grid",
  "list",
  "featured",
]);

export const storeFontEnum = pgEnum("store_font", [
  "inter",
  "poppins",
  "roboto",
  "playfair",
  "montserrat",
  "nunito",
]);

export const storeTemplateEnum = pgEnum("store_template", [
  "moderna",
  "clasica",
  "minimalista",
  "vibrante",
  "elegante",
]);

export const storeSettingsTable = pgTable("store_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .unique()
    .references(() => storesTable.id, { onDelete: "cascade" }),
  catalogView: catalogViewEnum("catalog_view").default("grid").notNull(),
  font: storeFontEnum("font").default("inter").notNull(),
  template: storeTemplateEnum("template").default("moderna").notNull(),
  secondaryColor: text("secondary_color").default("#f59e0b"),
  showOffers: boolean("show_offers").default(true).notNull(),
  showComments: boolean("show_comments").default(false).notNull(),
  showStock: boolean("show_stock").default(true).notNull(),
  showMenuOfDay: boolean("show_menu_of_day").default(false).notNull(),
  restaurantModule: boolean("restaurant_module").default(false).notNull(),
  showWhatsappButton: boolean("show_whatsapp_button").default(true).notNull(),
  showYapeQr: boolean("show_yape_qr").default(false).notNull(),
  yapeQrUrl: text("yape_qr_url"),
  businessHours: text("business_hours"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertStoreSettingsSchema = createInsertSchema(storeSettingsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertStoreSettings = z.infer<typeof insertStoreSettingsSchema>;
export type StoreSettings = typeof storeSettingsTable.$inferSelect;
