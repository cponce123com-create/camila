import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import helmet from "helmet";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import * as Sentry from "@sentry/node";
import router from "./routes";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./middlewares/session";

const app: Express = express();

// Trust the first proxy (Replit / reverse proxy layers)
app.set("trust proxy", 1);

// ─── Compression ────────────────────────────────────────────────────────────
app.use(compression());

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

// ─── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.NODE_ENV === "production"
  ? (() => {
      const origins = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];
      if (origins.length === 0) throw new Error("ALLOWED_ORIGINS is required in production");
      return origins;
    })()
  : true;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: "Límite de solicitudes alcanzado. Intenta más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    process.env.NODE_ENV !== "production" ||
    req.originalUrl.includes("/payments/webhook"),
});

const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Demasiadas reseñas. Intenta más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Raw body for Culqi webhook (must come before express.json) ───────────────
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

// ─── Request Logging ─────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(sessionMiddleware);

// ─── Reviews rate limiter ─────────────────────────────────────────────────────
app.use("/api/public/stores/:slug/reviews", reviewLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api", apiLimiter);
app.use("/api", router);

// ─── Sentry error handler (must come after routes) ───────────────────────────
Sentry.setupExpressErrorHandler(app);

export default app;
