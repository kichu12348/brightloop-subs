# Brightloop Subscription Management System

A unified subscription management, recurring billing, payment tracking, and real-time revenue reporting platform built for Brightloop Software. It handles the full lifecycle of a recurring revenue business—from configuring products, variants, and plans to converting quotations into active subscriptions, running idempotent automated billing cycles, recording payments, and reporting financial performance at scale.

---

## Core Engineering Guarantees

1. **Idempotent Atomic Billing Engine**
   Invoices enforce a database-level unique index on `(subscription_id, period_start)` using `onConflictDoNothing`. Each subscription is billed inside an isolated synchronous SQLite transaction (`invoice` insert, `invoice_lines` insert, `discounts.times_used` increment, and `next_billing_date` advancement commit together or roll back together). Running the billing engine multiple times on the same date produces zero duplicate invoices, and one failing subscription never blocks the rest of the batch.
2. **Zero-Float Integer Money & Basis Point Math**
   All monetary amounts are stored and calculated in integer minor units (**paise**, where $1\text{ INR} = 100\text{ paise}$) and percentages are stored in **basis points** ($100\% = 10000\text{ bps}$, $18\% = 1800\text{ bps}$). Prices are computed in a strict, deterministic four-step pipeline:
   $$\text{Variant Add-On} \rightarrow \text{Line Gross Total} \rightarrow \text{Discount Allocation} \rightarrow \text{Tax on Post-Discount Taxable Amount}$$
3. **Server-Enforced State Machines & Plan Rules**
   Allowed state transitions for both Subscriptions and Invoices are defined as data in `@brightloop/shared` and enforced on the server. Plan-level lifecycle rules (`autoCloseOnEnd`, `canCloseEarly`, `canPause`, `canRenew`) are validated on every lifecycle transition.
4. **Role-Based Access Control & Strict Customer Isolation**
   Three distinct roles (`admin`, `staff`, `customer`) are enforced via Fastify `preHandler` hooks. Customer queries are strictly scoped to the `customerId` extracted from the verified JWT—requesting a resource owned by another customer returns `404 Not Found` rather than leaking existence via `403`.
5. **Real-Time Authenticated WebSockets**
   Built on `@fastify/websocket`, live domain events (`subscription.status_changed`, `invoice.created`, `payment.recorded`, `billing.run_completed`) stream directly to connected clients. Customer sockets only receive events scoped to their own `customerId`.
6. **Sub-300ms High-Volume Performance**
   Powered by `bun:sqlite` in WAL mode (`PRAGMA journal_mode = WAL`) with composite indexes and SQL-level `COUNT`/`SUM` aggregations. Every API endpoint responds in under 300 ms and every page becomes interactive in under 2 seconds with 5,000+ subscriptions seeded.

---

## Technology Stack

| Layer                            | Technology                                                            |
| :------------------------------- | :-------------------------------------------------------------------- |
| **Runtime & Package Manager**    | Bun                                                                   |
| **Backend API Framework**        | Fastify + Ajv (`removeAdditional: false`)                             |
| **Schema & End-to-End Types**    | TypeBox (`@sinclair/typebox`, `@fastify/type-provider-typebox`)       |
| **Database & ORM**               | SQLite via `bun:sqlite` (WAL mode) + Drizzle ORM                      |
| **Background Scheduling**        | `croner` (`protect: true` to prevent overlapping runs)                |
| **Real-Time Transport**          | `@fastify/websocket` with JWT handshake authentication                |
| **Authentication & Hashing**     | `@fastify/jwt` + `Bun.password` (`argon2id`)                          |
| **Frontend Application**         | Vite, React, TypeScript (`strict`), React Router (lazy-loaded routes) |
| **State & Data Synchronization** | TanStack Query + Zustand + WebSocket cache invalidation               |
| **Styling & Icons**              | CSS Modules + CSS Custom Properties (`global.css`), `react-icons`     |

---

## Monorepo Architecture

