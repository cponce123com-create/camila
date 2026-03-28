# Camila — SaaS para Emprendedores Locales

## Performance & Security Improvements (Latest)
- **Cursor pagination (M-01)**: Products, Sales, and Admin/Stores endpoints accept optional `?cursor=` (base64url JSON). Cursor mode returns `{ data, nextCursor, hasMore }` and skips the COUNT query. Offset-based pagination (`?page=`) still works as before.
- **In-memory store cache (M-02)**: `GET /api/public/stores/:slug` is cached for 60 s in a Map-based TTL cache (`src/lib/store-cache.ts`). Expired entries are pruned every 5 minutes.
- **Seed refactor (M-03)**: `seed.ts` now exports `seedProduction()`, `seedDevelopment()`, and the legacy `seedDefaultData()` (dispatches by NODE_ENV). The internal `_seedCore(isProduction)` function handles both paths.
- **Swagger UI (M-04)**: Full OpenAPI 3.0.3 spec embedded in `app.ts`; accessible at `/api/docs` in all environments.
- **Rolling sessions (M-05)**: `sessionMiddleware` reads `expiresAt` from DB. If less than 15 days remain on a 30-day session, it updates the DB expiry and reissues the Set-Cookie header automatically.
- **React.lazy (M-06)**: All heavy dashboard/admin routes are lazily loaded via `React.lazy` + a single `<Suspense>` boundary in `App.tsx`.

## Phase 11 — Cloudinary Image Uploads (Complete)
- **Upload signing endpoint**: `POST /api/uploads/sign` — generates a Cloudinary signed upload (timestamp + SHA-256 signature). Accepts folder: `logo | banner | product | banner-promo`. Requires auth.
- **`ImageUpload` component** (`artifacts/camila/src/components/ui/image-upload.tsx`): Reusable single-image uploader with drag & drop, preview, and remove button. Supports `square`, `banner`, and `free` aspect ratios.
- **`ProductGalleryUpload` component** (`artifacts/camila/src/components/ui/product-gallery-upload.tsx`): Multi-image gallery (up to 5). Standalone state component (unused currently — gallery is managed directly via API in `ProductGalleryManager`).
- **Settings page** (`/dashboard/settings`): Added "Imágenes del Negocio" card at top with logo (square) and banner (3:1) upload fields. Both saved via `useUpdateMyStore`.
- **Customize page** (`/dashboard/customize`): Banner creation dialog uses `ImageUpload` instead of a URL text field. Client-side validation ensures an image is uploaded before submit.
- **Products page** (`/dashboard/products`): `imageUrl` text input replaced with `ImageUpload`. Edit dialog has a new "Galería" tab with `ProductGalleryManager` — fetches images via `useGetProductImages`, adds via `useAddProductImage`, deletes via `useDeleteProductImage`, sets primary via `useUpdateProductImage`. Up to 5 images per product.
- Cloudinary credentials: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in Replit Secrets.

## Phase 10 — Public Store Pages (Complete)
- `stores` table has a `slug` (nullable, unique) column — auto-generated on registration
- Public API at `/api/public/stores/:slug` (GET store, categories, products, reviews; POST review)
- Public store page at `/tienda/:slug` — unauthenticated, shows banner, product grid, category filters, review cards, and review submission modal with interactive star picker
- Dashboard sidebar shows "Ver tienda pública" link when slug is set
- `lib/slug.ts` utility: `toSlug()` and `generateUniqueSlug()` with collision handling

## Overview

Camila is a multi-tenant SaaS platform designed for local entrepreneurs in San Ramón, Chanchamayo, Peru. It empowers local businesses (clothing stores, restaurants, bakeries, market stalls, catalogs) to manage their operations digitally with a local focus and scalable technology. The platform provides tools for product management, inventory control, customer engagement, and business customization, aiming to digitalize and streamline local commerce.

## User Preferences

The user prefers an iterative development approach. All features should be fully implemented before moving to the next one. The user values clear communication and expects the agent to ask for confirmation before making any major architectural changes or significant code refactorings.

## System Architecture

The project is built as a monorepo using `pnpm workspaces`, with `Node.js 24` and `TypeScript 5.9`.

