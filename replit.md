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
│   │   ├── routes/   # auth, stores, admin, categories, products, inventory
│   │   ├── middlewares/session.ts   # Autenticación de sesión + control de roles
│   │   └── lib/auth.ts             # Hash PBKDF2 de contraseñas
├── camila/           # React Vite frontend (raíz /)
│   ├── src/
│   │   ├── pages/    # landing, auth/login, auth/register, dashboard/*, admin/*
│   │   ├── components/layout/dashboard-layout.tsx
│   │   └── hooks/use-auth.tsx     # Contexto de autenticación global
lib/
├── api-spec/         # OpenAPI 3.1 spec + Orval config
├── api-client-react/ # Hooks React Query generados
├── api-zod/          # Schemas Zod generados
└── db/               # Drizzle ORM schema + conexión
    └── src/schema/
        ├── stores.ts         # Tabla de tiendas/negocios
        ├── licenses.ts       # Licencias (trial/active/expired/suspended)
        ├── users.ts          # Usuarios con roles
        ├── sessions.ts       # Sesiones de usuario
        ├── categories.ts     # Categorías de productos
        ├── products.ts       # Catálogo de productos
        └── inventory.ts      # Movimientos de inventario
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
- `GET/POST /api/categories` — Categorías de la tienda
- `PATCH/DELETE /api/categories/:id` — Editar/eliminar categoría
- `GET/POST /api/products` — Catálogo de productos (con paginación, búsqueda, filtros)
- `GET/PATCH/DELETE /api/products/:id` — Operaciones de producto
- `POST /api/inventory/adjust` — Ajustar inventario
- `GET /api/inventory/movements` — Historial de movimientos

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

- [x] Arquitectura multi-tenant
- [x] Autenticación con sesiones seguras
- [x] Sistema de roles completo
- [x] Registro de negocios con DNI/RUC
- [x] Sistema de licencias administrable
- [x] Panel superadmin
- [x] Panel de tienda con dashboard, productos, categorías, inventario, equipo, settings
- [x] Diseño con paleta selva
- [x] API REST completa y documentada en OpenAPI
- [x] Base de datos PostgreSQL con Drizzle ORM

## Próximas Fases

- **Fase 2**: Módulo POS/ventas, recibos digitales, exportación PDF, envío por WhatsApp
- **Fase 3**: Módulo restaurante (mesas, comandas), módulo panadería (pedidos recurrentes)
- **Fase 4**: Módulo de reportes, estadísticas de ventas, personalización visual avanzada de tienda
- **Fase 5**: Escalado a múltiples ciudades/distritos, app móvil
