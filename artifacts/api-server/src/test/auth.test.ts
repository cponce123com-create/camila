import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  app,
  uid,
  BASE_REGISTER,
  registerStore,
  loginAs,
  registerAndLogin,
} from "./setup.js";

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  const createdEmails: string[] = [];

  afterAll(async () => {
    for (const email of createdEmails) {
      await db.delete(usersTable).where(eq(usersTable.email, email)).catch(() => {});
    }
  });

  it("registro exitoso — devuelve 201 con user y store", async () => {
    const email = `reg_ok_${uid()}@test-vitest.pe`;
    createdEmails.push(email);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...BASE_REGISTER, email, password: "Test1234!" });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe("store_admin");
    expect(res.body.store).toBeDefined();
    expect(res.body.store.license.status).toBe("trial");

    // El token de sesión NO debe estar en el body
    expect(JSON.stringify(res.body)).not.toContain("camila_session");

    // Debe establecer cookie de sesión
    const cookies = res.headers["set-cookie"] as string[];
    expect(cookies?.some((c) => c.startsWith("camila_session="))).toBe(true);
  });

  it("email duplicado — devuelve 409", async () => {
    const email = `reg_dup_${uid()}@test-vitest.pe`;
    createdEmails.push(email);

    await request(app)
      .post("/api/auth/register")
      .send({ ...BASE_REGISTER, email, password: "Test1234!" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...BASE_REGISTER, email, password: "Test1234!" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeTruthy();
  });

  it("datos inválidos: password sin mayúscula — devuelve 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...BASE_REGISTER, email: `reg_bad_${uid()}@test.pe`, password: "test1234" });

    expect(res.status).toBe(400);
  });

  it("datos inválidos: password sin número — devuelve 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...BASE_REGISTER, email: `reg_bad2_${uid()}@test.pe`, password: "TestAbcd" });

    expect(res.status).toBe(400);
  });

  it("datos inválidos: email malformado — devuelve 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...BASE_REGISTER, email: "no-es-un-email", password: "Test1234!" });

    expect(res.status).toBe(400);
  });

  it("datos inválidos: campos obligatorios faltantes — devuelve 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: `missing_${uid()}@test.pe`, password: "Test1234!" });

    expect(res.status).toBe(400);
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  let email: string;
  const password = "Test1234!";

  beforeAll(async () => {
    const { email: e } = await registerStore();
    email = e;
  });

  it("login exitoso — devuelve 200 con user y cookie de sesión", async () => {
    const { res, cookie } = await loginAs(email, password);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe("store_admin");
    expect(cookie).toMatch(/camila_session=/);

    // El hash de password NO debe estar en el body
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain("resetToken");
  });

  it("contraseña incorrecta — devuelve 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "WrongPass1!" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  it("email inexistente — devuelve 401 (no filtra si existe)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: `noexiste_${uid()}@test.pe`, password: "Test1234!" });

    expect(res.status).toBe(401);
  });

  it("usuario inactivo — devuelve 401", async () => {
    const { email: inactiveEmail } = await registerStore();

    // Desactivar usuario directamente en la DB
    await db
      .update(usersTable)
      .set({ isActive: false })
      .where(eq(usersTable.email, inactiveEmail));

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: inactiveEmail, password });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain("desactivada");

    // Limpiar
    await db.delete(usersTable).where(eq(usersTable.email, inactiveEmail)).catch(() => {});
  });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

describe("POST /api/auth/forgot-password", () => {
  it("siempre devuelve 200 para email existente (no filtra si el email existe)", async () => {
    const { email } = await registerStore();

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBeTruthy();

    // Limpiar
    await db.delete(usersTable).where(eq(usersTable.email, email)).catch(() => {});
  });

  it("siempre devuelve 200 para email inexistente (no filtra si el email existe)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: `noexiste_${uid()}@test.pe` });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("email malformado — devuelve 400", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "no-es-un-email" });

    expect(res.status).toBe(400);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  it("sin sesión — devuelve 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("con sesión válida — devuelve datos del usuario", async () => {
    const { email, cookie } = await registerAndLogin();

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);

    // Limpiar
    await db.delete(usersTable).where(eq(usersTable.email, email)).catch(() => {});
  });
});