```text
brightloop-subs/
├── packages/shared      @brightloop/shared   Shared enums, TypeBox schemas, state transition maps
├── apps/api             @brightloop/api      Fastify server, Drizzle SQLite DB, billing engine, cron, WS
└── apps/web             @brightloop/web      React SPA (Admin console, Staff workspace, Customer portal)
```

### Architectural Boundaries

- **Single Source of Truth (`@brightloop/shared`):** Every enum, state transition map, and TypeBox request/response schema resides in `packages/shared`. Neither `apps/api` nor `apps/web` imports from the other.
- **One-Way Layering (`apps/api`):** `routes -> services -> repositories -> db`. Routes parse and authorize; services enforce domain invariants; repositories execute Drizzle queries; pure functions in `billing/` perform pricing and date math.
- **Dependency Inversion:** All concrete dependencies (`db`, `clock`, `mailer`, `realtime`) are wired in a single composition root (`apps/api/src/container.ts`), enabling fast integration tests via `app.inject` against in-memory SQLite databases and deterministic clock control.

---

## Prerequisites & Quick Start

### Prerequisites

- **Bun** `>= 1.1.0` installed (`curl -fsSL https://bun.sh/install | bash` or via PowerShell on Windows).

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` at the root (or inside `apps/api/.env` depending on your local setup):

```bash
cp .env.example .env
```

Default `.env` configuration:

```ini
PORT=3000
DATABASE_URL=brightloop.sqlite
JWT_SECRET=brightloop-super-secret-jwt-key-change-in-production
CORS_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:3000
```

### 3. Seed the Database (5,200+ Subscriptions & Demo Data)

Run the deterministic high-speed seeder to initialize the schema and populate demo accounts, products with variants, plans, taxes, discounts, quotation templates, 5,200+ subscriptions, 6,000+ invoices, and 4,000+ payments:

```bash
bun run seed
```

### 4. Start the API and Web Servers

Run in two separate terminals:

```bash
# Terminal 1: Start Fastify API + Cron Scheduler + WebSocket Server (http://localhost:3000)
bun run dev:api

