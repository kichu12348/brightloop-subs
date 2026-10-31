# AGENTS.md

Standards for everyone working in this repository, human or automated. Follow them exactly. If a rule blocks you, change the rule in this file in the same commit instead of working around it.

## Project

brightloop-subs is a subscription management platform: products and variants, plans (with lifecycle rules: auto-close, closable early, pausable, renewable), quotation templates, subscriptions, taxes, discounts, automatic recurring invoicing, payment recording, and a finance dashboard. Three roles: `admin`, `staff`, `customer`.

Hard requirements from the problem statement:

- Nothing is billed twice or skipped.
- Subscription and invoice status flows (plus plan-level lifecycle permissions) are enforced on the server.
- Every page responds in under 2 seconds with thousands of subscriptions.
- Passwords: more than 8 characters, with an uppercase letter, a lowercase letter and a special character. One account per email.

## Stack

| Area                        | Choice                                                 |
| --------------------------- | ------------------------------------------------------ |
| Runtime and package manager | Bun                                                    |
| API / Realtime              | Fastify with its built-in Ajv validation, `@fastify/websocket` |
| Schema and types            | TypeBox (JSON Schema that doubles as TypeScript types) |
| Database                    | SQLite via `bun:sqlite`, queried through Drizzle ORM   |
| Scheduling                  | croner                                                 |
| Web                         | Vite, React, React Router, TanStack Query, Zustand, React Icons, CSS Modules |
| Language                    | TypeScript in strict mode everywhere                   |

## Layout

```
brightloop-subs/
├── packages/shared      @brightloop/shared   enums, TypeBox schemas, transitions, API types
├── apps/api             @brightloop/api      Fastify server, billing, database
└── apps/web             @brightloop/web      React app (admin, staff, customer portal)
```

- Anything used by both apps lives in `packages/shared`. Never duplicate a type, enum or schema across apps.
- `apps/web` never imports from `apps/api`, and the reverse. Only `@brightloop/shared` is common ground.
- Inside `apps/api/src/modules/<name>/`: `routes.ts` for HTTP handlers, `service.ts` for logic and queries. Handlers stay thin: parse, authorize, call a service, return.
- Only `apps/api/src/db/client.ts` may import `bun:sqlite`. Everything else uses the exported `db`.
- API modules also hold a `repository.ts` for queries and an `index.ts` as the module's public surface. Dependencies are assembled in `apps/api/src/container.ts`.
- Web source layout: `src/styles/global.css`, `src/components/` (generic UI), `src/features/<name>/` (feature components, hooks, API calls), `src/pages/` (route-level composition), `src/layouts/`, `src/lib/`.

## Modularity and SOLID

The codebase is organized by feature module, and each module owns its routes, services, queries and tests. Design every unit against these principles.

**Single responsibility.** One reason to change per file, function and component.

- Routes parse and authorize. Services hold business rules. Repositories (query functions) talk to the database. Pure functions do math.
- Pricing, tax, discount and rounding are separate pure functions in `billing/`, composed by `runBilling`. They take plain data in and return plain data out.
- A React component either fetches and wires data (container) or renders props (presentational), not both.
- A file over roughly 200 lines, or a function over roughly 40, is a signal to split.

**Open/closed.** Extend by adding, not by editing branches.

- Tax rules, discount kinds (fixed, percentage) and billing periods (daily, weekly, monthly, yearly) are each a small strategy behind one interface, registered in a lookup table keyed by a shared enum. Adding a new kind means adding one file and one registry entry, with no change to the billing loop.
- Replace `if/else` chains on a type with a registry lookup or an exhaustive `switch` in a single place.

**Liskov substitution.** Any implementation of an interface works wherever the interface is used.

- A strategy for one discount kind may not throw for inputs another kind accepts, or return a different unit.
- The in-memory and SQLite implementations of a repository behave identically, which is what lets tests run against either.

**Interface segregation.** Depend on the narrowest contract.

- Services receive small interfaces (`InvoiceReader`, `InvoiceWriter`, `Clock`, `Mailer`), not the whole `db` or a large service object.
- Shared types are split by use: `CreateInvoiceInput`, `InvoiceSummary`, `InvoiceDetail`. Do not pass a full row type where two fields are needed.

