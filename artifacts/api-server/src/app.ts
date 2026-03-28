import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import helmet from "helmet";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import * as Sentry from "@sentry/node";
import swaggerUi from "swagger-ui-express";
import router from "./routes";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./middlewares/session";

const app: Express = express();

// Trust the first proxy only in production (avoids X-Forwarded-For spoofing in dev)
app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);

// ─── Compression ────────────────────────────────────────────────────────────
app.use(compression());

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.culqi.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://picsum.photos"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.culqi.com", "https://*.sentry.io"],
        frameSrc: ["'self'", "https://cdn.culqi.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
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

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Demasiadas subidas. Intenta más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  keyGenerator: (req) => (req as any).user?.id ?? "unauthenticated",
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
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie", "req.body.password", "req.body.token"],
      censor: "[REDACTED]",
    },
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

// ─── Targeted rate limiters ───────────────────────────────────────────────────
app.use("/api/public/stores/:slug/reviews", reviewLimiter);
app.use("/api/uploads", uploadLimiter);

// ─── Swagger UI (available at /api/docs in all environments) ────────────────
const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Camila API",
    version: "1.0.0",
    description: "API REST para la plataforma SaaS Camila — gestión de tiendas locales en San Ramón, Perú.",
    contact: { name: "Equipo Camila", email: "admin@camila.pe" },
  },
  servers: [{ url: "/api", description: "API base path" }],
  tags: [
    { name: "auth", description: "Autenticación y sesiones" },
    { name: "products", description: "Gestión de productos" },
    { name: "sales", description: "Gestión de ventas" },
    { name: "clients", description: "Clientes" },
    { name: "inventory", description: "Inventario" },
    { name: "analytics", description: "Analíticas y reportes" },
    { name: "public", description: "Endpoints públicos (tiendas, productos sin auth)" },
    { name: "admin", description: "Panel superadmin" },
    { name: "uploads", description: "Subida de archivos" },
    { name: "payments", description: "Pagos con Culqi" },
    { name: "settings", description: "Configuración de tienda" },
    { name: "notifications", description: "Notificaciones de licencia" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "camila_session" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
      Pagination: {
        type: "object",
        properties: {
          total: { type: "integer" },
          page: { type: "integer" },
          limit: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      CursorPagination: {
        type: "object",
        properties: {
          nextCursor: { type: "string", nullable: true },
          hasMore: { type: "boolean" },
        },
      },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    "/auth/login": {
      post: {
        tags: ["auth"], summary: "Iniciar sesión",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string" } } } } },
        },
        responses: { "200": { description: "Sesión iniciada; cookie de sesión establecida" }, "400": { description: "Credenciales inválidas" } },
      },
    },
    "/auth/logout": {
      post: { tags: ["auth"], summary: "Cerrar sesión", responses: { "200": { description: "Sesión eliminada" } } },
    },
    "/auth/me": {
      get: { tags: ["auth"], summary: "Usuario actual", responses: { "200": { description: "Datos del usuario autenticado" }, "401": { description: "No autenticado" } } },
    },
    "/auth/register": {
      post: { tags: ["auth"], summary: "Registrar nueva tienda", responses: { "201": { description: "Tienda y usuario creados" } } },
    },
    "/products": {
      get: {
        tags: ["products"], summary: "Listar productos",
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string" }, description: "Cursor para paginación (base64url JSON). Alternativa a page." },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "categoryId", in: "query", schema: { type: "string" } },
          { name: "lowStock", in: "query", schema: { type: "boolean" } },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["name", "price", "stock", "createdAt"] } },
          { name: "sortDir", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
        ],
        responses: { "200": { description: "Lista de productos con paginación" } },
      },
      post: { tags: ["products"], summary: "Crear producto", responses: { "201": { description: "Producto creado" } } },
    },
    "/sales": {
      get: {
        tags: ["sales"], summary: "Listar ventas",
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string" }, description: "Cursor para paginación" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["paid", "pending", "cancelled", "refunded"] } },
          { name: "paymentMethod", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Lista de ventas con totales del día" } },
      },
      post: { tags: ["sales"], summary: "Registrar venta", responses: { "201": { description: "Venta registrada" } } },
    },
    "/public/stores/{slug}": {
      get: {
        tags: ["public"], summary: "Obtener tienda pública por slug (cacheada 60s)",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Datos públicos de la tienda" }, "404": { description: "Tienda no encontrada" } },
      },
    },
    "/public/stores/{slug}/products": {
      get: {
        tags: ["public"], summary: "Productos públicos de una tienda",
        parameters: [
          { name: "slug", in: "path", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "categoryId", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Lista de productos públicos" } },
      },
    },
    "/admin/stores": {
      get: {
        tags: ["admin"], summary: "Listar todas las tiendas (superadmin)",
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string" }, description: "Cursor para paginación" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["trial", "active", "expired", "suspended"] } },
        ],
        responses: { "200": { description: "Lista de tiendas con licencias" }, "403": { description: "Acceso denegado" } },
      },
    },
    "/analytics/summary": {
      get: { tags: ["analytics"], summary: "Resumen de KPIs de la tienda", responses: { "200": { description: "Métricas generales" } } },
    },
    "/uploads/product-image": {
      post: { tags: ["uploads"], summary: "Subir imagen de producto a Cloudinary", responses: { "200": { description: "URL de imagen subida" } } },
    },
    "/payments/webhook": {
      post: { tags: ["payments"], summary: "Webhook de Culqi (sin autenticación)", security: [], responses: { "200": { description: "Webhook procesado" } } },
    },
  },
};

app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: "Camila API Docs",
    swaggerOptions: { persistAuthorization: true },
  })
);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);
app.use("/api", router);

// ─── Sentry error handler (must come after routes) ───────────────────────────
Sentry.setupExpressErrorHandler(app);

export default app;
