import app from "./app";
import { logger } from "./lib/logger";
import { seedDefaultData } from "./lib/seed";
import { cleanExpiredSessions } from "./lib/cleanup";

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

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

seedDefaultData().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");

    // Run once at startup (fire-and-forget)
    cleanExpiredSessions().catch(() => {});

    // Schedule every 24 hours
    setInterval(() => {
      cleanExpiredSessions().catch(() => {});
    }, CLEANUP_INTERVAL_MS);
  });
});