**Frontend:**
-   **Framework:** React + Vite
-   **Routing:** Wouter
-   **Styling:** TailwindCSS v4, Shadcn/UI
-   **State Management:** React Query + Context API
-   **UI/UX:** Deep jungle green (`#1a5c2e`), leaf green (`#2d8c4e`), warm earth tones, and golden accents are used for the color palette. The UI is designed to be intuitive for local business owners, with a focus on clear dashboards and streamlined workflows for managing products, inventory, and orders.

**Backend:**
-   **Server:** Express 5 API server
-   **Database:** PostgreSQL with Drizzle ORM
-   **Authentication:** Custom session management using httpOnly cookies and PBKDF2 for password hashing.
-   **Validation:** Zod, drizzle-zod
-   **API Codegen:** Orval generates API client code from an OpenAPI specification.
-   **Build:** esbuild for ESM bundle.

**Core Features & Design Patterns:**
-   **Multi-tenancy:** Each store has isolated data based on `store_id`. All business queries are filtered by the authenticated user's `store_id`. A `superadmin` role has global access.
-   **Role-Based Access Control:**
    -   `superadmin`: Global admin panel access.
    -   `store_admin`: Full access to their store's panel.
    -   `store_staff`: Limited access (e.g., viewing products, adjusting inventory).
    -   `cashier`: POS access (planned).
