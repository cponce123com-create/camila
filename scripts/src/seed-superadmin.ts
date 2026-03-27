import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

const email = "admin@camila.pe";
const password = "Camila2025!";

const existing = await db
  .select({ id: usersTable.id })
  .from(usersTable)
  .where(eq(usersTable.email, email))
  .limit(1);

if (existing.length > 0) {
  console.log("Superadmin ya existe:", email);
  process.exit(0);
}

const [user] = await db.insert(usersTable).values({
  id: crypto.randomUUID(),
  storeId: null,
  name: "Superadmin Camila",
  email,
  passwordHash: hashPassword(password),
  role: "superadmin",
  isActive: true,
}).returning({ id: usersTable.id, email: usersTable.email });

console.log("✅ Superadmin creado exitosamente!");
console.log("  Email:", user.email);
console.log("  Contraseña:", password);
console.log("  ID:", user.id);
process.exit(0);
