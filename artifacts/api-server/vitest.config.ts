import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    pool: "forks",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || "",
    },
  },
  resolve: {
    alias: {
      "@workspace/db": path.resolve(
        __dirname,
        "../../lib/db/src/index.ts"
      ),
      "@workspace/api-zod": path.resolve(
        __dirname,
        "../../lib/api-zod/src/index.ts"
      ),
    },
  },
});
