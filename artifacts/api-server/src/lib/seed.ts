import { db } from "@workspace/db";
import {
  usersTable,
  storesTable,
  licensesTable,
} from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { hashPassword } from "./auth";
import { generateUniqueSlug } from "./slug";
import { logger } from "./logger";

export async function seedDefaultData() {
  try {
    // ── 1. Superadmin user ──────────────────────────────────────────────────
    const [existingAdmin] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, "admin@camila.pe"))
      .limit(1);

    if (!existingAdmin) {
      await db.insert(usersTable).values({
        id: crypto.randomUUID(),
        email: "admin@camila.pe",
        passwordHash: hashPassword("Camila2025!"),
        name: "Administrador Camila",
        role: "superadmin",
        isActive: true,
      });
      logger.info("Seed: superadmin user created (admin@camila.pe)");
    }

    // ── 2. Test store + user ────────────────────────────────────────────────
    const [existingStoreUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, "tienda@test.pe"))
      .limit(1);

    if (!existingStoreUser) {
      const storeId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      const licenseId = crypto.randomUUID();
      const slug = await generateUniqueSlug("Tienda Demo Camila");

      await db.insert(storesTable).values({
        id: storeId,
        slug,
        businessName: "Tienda Demo Camila",
        businessType: "general_catalog",
        documentType: "DNI",
        documentNumber: "12345678",
        ownerName: "Demo Emprendedor",
        phone: "999000001",
        email: "tienda@test.pe",
        district: "San Ramón",
        address: "Jr. Comercio 123",
        description: "Tienda de demostración para probar la plataforma Camila.",
        primaryColor: "#1a5c2e",
        isActive: true,
      });

      await db.insert(usersTable).values({
        id: userId,
        storeId,
        email: "tienda@test.pe",
        passwordHash: hashPassword("Test1234!"),
        name: "Demo Emprendedor",
        role: "store_admin",
        isActive: true,
      });

      const trialExpiry = new Date();
      trialExpiry.setDate(trialExpiry.getDate() + 30);

      await db.insert(licensesTable).values({
        id: licenseId,
        storeId,
        plan: "trial",
        status: "trial",
        expiresAt: trialExpiry,
      });

      logger.info({ slug }, "Seed: test store created (tienda@test.pe)");
    }
  } catch (err) {
    logger.error({ err }, "Seed error — skipping seed");
  }
}
