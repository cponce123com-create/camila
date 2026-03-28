/**
 * OpenAPI 3.0.3 specification for the Camila API.
 * Served by swagger-ui-express at /api/docs (non-production only).
 */
export const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Camila API",
    version: "1.0.0",
    description:
      "API REST para la plataforma SaaS Camila — gestión de tiendas locales en San Ramón, Perú.",
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
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "camila_session",
      },
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
        tags: ["auth"],
        summary: "Iniciar sesión",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Sesión iniciada; cookie de sesión establecida" },
          "400": { description: "Credenciales inválidas" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["auth"],
        summary: "Cerrar sesión",
        responses: { "200": { description: "Sesión eliminada" } },
      },
    },
    "/auth/me": {
      get: {
        tags: ["auth"],
        summary: "Usuario actual",
        responses: {
          "200": { description: "Datos del usuario autenticado" },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["auth"],
        summary: "Registrar nueva tienda",
        responses: { "201": { description: "Tienda y usuario creados" } },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["auth"],
        summary: "Solicitar enlace de restablecimiento de contraseña",
        responses: { "200": { description: "Email enviado si el correo existe" } },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["auth"],
        summary: "Restablecer contraseña con token",
        responses: {
          "200": { description: "Contraseña actualizada" },
          "400": { description: "Token inválido o expirado" },
        },
      },
    },
    "/products": {
      get: {
        tags: ["products"],
        summary: "Listar productos (paginación offset o cursor)",
        parameters: [
          {
            name: "cursor",
            in: "query",
            schema: { type: "string" },
            description:
              "Cursor base64url para paginación sin COUNT. Si se provee, ignora `page`.",
          },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "categoryId", in: "query", schema: { type: "string" } },
          { name: "lowStock", in: "query", schema: { type: "boolean" } },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
          { name: "isFeatured", in: "query", schema: { type: "boolean" } },
          {
            name: "sortBy",
            in: "query",
            schema: { type: "string", enum: ["name", "price", "stock", "createdAt"] },
          },
          { name: "sortDir", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
        ],
        responses: { "200": { description: "Lista de productos con paginación" } },
      },
      post: {
        tags: ["products"],
        summary: "Crear producto",
        responses: { "201": { description: "Producto creado" } },
      },
    },
    "/products/{id}": {
      get: {
        tags: ["products"],
        summary: "Obtener producto por ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Producto encontrado" },
          "404": { description: "No encontrado" },
        },
      },
      put: {
        tags: ["products"],
        summary: "Actualizar producto",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Producto actualizado" } },
      },
      delete: {
        tags: ["products"],
        summary: "Eliminar producto",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Producto eliminado" } },
      },
    },
    "/products/import": {
      post: {
        tags: ["products"],
        summary: "Importar productos desde CSV (máx 1000 filas)",
        responses: { "200": { description: "Resultado de la importación" } },
      },
    },
    "/sales": {
      get: {
        tags: ["sales"],
        summary: "Listar ventas (paginación offset o cursor)",
        parameters: [
          {
            name: "cursor",
            in: "query",
            schema: { type: "string" },
            description: "Cursor base64url para paginación sin COUNT.",
          },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["paid", "pending", "cancelled", "refunded"] },
          },
          { name: "paymentMethod", in: "query", schema: { type: "string" } },
          { name: "clientId", in: "query", schema: { type: "string" } },
          { name: "staffUserId", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Lista de ventas con totales del día" } },
      },
      post: {
        tags: ["sales"],
        summary: "Registrar venta",
        responses: { "201": { description: "Venta registrada" } },
      },
    },
    "/sales/{id}": {
      get: {
        tags: ["sales"],
        summary: "Obtener venta por ID con items",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Venta con items" } },
      },
    },
    "/clients": {
      get: { tags: ["clients"], summary: "Listar clientes", responses: { "200": { description: "Lista de clientes" } } },
      post: { tags: ["clients"], summary: "Crear cliente", responses: { "201": { description: "Cliente creado" } } },
    },
    "/analytics/summary": {
      get: {
        tags: ["analytics"],
        summary: "Resumen de KPIs de la tienda",
        responses: { "200": { description: "Métricas generales" } },
      },
    },
    "/analytics/sales-over-time": {
      get: {
        tags: ["analytics"],
        summary: "Ventas a lo largo del tiempo",
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
          { name: "groupBy", in: "query", schema: { type: "string", enum: ["day", "week", "month"] } },
        ],
        responses: { "200": { description: "Serie temporal de ventas" } },
      },
    },
    "/public/stores/{slug}": {
      get: {
        tags: ["public"],
        summary: "Obtener tienda pública por slug (cacheada 60 s en memoria)",
        security: [],
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Datos públicos de la tienda" },
          "404": { description: "Tienda no encontrada" },
        },
      },
    },
    "/public/stores/{slug}/products": {
      get: {
        tags: ["public"],
        summary: "Productos públicos de una tienda",
        security: [],
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
    "/public/stores/{slug}/reviews": {
      post: {
        tags: ["public"],
        summary: "Enviar reseña de tienda (limitado 5/hora por IP)",
        security: [],
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: { "201": { description: "Reseña registrada" } },
      },
    },
    "/admin/stores": {
      get: {
        tags: ["admin"],
        summary: "Listar todas las tiendas (superadmin, paginación offset o cursor)",
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "search", in: "query", schema: { type: "string" } },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["trial", "active", "expired", "suspended"] },
          },
        ],
        responses: {
          "200": { description: "Lista de tiendas con licencias" },
          "403": { description: "Acceso denegado" },
        },
      },
    },
    "/admin/license-codes": {
      get: { tags: ["admin"], summary: "Listar códigos de licencia", responses: { "200": { description: "Lista de códigos" } } },
      post: { tags: ["admin"], summary: "Generar códigos de licencia", responses: { "201": { description: "Códigos generados" } } },
    },
    "/uploads/product-image": {
      post: {
        tags: ["uploads"],
        summary: "Subir imagen de producto a Cloudinary (máx 10/min por usuario)",
        responses: { "200": { description: "URL de imagen subida" } },
      },
    },
    "/payments/webhook": {
      post: {
        tags: ["payments"],
        summary: "Webhook de Culqi (sin autenticación, verificado por HMAC)",
        security: [],
        responses: { "200": { description: "Webhook procesado" } },
      },
    },
    "/settings/store": {
      get: { tags: ["settings"], summary: "Obtener configuración de la tienda", responses: { "200": { description: "Configuración actual" } } },
      put: { tags: ["settings"], summary: "Actualizar configuración de la tienda", responses: { "200": { description: "Configuración actualizada" } } },
    },
    "/health": {
      get: {
        tags: ["admin"],
        summary: "Health check (SELECT 1)",
        security: [],
        responses: { "200": { description: "ok" }, "503": { description: "DB no disponible" } },
      },
    },
  },
};