**Dependency inversion.** High-level logic depends on abstractions, and wiring happens at the edge.

- Services never import `db`, `Date.now`, the mailer or the scheduler directly. They receive them through a constructor or factory argument (`createBillingService({ invoices, subscriptions, clock, tx })`).
- All wiring lives in one composition root, `apps/api/src/container.ts`, called from `app.ts`. Nowhere else constructs concrete dependencies.
- The clock is injected so billing tests can set "today" without mocking globals.
- The database dialect is an implementation detail behind repositories. Swapping SQLite for Postgres touches `db/` and the repository files, not services.

**Module boundaries.**

- A module exposes a public surface through its `index.ts`. Other modules import only from that file, never from its internals.
- Dependencies point one way: `routes → services → repositories → db`. No cycles, and a lower layer never imports a higher one. Lint enforces this with `import/no-restricted-paths` or `eslint-plugin-boundaries`.
- Cross-module calls go through the other module's service interface. A module never queries another module's tables directly.
- No god files: no `utils.ts`, `helpers.ts` or `common.ts`. Name the file for what it does (`formatMoney.ts`, `paginate.ts`).
- Prefer composition over inheritance. No class hierarchies; use functions and small objects.
- Web follows the same rule: `pages/` compose `features/`, `features/` compose `components/`, and nothing in `components/` knows about the API.

## Commands

```
bun install
bun run dev:api
bun run dev:web
bun run typecheck
bun run lint
bun run seed
```

Before every commit, `typecheck` and `lint` must pass with zero warnings.

## TypeScript rules

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `verbatimModuleSyntax` stay on.
- No `any`, explicit or implicit. Use `unknown` and narrow it.
- No `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` or `eslint-disable` without a written reason in the pull request.
- No non-null assertions (`!`). Handle the missing case.
- No type assertions (`as`) except `as const` and narrowing at a boundary where the type is proven by validation.
- Use `import type` for type-only imports.
- Prefer `const` objects with `as const` over TypeScript `enum`.
- Exported functions declare their return types.
- Every `switch` over a union ends in an exhaustiveness check that fails to compile when a case is missing.
- Every promise is awaited or returned. No floating promises.

## Comments and naming

- Write no comments by default. Names and types carry the intent.
- A comment is allowed only to record a non-obvious constraint, such as why an operation must be synchronous or why a query is ordered a certain way. It states the reason, not the action.
- No comments that describe what the next line does, mark sections, narrate changes, or mention who or what wrote the code. No TODOs without an issue reference. No commented-out code.
- No emojis in code, commit messages, logs or UI copy.
- Files: `camelCase.ts` for modules, `PascalCase.tsx` for React components.
- Database tables and columns: `snake_case`. TypeScript identifiers: `camelCase`. Types and components: `PascalCase`. Constants and enum-like objects: `PascalCase` keys on `as const` objects.
- Names describe the thing: `generateInvoiceForPeriod`, not `process` or `handleData`.

## Validation and API types

- Every route declares `schema` for `params`, `querystring`, `body` and each response status, using TypeBox. Fastify's Ajv validates input and serializes output.
- Use `@fastify/type-provider-typebox` so handler arguments are inferred from the schema. Never cast `request.body`.
- Schemas live in `packages/shared/src/schemas` and are imported by both the route and the web client. The web client derives request and response types with `Static<typeof Schema>`.
- Unknown properties are rejected (`additionalProperties: false`).
- Environment variables are validated once at startup in `config/env.ts`. The app does not boot with a bad environment.
- Password rules are one shared schema, used by signup, reset and staff creation.

## HTTP conventions

- All routes are under `/api`.
- JSON in, JSON out. Plural nouns: `/api/subscriptions`, `/api/invoices/:id/payments`.
- Status codes: `200` read or update, `201` create, `204` no body, `400` validation, `401` unauthenticated, `403` wrong role, `404` missing or not visible, `409` state conflict or duplicate, `422` rule violation.
- Error body is always `{ "error": { "code": string, "message": string } }`. Codes are stable strings from a shared enum, for example `INVALID_TRANSITION`, `DISCOUNT_EXHAUSTED`, `OVERPAYMENT`.
- Throw typed `AppError` instances from services. One error handler plugin maps them to responses. Never leak stack traces or SQL.
- List endpoints are paginated with `page` and `pageSize` (default 20, max 100) and return `{ items, total, page, pageSize }`. There is no unbounded list endpoint.
- Filters and sorting are query parameters validated by schema. Sort columns come from a whitelist.