-   **Licensing System:** Manages store statuses (trial, active, expired, suspended).
-   **Product Management:** Includes categories (with subcategories and images), detailed product information (sale price, dates, tags, long description), multiple product images with reordering, and product variants (size, color, material, stock per variant).
-   **Inventory Management:** Features inventory adjustments, movement history, low-stock alerts, and a Kárdex system.
-   **Store Customization:** Allows stores to configure templates, fonts, feature flags, banners, and operating hours.
-   **Customer Reviews:** Includes product reviews with text, rating, customer name, and moderation capabilities.
-   **Restaurant Module:** Designed for restaurants with features like table management (creation, status, zones), order processing (opening, adding items, status control per item, notes), payment processing (discounts, methods), daily menu management, and restaurant-specific statistics.
-   **Sales Module (Phase 6):** Full POS-style sales system. Includes client management (CRUD at `/clients`), sale registration with optional client, product picker grid, cart with quantity controls, discount (fixed or %), payment method selection, digital receipt (PDF export via jsPDF, WhatsApp sharing), and a filterable sales history with date range, staff, and payment method filters. DB tables: `clients`, `sales`, `sale_items`.
-   **Superadmin Panel (Phase 7):** Comprehensive global admin panel at `/admin`. Features: (1) Dashboard — KPI cards (total/active/trial/expired/suspended stores, total sales amount/count, new this month) + monthly growth area chart (recharts). (2) Stores — searchable/filterable paginated table with license status & plan column; store detail page with 4 tabs: Info (editable store details), Licencia (status + plan + expiry + notes + license history), Usuarios (block/unblock, password reset), Auditoría (per-store audit trail). (3) Audit Logs — global audit trail with all admin actions. (4) Support Tickets — ticket management with status/priority filters, respond & change status in dialog. (5) Announcements — CRUD with type (info/warning/success/maintenance), active toggle, expiry date, card grid view. New DB tables: `license_history`, `audit_logs`, `support_tickets`, `announcements`. `licenses` now has a `plan` enum column (trial/monthly/quarterly/semi_annual/annual/free). Admin sidebar uses dedicated `AdminLayout` (not `DashboardLayout`).
-   **Iterative UX Improvements (Phase 10):** (1) Auto-seed 20 default categories per `businessType` on new store registration — `seedDefaultCategories(storeId, businessType)` in `seed.ts`, called fire-and-forget from auth `/register` route. Categories defined for: `restaurant`, `clothing`, `bakery`, `fair_booth`, `general_catalog`. (2) `thankYouMessage` field added to `store_settings` DB table and OpenAPI spec — settable from Customize › Horarios tab; used in receipt screen footer and PDF footer (replaces hardcoded "¡Gracias por tu compra!"). (3) Product Detail Modal in public tienda — clicking any product card (in grid, Featured, or Offers sections) opens a full `Dialog` with image, description, price, rating, WhatsApp order button, and "Dejar Reseña" CTA. (4) Footer simplified in tienda — cleaner design with logo, store name, address with MapPin icon, and minimal "Tienda con Camila" attribution. (5) Inventory real-time auto-refresh (refetchInterval: 20000ms) — already done in previous session. (6) Categories image upload via `ImageUpload` component — already done. (7) Restaurant module conditionally shown only when `businessType === "restaurant"` — already done.
-   **Analytics & Reports (Phase 8):** Comprehensive analytics module with PDF/CSV export via jsPDF + autoTable. (1) Store Analytics (`/dashboard/analytics`) — 3 tabs: Ventas (revenue trend area chart, payment method pie, peak hours bar, 4 KPI cards), Productos (top products by qty/revenue horizontal bars, category chart, least-sold table), Inventario (critical stock table, out-of-stock badges, rotation bar chart, 4 KPI summary cards). Date range filter (Desde/Hasta) with Aplicar button. (2) Restaurant Analytics (`/dashboard/analytics/restaurant`) — KPI cards (pedidos, ingresos, ticket promedio, tiempo servicio, comensales), revenue trend, top tables/dishes horizontal bar charts, payment methods pie, service time by hour. (3) Admin Global Analytics (`/admin/analytics`) — KPI cards, 12-month store growth line chart, business type pie, license status pie, license plan bar, top districts horizontal bar, top stores by revenue table. Backend routes: `GET /analytics/sales`, `GET /analytics/products`, `GET /analytics/inventory`, `GET /restaurant/analytics`, `GET /admin/analytics`. Export utility: `artifacts/camila/src/lib/export-utils.ts` (downloadCSV, downloadPDF with autoTable sections).
-   **Production Hardening (Phase 9):** Scalability, performance, and quality improvements for pilot readiness. (1) Security — `helmet` security headers, `express-rate-limit` (20 req/15min on `/api/auth`, 300 req/min general API, skipped in dev), `compression` middleware, request body size limited to 2MB, CORS restricted to env-configured origins in production. (2) DB Indexes — Added composite `(storeId, createdAt)` indexes on `sales`, `products`, `audit_logs`; `storeId` indexes on `users`, `sale_items`, `restaurant_orders`; `status` indexes on `sales`, `restaurant_orders`; `createdAt`/`isActive` indexes on `stores`; `saleId`/`productId` on `sale_items`. (3) Skeleton Loaders — Replaced all loading spinners with context-aware skeleton loaders (`StatCardGridSkeleton`, `TableSkeleton`, `CardListSkeleton`, `ChartSkeleton`) on: dashboard/index, products, sales, inventory (all 3 tabs), admin/stores pages. Reusable skeleton components at `src/components/ui/skeletons.tsx`. (4) React Error Boundary — `react-error-boundary` wraps the entire app in `main.tsx`; custom `AppErrorBoundary` with bilingual error fallback UI + reload/home buttons; stack trace visible in development mode. (5) SEO & Meta Tags — `react-helmet-async` with `HelmetProvider` in `main.tsx`; landing page has full OG tags (title, description, keywords, og:image, twitter:card, canonical); auth pages have appropriate titles+descriptions+`noindex`; all dashboard pages have dynamic titles (e.g. "Inicio — {storeName}", "Productos — Camila"); admin pages have `noindex`. (6) Image Performance — `loading="lazy" decoding="async"` on all product images in table; hero background image uses `fetchPriority="high"` for LCP optimization. (7) Accessibility — skip-to-main link (`<a href="#main-content">`) in `App.tsx` (sr-only, visible on focus); mobile menu toggle button has `aria-label`; `<main id="main-content">` target in dashboard layout; improved loading skeleton in dashboard layout (replaced "Cargando..." text).

**Project Structure:**
-   `artifacts/api-server/`: Express API server.
-   `artifacts/camila/`: React Vite frontend application.
-   `lib/api-spec/`: OpenAPI 3.1 specification and Orval configuration.
-   `lib/api-client-react/`: Generated React Query hooks.
-   `lib/api-zod/`: Generated Zod schemas.
-   `lib/db/`: Drizzle ORM schema and connection.
-   `scripts/`: Utility scripts, e.g., superadmin seeding.

## External Dependencies

-   **Database:** PostgreSQL
-   **ORMs:** Drizzle ORM
-   **API Client Generation:** Orval (from OpenAPI spec)
-   **Frontend Libraries:** React, Vite, Wouter, TailwindCSS, Shadcn/UI, React Query, react-helmet-async, react-error-boundary, framer-motion, recharts
-   **Backend Libraries:** Express, helmet, express-rate-limit, compression
-   **Validation:** Zod
-   **Authentication:** PBKDF2 (for password hashing)