/**
 * Centralized cookie configuration for session tokens.
 * Both login (auth.ts) and rolling-session renewal (session.ts) must use this.
 */

export const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-camila_session"
    : "camila_session";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export { SESSION_DURATION_MS };

export function buildCookieOpts(expiresAt: Date) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict" as const,
    path: "/",
    expires: expiresAt,
  };
}

export function buildRollingCookieOpts() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_DURATION_MS,
  };
}