# Terminal 2: Start Vite React Frontend (http://localhost:5173)
bun run dev:web
```

---

## Pre-Seeded Demo Credentials

All seeded accounts share the password `Brightloop@123` (which satisfies the password policy: $>8$ characters, uppercase, lowercase, and special character).

| Role               | Email                      | Password         | Access Scope                                                                                                                             |
| :----------------- | :------------------------- | :--------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin**          | `admin@brightloop.test`    | `Brightloop@123` | Full control: products, variants, plans, taxes, discounts, staff creation, manual billing runs, finance dashboard.                       |
| **Internal Staff** | `staff@brightloop.test`    | `Brightloop@123` | Operations: quotation templates, subscription creation & transitions, invoice confirmation/printing, payment recording, dashboard.       |
| **Customer**       | `customer@brightloop.test` | `Brightloop@123` | Self-service portal: view own subscriptions & invoices, pause/resume/close/renew subscriptions (per plan rules), pay confirmed invoices. |

---

## Guided Evaluation Walkthrough (Problem Statement Scenes)

### Scene 1: Account Signup, Password Policy & Role-Based Access

1. Open `/signup` and register a new customer account.
2. Verify that the shared `PasswordSchema` enforces $>8$ characters, at least one uppercase letter, one lowercase letter, and one special character, and rejects duplicate emails with `409 Conflict`.
3. Log in as `admin@brightloop.test`, navigate to **Catalog / Staff**, and create an internal staff member (`POST /api/users/staff`). Verify that `staff` and `customer` accounts are blocked from creating staff (`403 Forbidden`).

### Scene 2: Launching Products (with Variants) & Plans

1. As **Admin**, open **Catalog -> Products** and create a product with base sales price, cost price, and notes.
2. Add a variant such as `Brand: Odoo` with an extra price of `560.00 INR` (`56000` paise).
3. Open **Catalog -> Plans** and create a billing plan (`Daily`, `Weekly`, `Monthly`, or `Yearly`) with minimum quantity, availability dates, and plan-by-plan lifecycle flags:
   - `autoCloseOnEnd`
   - `canCloseEarly`
   - `canPause`
   - `canRenew`

### Scene 3: Turning a Quotation Template into an Active Subscription

1. Navigate to **Subscriptions -> New Subscription**.
2. Select a customer and choose a **Quotation Template** (e.g., _Enterprise Yearly Bundle_ or _SMB Monthly Starter_). The plan, validity expiration date, product lines, variant price modifiers, and taxes populate automatically.
3. Step the subscription through its server-enforced lifecycle using the status bar:
   $$\text{Draft} \rightarrow \text{Quotation} \rightarrow \text{Confirmed} \rightarrow \text{Active}$$

### Scene 4: Billing Day & Idempotency Verification

1. Open the **Finance Dashboard** as Admin and locate the **Billing Engine Control Panel**.
2. Select today's date (or a future simulated date) and click **Run Billing Cycle** (`POST /api/billing/run`).
3. Inspect the run summary showing `invoicesCreated`, `subscriptionsClosed`, and `skippedDuplicates`.
4. Click **Run Billing Cycle** a **second time** for the same date. Verify that `invoicesCreated` is `0` and `skippedDuplicates` reflects the already-billed subscriptions—proving nothing is ever billed twice.

### Scene 5: Automatic Discounts & Usage Expiration

1. As **Admin**, navigate to **Catalog -> Discounts** and configure a Fixed or Percentage discount scoped to either a specific `Product` or the whole `Subscription`, specifying `minQuantity`, `minPurchasePaise`, `startDate`, `endDate`, and `maxUses`.
2. Attach the discount to a subscription and run billing. Verify that the discount appears automatically on the generated invoice and increments `timesUsed`.
3. Advance the billing target date to subsequent billing cycles until `timesUsed === maxUses` or `targetDate > endDate`, and verify that the discount automatically stops applying without manual intervention.

### Scene 6: Recording Payments & Overpayment Protection

1. Open a generated invoice and transition it from `Draft` to `Confirmed`.
2. Use the **Print / PDF** action to inspect the print-formatted invoice layout.
3. Click **Record Payment** and enter a payment method (`BankTransfer`, `Card`, `Upi`, `Cash`), date, and note.
4. Attempting to pay more than the remaining balance is rejected with `422 OVERPAYMENT`. Paying the exact remaining balance atomically records the payment and transitions the invoice status to `Paid`.

### Scene 7: Month-End Finance Lead Dashboard at 5,000+ Scale

1. With the 5,200+ seeded subscriptions active, open the **Finance Dashboard**.
2. Review real-time SQL aggregations:
   - Active Subscriptions Count & Breakdown by Status
   - Total Revenue Collected
   - Total Outstanding Balance Owed
   - Overdue Invoices Count, Overdue Amount, and Filterable Overdue List

---

## Domain Math & State Machine Reference

### Pricing Calculation Order

For each subscription line $i$:

1. **Unit Price with Variant Add-On:**
   $$\text{unitPricePaise}_i = \text{baseSalesPricePaise}_i + (\text{variantExtraPricePaise}_i \ ?? \ 0)$$
2. **Line Gross Total:**
   $$\text{lineGrossPaise}_i = \text{unitPricePaise}_i \times \text{quantity}_i$$
3. **Discount Allocation:**
   - **Percentage (`value` in bps):** $\text{lineDiscountPaise}_i = \min\left(\text{lineGrossPaise}_i, \left\lfloor \frac{\text{lineGrossPaise}_i \times \text{valueBps} + 5000}{10000} \right\rfloor\right)$
   - **Fixed (`value` in paise):** Pro-rated across eligible lines with integer remainder assigned to the final eligible line so zero paise are lost to rounding.
4. **Tax Calculation (Post-Discount):**
   $$\text{taxablePaise}_i = \text{lineGrossPaise}_i - \text{lineDiscountPaise}_i$$
   $$\text{lineTaxPaise}_i = \left\lfloor \frac{\text{taxablePaise}_i \times \text{taxRateBps}_i + 5000}{10000} \right\rfloor$$
   $$\text{lineTotalPaise}_i = \text{taxablePaise}_i + \text{lineTaxPaise}_i$$

### State Machines

**Subscription Status Flow:**

```text
Draft ──► Quotation ──► Confirmed ──► Active ◄──► Paused
                                        │           │
                                        ▼           ▼
                                      Closed ◄──────┘
                                        │
                                        └──► Active (if plan.canRenew === true)
