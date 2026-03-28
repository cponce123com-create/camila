import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { sessionsTable, usersTable, storesTable, licensesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

export interface AuthUser {
  id: string;
  storeId: string | null;
  name: string;
  email: string;
  role: "superadmin" | "store_admin" | "store_staff" | "cashier";
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      storeId?: string;
    }
  }
}

export async function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.camila_session;

  if (!token) {
    next();
    return;
  }

  try {
    const [session] = await db
      .select({ id: sessionsTable.id, userId: sessionsTable.userId, userAgent: sessionsTable.userAgent })
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.token, token),
          gt(sessionsTable.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!session) {
      res.clearCookie("camila_session");
      next();
      return;
    }

    const requestUA = req.headers["user-agent"] || null;
    if (session.userAgent && requestUA !== session.userAgent) {
      await db.delete(sessionsTable).where(eq(sessionsTable.id, session.id));
      res.clearCookie("camila_session");
      next();
      return;
    }

    const [user] = await db
      .select({
        id: usersTable.id,
        storeId: usersTable.storeId,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        isActive: usersTable.isActive,
      })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    if (!user || !user.isActive) {
      res.clearCookie("camila_session");
      next();
      return;
    }

    req.user = user as AuthUser;
    req.storeId = user.storeId ?? undefined;
    next();
  } catch (err) {
    req.log?.error({ err }, "Session middleware error");
    next();
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  if (req.user.role !== "superadmin") {
    res.status(403).json({ error: "Acceso denegado. Se requieren permisos de superadmin." });
    return;
  }
  next();
}

export function requireStoreAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  if (req.user.role !== "store_admin" && req.user.role !== "superadmin") {
    res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador de tienda." });
    return;
  }
  next();
}

export async function requireActiveLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  if (req.user.role === "superadmin") {
    next();
    return;
  }
  const storeId = req.user.storeId;
  if (!storeId) {
    res.status(403).json({ error: "Sin tienda asociada" });
    return;
  }
  try {
    const [license] = await db
      .select({ status: licensesTable.status })
      .from(licensesTable)
      .where(eq(licensesTable.storeId, storeId))
      .limit(1);
    if (!license || license.status === "expired" || license.status === "suspended") {
      res.status(403).json({ error: "Licencia inactiva. Contacta a soporte para renovar tu plan." });
      return;
    }
    next();
  } catch (err) {
    req.log?.error({ err }, "requireActiveLicense error");
    next();
  }
}
