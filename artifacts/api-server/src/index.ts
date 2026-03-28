import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
  });
}

import app from "./app";
import { logger } from "./lib/logger";
import { seedDefaultData } from "./lib/seed";
import { cleanExpiredSessions, notifyExpiringLicenses } from "./lib/cleanup";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;  // 24 hours
const NOTIFY_INTERVAL_MS  = 12 * 60 * 60 * 1000;  // 12 hours

seedDefaultData().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");

    // Session cleanup — once at startup, then every 24 h
    cleanExpiredSessions().catch(() => {});
    setInterval(() => {
      cleanExpiredSessions().catch(() => {});
    }, CLEANUP_INTERVAL_MS);

    // Expiry notifications — once at startup, then every 12 h
    notifyExpiringLicenses().catch(() => {});
    setInterval(() => {
      notifyExpiringLicenses().catch(() => {});
    }, NOTIFY_INTERVAL_MS);
  });
});
