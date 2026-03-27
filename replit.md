# Camila — SaaS para Emprendedores Locales

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
-   **Frontend Libraries:** React, Vite, Wouter, TailwindCSS, Shadcn/UI, React Query
-   **Backend Libraries:** Express
-   **Validation:** Zod
-   **Authentication:** PBKDF2 (for password hashing)