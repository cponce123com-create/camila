# Camila — SaaS para Emprendedores Locales

## Descripción

**Camila** es una plataforma SaaS multi-tenant diseñada para emprendedores locales de San Ramón, Chanchamayo, Perú. Permite a negocios locales (tiendas de ropa, restaurantes, panaderías, tiendas de feria, catálogos) gestionar su negocio digitalmente con un enfoque local pero con tecnología escalable.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, Wouter (routing), TailwindCSS v4, Shadcn/UI
- **Backend**: Express 5 API server
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Sesiones propias con cookies httpOnly + PBKDF2
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (desde OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Estado frontend**: React Query + Context API

## Paleta de Colores

- Verde selva profundo: `#1a5c2e`
- Verde hoja: `#2d8c4e`
- Tonos tierra cálidos
- Acentos dorados

## Estructura del Proyecto

```text
artifacts/
├── api-server/       # Express API server (backend)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts           # Login, logout, /me, register
│   │   │   ├── stores.ts         # /stores/me CRUD + team management
│   │   │   ├── customization.ts  # /stores/me/settings + /stores/me/banners
│   │   │   ├── product_images.ts # /products/:id/images CRUD + reorder
│   │   │   ├── categories.ts
│   │   │   ├── products.ts
│   │   │   ├── inventory.ts
│   │   │   └── admin.ts
│   │   ├── middlewares/session.ts   # Autenticación de sesión + control de roles
│   │   └── lib/auth.ts             # Hash PBKDF2 de contraseñas
├── camila/           # React Vite frontend (raíz /)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── landing.tsx
│   │   │   ├── auth/login.tsx, register.tsx
│   │   │   ├── dashboard/ (index, products, categories, inventory, team, settings, customize, reviews)
│   │   │   ├── dashboard/restaurant/ (index, setup, orders, daily-menu, table-order)
│   │   │   └── admin/ (index, store-detail)
│   │   ├── components/
│   │   │   ├── layout/dashboard-layout.tsx
│   │   │   └── products/product-images.tsx   # Product multi-image manager
│   │   └── hooks/use-auth.tsx
lib/
├── api-spec/         # OpenAPI 3.1 spec + Orval config
├── api-client-react/ # Hooks React Query generados
├── api-zod/          # Schemas Zod generados
└── db/               # Drizzle ORM schema + conexión
    └── src/schema/
        ├── stores.ts           # Tabla de tiendas/negocios
        ├── licenses.ts         # Licencias (trial/active/expired/suspended)
        ├── users.ts            # Usuarios con roles
        ├── sessions.ts         # Sesiones de usuario
        ├── categories.ts       # Categorías de productos
        ├── products.ts         # Catálogo de productos
        ├── inventory.ts        # Movimientos de inventario
        ├── store_settings.ts   # Personalización: template, font, feature flags
        ├── store_banners.ts    # Banners promocionales (max 5)
        ├── product_images.ts   # Imágenes múltiples por producto (max 10)
        ├── product_variants.ts # Variantes (talla/color/estilo/material/género/temporada) + stock por variante
        ├── product_reviews.ts  # Reseñas de clientes con aprobación/moderación
        ├── restaurant_tables.ts    # Mesas del restaurante con zonas y estado
        ├── restaurant_orders.ts    # Pedidos por mesa (open/completed/paid/cancelled)
        ├── restaurant_order_items.ts # Items de pedido con estado y notas
        ├── daily_menus.ts          # Menú del día con publicación
        └── daily_menu_items.ts     # Platos del menú del día
scripts/
└── src/seed-superadmin.ts   # Script para crear superadmin
```

## Multi-tenancy

- Cada tienda tiene sus propios datos aislados por `store_id`
- Todos los queries de negocio filtran por `store_id` del usuario autenticado
- El `superadmin` puede ver y gestionar todas las tiendas

## Roles

| Rol | Acceso |
|-----|--------|
| `superadmin` | Panel admin global - todas las tiendas |
| `store_admin` | Panel completo de su tienda |
| `store_staff` | Acceso limitado (ver productos, ajustar inventario) |
| `cashier` | Acceso POS (futuro - Fase 2) |

## Sistema de Licencias

| Estado | Descripción |
|--------|-------------|
| `trial` | Período de prueba (30 días por defecto) |
| `active` | Activa y pagada |
| `expired` | Vencida |
| `suspended` | Suspendida por el admin |

## API Endpoints

- `POST /api/auth/register` — Registro de nueva tienda
- `POST /api/auth/login` — Login de usuario
- `POST /api/auth/logout` — Cierre de sesión
- `GET /api/auth/me` — Datos del usuario actual
- `POST /api/auth/forgot-password` — Solicitar reset de contraseña
- `POST /api/auth/reset-password` — Resetear contraseña
- `GET/PATCH /api/stores/me` — Ver/editar tienda actual
- `GET/POST /api/stores/me/users` — Gestionar equipo de tienda
- `DELETE /api/stores/me/users/:id` — Eliminar miembro del equipo
- `GET /api/admin/stores` — [Superadmin] Listar todas las tiendas
- `GET/PATCH /api/admin/stores/:id` — [Superadmin] Ver/editar tienda
- `PATCH /api/admin/stores/:id/license` — [Superadmin] Gestionar licencia
- `GET /api/admin/stats` — [Superadmin] Estadísticas globales
- `GET/POST /api/categories` — Categorías (árbol con subcategorías, parentId, imageUrl)
- `PATCH /api/categories/reorder` — Reordenar categorías
- `PATCH/DELETE /api/categories/:id` — Editar/eliminar categoría
- `GET/POST /api/products` — Catálogo (paginación, búsqueda, filtros: isActive, isFeatured, tags, sortBy, sortDir)
- `GET/PATCH/DELETE /api/products/:id` — Operaciones de producto
- `GET /api/products/export` — Exportar productos como CSV (JSON array)
- `POST /api/products/import` — Importar productos desde datos estructurados
- `GET /api/stats` — Estadísticas de la tienda (productos, inventario, stock, categorías)
- `POST /api/inventory/adjust` — Ajustar inventario
- `GET /api/inventory/movements` — Historial de movimientos (con filtros: dateFrom, dateTo, type)
- `GET /api/inventory/low-stock` — Productos con stock bajo o sin stock
- `GET /api/inventory/kardex/:productId` — Kárdex de un producto con resumen
- `GET/PATCH /api/stores/me/settings` — Personalización de tienda
- `GET/POST /api/stores/me/banners` — Banners promocionales
- `GET /api/products/:id/variants` — Listar variantes del producto
- `POST /api/products/:id/variants` — Crear variante (talla, color, colorHex, estilo, material, género, temporada, sku, price, stock)
- `PATCH /api/products/:id/variants/:variantId` — Editar variante
- `DELETE /api/products/:id/variants/:variantId` — Eliminar variante
- `GET /api/reviews` — [Auth] Listar todas las reseñas con filtro isApproved
- `GET /api/products/:id/reviews` — Listar reseñas de un producto
- `POST /api/products/:id/reviews` — [Public] Crear reseña
- `PATCH /api/products/:id/reviews/:reviewId/moderate` — Aprobar/rechazar reseña
- `DELETE /api/products/:id/reviews/:reviewId` — Eliminar reseña
- `PATCH /api/stores/me/banners/reorder` — Reordenar banners
- `PATCH/DELETE /api/stores/me/banners/:id` — Editar/eliminar banner
- `GET/POST /api/products/:id/images` — Imágenes múltiples del producto
- `PATCH /api/products/:id/images/reorder` — Reordenar imágenes
- `PATCH/DELETE /api/products/:id/images/:imageId` — Editar/eliminar imagen

### Módulo Restaurante (Fase 5)
- `GET /api/restaurant/tables` — Listar mesas con estado activo y orderId abierto
- `POST /api/restaurant/tables` — Crear mesa individual
- `POST /api/restaurant/tables/bulk` — Crear N mesas con prefijo/zona/capacidad
- `PATCH /api/restaurant/tables/:tableId` — Editar mesa (status, name, zone, isActive)
- `DELETE /api/restaurant/tables/:tableId` — Eliminar mesa
- `GET /api/restaurant/orders` — Historial de pedidos (filtros: tableId, status, date, page)
- `POST /api/restaurant/orders` — Abrir pedido → cambia mesa a "occupied"
- `GET /api/restaurant/orders/:orderId` — Pedido con items
- `PATCH /api/restaurant/orders/:orderId` — Actualizar pedido (status, descuento, pago)
- `POST /api/restaurant/orders/:orderId/items` — Agregar items al pedido
- `PATCH /api/restaurant/orders/:orderId/items/:itemId` — Actualizar item (qty, status, notes)
- `DELETE /api/restaurant/orders/:orderId/items/:itemId` — Eliminar item
- `GET /api/restaurant/daily-menu` — Menú del día por fecha
- `POST /api/restaurant/daily-menu` — Crear/actualizar menú del día
- `POST /api/restaurant/daily-menu/:menuId/items` — Agregar plato al menú
- `PATCH /api/restaurant/daily-menu/:menuId/items/:itemId` — Editar plato
- `DELETE /api/restaurant/daily-menu/:menuId/items/:itemId` — Eliminar plato
- `POST /api/restaurant/daily-menu/:menuId/publish` — Publicar/despublicar menú
- `GET /api/restaurant/stats` — Estadísticas del restaurante (ventas, mesas por estado)

## Superadmin

- Email: `admin@camila.pe`
- Contraseña: `Camila2025!`
- Se crea con: `pnpm --filter @workspace/scripts run seed-superadmin`

## Rutas del Frontend

- `/` — Landing page (marketing)
- `/login` — Inicio de sesión
- `/register` — Registro de nueva tienda
- `/forgot-password` — Recuperación de contraseña
- `/dashboard` — Panel principal del negocio
- `/dashboard/products` — Catálogo de productos
- `/dashboard/categories` — Categorías
- `/dashboard/inventory` — Inventario
- `/dashboard/team` — Equipo de trabajo
- `/dashboard/settings` — Configuración de la tienda
- `/dashboard/restaurant` — Mapa de mesas (hub principal del módulo restaurante)
- `/dashboard/restaurant/setup` — Configurar mesas (CRUD + bulk create)
- `/dashboard/restaurant/orders` — Historial de pedidos
- `/dashboard/restaurant/daily-menu` — Editor del menú del día
- `/dashboard/restaurant/tables/:tableId` — Vista de pedido por mesa (mobile-first)
- `/admin` — Panel superadmin (solo superadmin)
- `/admin/stores/:id` — Detalle de tienda (solo superadmin)

## TypeScript & Composite Projects

- `lib/*` son paquetes composite que emiten declaraciones via `tsc --build`
- `artifacts/*` son leaf packages chequeados con `tsc --noEmit`
- Root `tsconfig.json` es un solution file solo para libs
- Siempre typecheckear desde la raíz: `pnpm run typecheck`

## Root Scripts

- `pnpm run build` — typecheck + build recursivo
- `pnpm run typecheck` — `tsc --build --emitDeclarationOnly` + checks de artifacts
- `pnpm --filter @workspace/api-spec run codegen` — regenerar API client desde OpenAPI

## Fase 1 - Completada ✅

- [x] Arquitectura multi-tenant con aislamiento por storeId
- [x] Autenticación con sesiones seguras (PBKDF2, cookie httpOnly)
- [x] Sistema de roles completo (superadmin/store_admin/store_staff/cashier)
- [x] Registro de negocios con DNI/RUC
- [x] Sistema de licencias administrable (trial/active/expired/suspended)
- [x] Panel superadmin con gestión de todas las tiendas
- [x] Panel de tienda con dashboard, productos, categorías, inventario, equipo, settings
- [x] Diseño con paleta selva profunda (#1a5c2e)
- [x] API REST completa y documentada en OpenAPI 3.1
- [x] Base de datos PostgreSQL con Drizzle ORM

## Fase 2 - Completada ✅

- [x] store_settings: template, fuente, feature flags, horarios de atención
- [x] store_banners: banners promocionales con reordenamiento (max 5)
- [x] product_images: imágenes múltiples por producto con reordenamiento (max 10)
- [x] Página /dashboard/customize con 4 tabs (Apariencia, Banners, Funcionalidades, Horarios)
- [x] ProductImagesManager component integrado en la UI de productos

## Fase 3 - Completada ✅

- [x] Subcategorías: categories.parentId (árbol padre/hijo), categories.imageUrl
- [x] Productos extendidos: salePrice, saleStartDate, saleEndDate, isFeatured, longDescription, tags (text[])
- [x] GET /api/stats — dashboard con KPIs (stock value, low stock, inventario por período, productos por categoría)
- [x] GET /api/products con filtros avanzados: isActive, isFeatured, tags, sortBy, sortDir
- [x] GET/POST /api/products/export y /api/products/import (CSV roundtrip)
- [x] GET /api/inventory/low-stock — alertas automáticas
- [x] GET /api/inventory/kardex/:productId — stock card con resumen y movimientos
- [x] GET /api/inventory/movements mejorado con dateFrom, dateTo, type filters
- [x] PATCH /api/categories/reorder — reordenamiento manual
- [x] Dashboard renovado: gráfico de categorías, KPI cards, período Hoy/Semana/Mes
- [x] Productos mejorado: filtros avanzados, exportar/importar CSV, star icon, sale price display
- [x] Categorías mejorado: árbol expandible con subcategorías, formulario con parentId
- [x] Inventario mejorado: 3 tabs (Movimientos, Stock Bajo, Kárdex)

## Fase 4 - Completada ✅

- [x] product_variants: talla, color, colorHex, estilo, material, género, temporada, sku, stock por variante
- [x] CRUD completo de variantes via tab "Variantes" en editor de productos
- [x] product_reviews: reseñas con texto, rating, nombre cliente, aprobación/moderación
- [x] GET/POST /api/products/:id/reviews + PATCH moderate + DELETE
- [x] Página /dashboard/reviews — moderación global de reseñas

## Fase 5 - Completada ✅

- [x] DB: 5 tablas nuevas (restaurant_tables, restaurant_orders, restaurant_order_items, daily_menus, daily_menu_items) + soldOut en products
- [x] API completa: 19 endpoints bajo /api/restaurant/*
- [x] Mapa de mesas mobile-first con agrupación por zonas y colores por estado
- [x] Configuración de mesas (CRUD individual + creación masiva por prefijo/zona)
- [x] Pedidos por mesa: agregar items, control de estado por ítem (pending/preparing/served), notas
- [x] Cierre de cuenta con descuento por monto o porcentaje, método de pago, liberación automática de mesa
- [x] Estado automático de mesa (occupied al abrir, free al pagar/cancelar, to_pay al completar)
- [x] Historial de pedidos con filtros por estado y paginación
- [x] Menú del día: editor de platos con precio especial, import desde catálogo, publicación
- [x] Estadísticas del restaurante: ventas del día, mesas por estado, pedidos abiertos
- [x] "Restaurante" en la navegación del dashboard (sidebar)

## Próximas Fases

- **Fase 4**: Módulo POS/ventas, recibos digitales, WhatsApp integration
- **Fase 5**: Módulo restaurante (mesas, comandas), módulo panadería (pedidos recurrentes)
- **Fase 6**: Reportes avanzados con gráficas de ventas, app móvil
