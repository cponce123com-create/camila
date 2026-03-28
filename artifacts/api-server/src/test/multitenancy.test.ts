import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import {
  db,
  usersTable,
  storesTable,
  sessionsTable,
  licensesTable,
  productsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { hashPassword } from "../lib/auth.js";
import { app, uid, registerAndLogin } from "./setup.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function createProduct(cookie: string, name = `Prod ${uid()}`) {
  return request(app)
    .post("/api/products")
    .set("Cookie", cookie)
    .send({ name, price: 10.0 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-tenancy: store isolation
// ─────────────────────────────────────────────────────────────────────────────

describe("Multi-tenancy: aislamiento de datos por store", () => {
  let cookieA: string;
  let cookieB: string;
  let storeAProductId: string;
  let emailA: string;
  let emailB: string;

  beforeAll(async () => {
    // Register and login two independent stores
    const storeA = await registerAndLogin({ businessName: "Store A Vitest" });
    cookieA = storeA.cookie;
    emailA = storeA.email;

    const storeB = await registerAndLogin({ businessName: "Store B Vitest" });
    cookieB = storeB.cookie;
    emailB = storeB.email;

    // Store A creates a product
    const prodRes = await createProduct(cookieA, `Producto Store A ${uid()}`);
    expect(prodRes.status).toBe(201);
    storeAProductId = prodRes.body.id;
  });

  afterAll(async () => {
    for (const email of [emailA, emailB]) {
      const [user] = await db
        .select({ id: usersTable.id, storeId: usersTable.storeId })
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (user) {
        if (user.storeId) {
          await db.delete(productsTable).where(eq(productsTable.storeId, user.storeId)).catch(() => {});
          await db.delete(licensesTable).where(eq(licensesTable.storeId, user.storeId)).catch(() => {});
        }
        await db.delete(sessionsTable).where(eq(sessionsTable.userId, user.id)).catch(() => {});
        await db.delete(usersTable).where(eq(usersTable.id, user.id)).catch(() => {});
        if (user.storeId) {
          await db.delete(storesTable).where(eq(storesTable.id, user.storeId)).catch(() => {});
        }
      }
    }
  });

  it("store_admin NO puede ver productos de otra tienda — GET /api/products solo devuelve los propios", async () => {
    // Store B requests products — must NOT see Store A's product
    const res = await request(app)
      .get("/api/products")
      .set("Cookie", cookieB);

    expect(res.status).toBe(200);

    // GET /api/products returns { data: [...], total, page, limit, totalPages }
    const items = res.body.data ?? [];
    const ids = Array.isArray(items) ? items.map((p: any) => p.id) : [];

    expect(ids).not.toContain(storeAProductId);
  });

  it("store_admin NO puede eliminar productos de otra tienda — DELETE devuelve 404", async () => {
    // Store B tries to delete Store A's product
    const res = await request(app)
      .delete(`/api/products/${storeAProductId}`)
      .set("Cookie", cookieB);

    // Product belongs to Store A → not found for Store B
    expect(res.status).toBe(404);
  });

  it("store_admin NO puede actualizar productos de otra tienda — PATCH devuelve 404", async () => {
    const res = await request(app)
      .patch(`/api/products/${storeAProductId}`)
      .set("Cookie", cookieB)
      .send({ name: "Hacked!" });

    expect(res.status).toBe(404);
  });

  it("sin autenticación NO puede acceder a productos — GET /api/products devuelve 401", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(401);
  });

  it("store_admin SÍ puede ver sus propios productos — GET /api/products devuelve el producto creado", async () => {
    const res = await request(app)
      .get("/api/products")
      .set("Cookie", cookieA);

    expect(res.status).toBe(200);
    const items = res.body.data ?? [];
    const ids = Array.isArray(items) ? items.map((p: any) => p.id) : [];
    expect(ids).toContain(storeAProductId);
  });

  it("store_admin SÍ puede eliminar sus propios productos — DELETE devuelve 200 o 204", async () => {
    // Create a throwaway product for Store A
    const prod = await createProduct(cookieA, `Temp Product ${uid()}`);
    expect(prod.status).toBe(201);
    const tempId = prod.body.id;

    const res = await request(app)
      .delete(`/api/products/${tempId}`)
      .set("Cookie", cookieA);

    expect([200, 204]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Multi-tenancy: superadmin can see all stores
// ─────────────────────────────────────────────────────────────────────────────

describe("Multi-tenancy: superadmin puede ver todas las tiendas", () => {
  const superEmail = `superadmin_vitest_${uid()}@test-vitest.pe`;
  const superPassword = "SuperAdmin1!";
  let superCookie: string;

  // Track stores created in this suite for cleanup
  const suiteStoreEmails: string[] = [];

  beforeAll(async () => {
    // Create a dedicated superadmin user directly via DB (no public API for this)
    const passwordHash = hashPassword(superPassword);
    await db.insert(usersTable).values({
      id: crypto.randomUUID(),
      storeId: null,
      name: "Superadmin Vitest",
      email: superEmail,
      passwordHash,
      role: "superadmin",
    });

    const { cookie } = await loginAs(superEmail, superPassword);
    superCookie = cookie;

    // Create a couple of test stores
    for (let i = 0; i < 2; i++) {
      const { email } = await registerAndLogin({ businessName: `SA Test Store ${i}` });
      suiteStoreEmails.push(email);
    }
  });

  afterAll(async () => {
    // Clean up test stores
    for (const email of suiteStoreEmails) {
      const [user] = await db
        .select({ id: usersTable.id, storeId: usersTable.storeId })
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (user) {
        if (user.storeId) {
          await db.delete(licensesTable).where(eq(licensesTable.storeId, user.storeId)).catch(() => {});
        }
        await db.delete(sessionsTable).where(eq(sessionsTable.userId, user.id)).catch(() => {});
        await db.delete(usersTable).where(eq(usersTable.id, user.id)).catch(() => {});
        if (user.storeId) {
          await db.delete(storesTable).where(eq(storesTable.id, user.storeId)).catch(() => {});
        }
      }
    }
    // Clean up superadmin user
    await db.delete(usersTable).where(eq(usersTable.email, superEmail)).catch(() => {});
  });

  it("superadmin SÍ puede listar todas las tiendas — GET /api/admin/stores devuelve 200", async () => {
    const res = await request(app)
      .get("/api/admin/stores")
      .set("Cookie", superCookie);

    expect(res.status).toBe(200);

    // GET /api/admin/stores returns { data: [...], total, page, limit, totalPages }
    const stores = res.body.data ?? res.body.stores ?? res.body;
    expect(Array.isArray(stores)).toBe(true);
    expect(stores.length).toBeGreaterThanOrEqual(2);
  });

  it("store_admin NO puede acceder a /api/admin/stores — devuelve 403", async () => {
    const { cookie, email } = await registerAndLogin({ businessName: "Store Forbidden" });

    const res = await request(app)
      .get("/api/admin/stores")
      .set("Cookie", cookie);

    expect(res.status).toBe(403);

    // Cleanup
    await db.delete(usersTable).where(eq(usersTable.email, email)).catch(() => {});
  });

  it("sin autenticación NO puede acceder a /api/admin/stores — devuelve 401", async () => {
    const res = await request(app).get("/api/admin/stores");
    expect(res.status).toBe(401);
  });
});

// Re-export loginAs for use in this file
async function loginAs(email: string, password: string) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  const raw = res.headers["set-cookie"] as string | string[] | undefined;
  const rawFirst = Array.isArray(raw) ? raw[0] : (raw ?? "");
  const cookie = rawFirst.split(";")[0] ?? "";
  return { res, cookie };
}
