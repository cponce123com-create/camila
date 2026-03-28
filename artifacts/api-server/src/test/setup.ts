import { afterAll } from "vitest";
import request, { type Response } from "supertest";
import app from "../app.js";
import { pool } from "@workspace/db";

export { app };

export function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export const BASE_REGISTER = {
  businessName: "Tienda Vitest",
  businessType: "general_catalog",
  documentType: "DNI",
  documentNumber: "12345678",
  ownerName: "Test Owner",
  phone: "999000111",
  district: "San Ramón",
};

export interface RegisterResult {
  email: string;
  password: string;
  res: Response;
  storeId?: string;
}

export async function registerStore(
  overrides: Record<string, unknown> = {}
): Promise<RegisterResult> {
  const email = (overrides.email as string) ?? `vitest_${uid()}@test-vitest.pe`;
  const password = (overrides.password as string) ?? "Test1234!";

  const res = await request(app)
    .post("/api/auth/register")
    .send({ ...BASE_REGISTER, email, password, ...overrides });

  const storeId = res.body?.store?.id as string | undefined;
  return { email, password, res, storeId };
}

export interface LoginResult {
  res: Response;
  cookie: string;
}

export async function loginAs(
  email: string,
  password: string
): Promise<LoginResult> {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  const raw = res.headers["set-cookie"] as string | string[] | undefined;
  const rawFirst = Array.isArray(raw) ? raw[0] : (raw ?? "");
  // Extract only "name=value" — Cookie request header must not include attributes
  const cookie = rawFirst.split(";")[0] ?? "";
  return { res, cookie };
}

export async function registerAndLogin(
  overrides: Record<string, unknown> = {}
): Promise<{ email: string; password: string; cookie: string; storeId?: string }> {
  const { email, password, storeId } = await registerStore(overrides);
  const { cookie } = await loginAs(email, password);
  return { email, password, cookie, storeId };
}

afterAll(async () => {
  await pool.end().catch(() => {});
});