## Authentication and authorization

- JWT in an `Authorization: Bearer` header. Passwords hashed with `Bun.password` (argon2id).
- A route is protected by default. Public routes are an explicit allowlist: signup, login, forgot password, reset password, health.
- `/api/ws` authenticates via a `token` query parameter verified by `@fastify/jwt` during the WebSocket handshake, and `customer` connections only receive events scoped to their own `customerId`.
- Role checks happen in a `preHandler` using a `requireRole(...)` helper. Never check roles inside service code by reading the raw token.
- Customers only ever see rows tied to their own customer id. The id comes from the token, never from the request body or query. Return `404`, not `403`, for rows that belong to someone else.
- Only `admin` may: create staff, create or edit discounts, taxes, products and plans, run billing manually.
- Password reset tokens are random, single use, hashed at rest and expire in 30 minutes. Responses to forgot-password are identical whether or not the email exists.

## Database and Drizzle

- Schema is defined in `apps/api/src/db/schema` with Drizzle table builders. Migrations are generated with `drizzle-kit generate` and committed. Never edit an applied migration; add a new one.
- Use the Drizzle query builder. Raw SQL is allowed only in a `sql` template for expressions the builder cannot express, and never with string-concatenated input.
- Keep database-specific details contained in `db/` so the dialect can change. Do not rely on SQLite-only behavior in services.
- Money is stored as integer minor units (paise). No floats anywhere in money math. Percentages are stored in basis points. Rounding happens in one function in `billing/pricing.ts`.
- Timestamps are integer epoch milliseconds (`timestamp_ms`). Calendar dates such as billing periods and due dates are `YYYY-MM-DD` text in UTC.
- Primary keys are text ids generated in the application (`crypto.randomUUID()`).
- Foreign keys are enforced (`PRAGMA foreign_keys = ON`). Deletes of referenced business records are soft (`archivedAt`), never hard.
- Any multi-step write runs inside one `db.transaction`. Bun's SQLite transactions are synchronous: no `await` inside the callback.
- Every column used in a `WHERE`, `JOIN` or `ORDER BY` on a list or dashboard query has an index. Required indexes:
  - `invoices(status, due_date)`
  - `invoices(customer_id, created_at)`
  - `invoices(subscription_id, period_start)` as a unique index
  - `subscriptions(status)`
  - `subscriptions(next_billing_date)`
  - `payments(invoice_id)`
- No N+1 queries. Fetch related rows with joins or a single `inArray` query.

## Billing invariants

These are the core of the product. Changes to billing code need a test.

1. `runBilling` is idempotent. Invoices have a unique index on `(subscription_id, period_start)`, and inserts use `onConflictDoNothing`. Running it twice produces no duplicates.
2. Each subscription is billed in its own transaction: invoice, invoice lines, discount usage increment and `next_billing_date` update commit together or not at all. One failing subscription never blocks the others; it is logged and reported in the run summary.
3. A subscription is billed only when it is `active` and `next_billing_date <= today`. If the job was down for several periods, it catches up one period per iteration until current.
4. Prices are computed in this order: variant add-on, line total, discount, tax. The order is fixed and covered by tests.
5. A discount applies only when it is inside its date range, below its usage limit, and meets its minimum purchase or quantity. Usage is incremented in the same transaction as the invoice.
6. The scheduler and the admin "Run billing" endpoint call the same function. No billing logic lives in the cron callback or the route handler.
7. croner jobs are created with `protect: true` so runs never overlap.

## State machines

- Allowed transitions live in `packages/shared/src/transitions.ts` as data, for example `Record<SubscriptionStatus, readonly SubscriptionStatus[]>`.
- The server checks every status change against that table and throws `INVALID_TRANSITION` on a miss. The web UI uses the same table to show or hide actions, but the UI is never the enforcement.
- Subscription: `draft → quotation → confirmed → active → closed`, plus `active ⇄ paused` and `paused → closed`.
- Plan-level rules (`autoCloseOnEnd`, `canCloseEarly`, `canPause`, `canRenew`) are checked on `pause`, early `close`, and `renew` transitions; violating a plan rule throws `422` with `PLAN_RULE_VIOLATION`.
- Invoice: `draft → confirmed → paid`, with `cancelled` reachable from `draft` and `confirmed`.
- An invoice becomes `paid` only inside the same transaction that records the payment bringing the total to the invoice amount. Overpayment is rejected with `OVERPAYMENT`.
- Status is changed only through the service function for that module. No direct `update ... set status` elsewhere.