```

**Invoice Status Flow:**

```text
Draft ──► Confirmed ──► Paid (via atomic payment recording only)
  │           │
  ▼           ▼
Cancelled ◄───┘
```

---

## API Overview

All HTTP routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <jwt>`.

| Module                  | Endpoints                                                                                                                                                                         | Access                               |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------- |
| **Auth & Users**        | `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET /api/auth/me`, `POST /api/users/staff`, `GET /api/users` | Public / Auth / Admin                |
| **Products & Variants** | `GET /api/products`, `GET /api/products/:id`, `POST /api/products`, `PATCH /api/products/:id`, `DELETE /api/products/:id`                                                         | Read: Auth / Write: Admin            |
| **Plans**               | `GET /api/plans`, `GET /api/plans/:id`, `POST /api/plans`, `PATCH /api/plans/:id`, `DELETE /api/plans/:id`                                                                        | Read: Auth / Write: Admin            |
| **Taxes & Discounts**   | `GET /api/taxes`, `POST /api/taxes`, `PATCH /api/taxes/:id`, `GET /api/discounts`, `POST /api/discounts`, `PATCH /api/discounts/:id`                                              | Write: Admin                         |
| **Quotation Templates** | `GET /api/quotation-templates`, `GET /api/quotation-templates/:id`, `POST /api/quotation-templates`, `DELETE /api/quotation-templates/:id`                                        | Admin, Staff                         |
| **Subscriptions**       | `GET /api/subscriptions`, `GET /api/subscriptions/:id`, `POST /api/subscriptions`, `POST /api/subscriptions/:id/transition`                                                       | Admin, Staff, Customer (own rows)    |
| **Billing Engine**      | `POST /api/billing/run` (also triggered daily at `00:00` UTC by `croner`)                                                                                                         | Admin                                |
| **Invoices & Payments** | `GET /api/invoices`, `GET /api/invoices/:id`, `POST /api/invoices/:id/transition`, `POST /api/invoices/:id/payments`                                                              | Admin, Staff, Customer (own rows)    |
| **Finance Dashboard**   | `GET /api/dashboard/summary`                                                                                                                                                      | Admin, Staff                         |
| **Real-Time WebSocket** | `GET /api/ws?token=<jwt>`                                                                                                                                                         | Authenticated (Role & Tenant Scoped) |

---

## Verification & Scripts

| Command             | Description                                                                               |
| :------------------ | :---------------------------------------------------------------------------------------- |
| `bun run dev:api`   | Starts the Fastify backend server and background billing cron scheduler.                  |
| `bun run dev:web`   | Starts the Vite React development server.                                                 |
| `bun run seed`      | Wipes and seeds 5,200+ subscriptions, 6,000+ invoices, and demo accounts in $<3$ seconds. |
| `bun run typecheck` | Runs `tsc --noEmit` across `packages/shared`, `apps/api`, and `apps/web`.                 |
| `bun run lint`      | Validates code formatting and architectural import boundaries.                            |
| `bun test`          | Runs unit, integration (`app.inject`), WebSocket, and $<300\text{ ms}$ performance tests. |
| `bun run build`     | Builds production bundles for shared packages, API, and web client.                       |
