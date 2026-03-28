import { lt, or, and, eq } from "drizzle-orm";

/**
 * Cursor-based pagination utilities.
 * Cursor = base64url(JSON({ createdAt: ISO8601, id: string }))
 * Pairs with ORDER BY createdAt DESC, id DESC for consistent results.
 */

export interface CursorPayload {
  createdAt: string; // ISO 8601
  id: string;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeCursor(encoded: string): CursorPayload | null {
  try {
    const obj = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (typeof obj.createdAt !== "string" || typeof obj.id !== "string") return null;
    return obj as CursorPayload;
  } catch {
    return null;
  }
}

/**
 * Build WHERE condition for cursor-DESC pagination.
 * Produces: (col_date < cursorDate) OR (col_date = cursorDate AND col_id < cursorId)
 */
export function buildCursorCondition(
  cursor: CursorPayload,
  dateCol: Parameters<typeof lt>[0],
  idCol: Parameters<typeof lt>[0],
) {
  const cursorDate = new Date(cursor.createdAt);
  return or(
    lt(dateCol, cursorDate),
    and(eq(dateCol, cursorDate), lt(idCol, cursor.id))
  );
}