## Performance

- Target: every API response under 300 ms and every page interactive under 2 seconds with 5,000+ subscriptions seeded.
- Dashboard numbers come from aggregate queries (`count`, `sum` with `group by`) over indexed columns. Never load rows to count them in JavaScript.
- `bun run seed` generates at least 5,000 subscriptions with invoices and payments. Check performance against that data before every demo.
- The web client paginates all tables, debounces filter inputs, and caches with TanStack Query.

## Frontend

- Server state lives in TanStack Query. Zustand is used for client UI state: auth session, mobile drawer/sidebar UI state, theme preference, and live WebSocket event feed/toast queue.
- Route-level code splitting is implemented via `React.lazy` and `Suspense` for all pages.
- Crisp 1.5px stroke monochrome icons use `react-icons` (specifically `react-icons/lu` or `react-icons/fi`).
- The API client is one typed module. Components never call `fetch` directly.
- Every list view handles loading, empty and error states.
- Forms validate with the same shared TypeBox schema the server uses, via Ajv.
- Role-based routing uses a `RequireRole` wrapper. Hiding a link is not security.
- Styling is CSS Modules only. Each component has a colocated `Component.module.css`, imported as `styles`. No Tailwind, no CSS-in-JS, no UI kit with its own styles.
- One global stylesheet, `apps/web/src/styles/global.css`, holds the reset and every shared value as CSS custom properties on `:root`: colors, spacing scale, radii, shadows, font families and sizes, z-index layers. Nothing else goes in it. Media query breakpoints cannot read custom properties, so they are fixed literals (`40rem`, `64rem`) used identically in every module.
- Module files never hard-code a color, spacing or font value that exists as a variable. Use `var(--space-3)`, `var(--color-surface)` and so on. A new repeated value becomes a variable first.
- Class names inside a module are `camelCase` and describe role (`row`, `headerCell`, `isActive`), not appearance (`redBold`).
- Conditional classes are composed with a small `cx` helper in `src/lib/cx.ts`. No string concatenation scattered through JSX.
- Module CSS targets its own classes only. No element selectors, no `:global` except in `global.css`, no `!important`.
- Inline `style` is allowed only to pass a dynamic value into a CSS custom property.
- Dark mode, if added, is a second set of variable values under a `[data-theme]` selector in `global.css`. Components do not change.
- Add a `*.module.css` type declaration (`declare module "*.module.css"`) in `src/vite-env.d.ts`, typed as `Readonly<Record<string, string>>`.
- Components are function components with explicit prop types. No `React.FC`.
- Accessible by default: labelled inputs, buttons for actions, links for navigation, visible focus.

## Testing

- Tests use `bun test`, colocated as `*.test.ts`.
- Required coverage: pricing math, discount eligibility, every state transition (valid and invalid), billing idempotency, overpayment rejection, role checks on admin-only routes, customer data isolation.
- API tests build the app with `buildApp()` and call `app.inject`, against an in-memory SQLite database with migrations applied.

## Security

- No secrets in the repository. `.env` is ignored, `.env.example` lists every variable.
- Log request ids, route and status. Never log passwords, tokens or full payment details.
- Rate limit login and forgot-password.
- CORS allows only the configured web origin.

## Git

- Branch from `main`: `feat/<topic>`, `fix/<topic>`.
- Commit messages: imperative, lowercase, under 72 characters, for example `add idempotent invoice generation`.
- One concern per commit. Migrations ship in the same commit as the schema change that needs them.
- Do not commit `.db` files, build output or editor settings.

## Definition of done

- Types compile, lint is clean, tests pass.
- New routes have request and response schemas, role checks and tests.
- New query paths on large tables have an index.
- No leftover debug output, dead code or commented-out code.
- The behavior was exercised against the seeded dataset.
