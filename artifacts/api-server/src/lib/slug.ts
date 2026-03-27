import { db } from "@workspace/db";
import { storesTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";

export function toSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 55);
}

export async function generateUniqueSlug(
  base: string,
  excludeStoreId?: string
): Promise<string> {
  const slug = toSlug(base) || "tienda";
  let candidate = slug;
  let attempt = 0;

  while (true) {
    const filters = excludeStoreId
      ? and(eq(storesTable.slug, candidate), ne(storesTable.id, excludeStoreId))
      : eq(storesTable.slug, candidate);

    const [existing] = await db
      .select({ id: storesTable.id })
      .from(storesTable)
      .where(filters)
      .limit(1);

    if (!existing) return candidate;
    attempt++;
    candidate = `${slug}-${attempt}`;
  }
}
