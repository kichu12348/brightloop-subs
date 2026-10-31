import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  archivedAt: integer("archived_at"),
});

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
  createdAt: integer("created_at").notNull(),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  salesPricePaise: integer("sales_price_paise").notNull(),
  costPricePaise: integer("cost_price_paise").notNull().default(0),
  notes: text("notes"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  archivedAt: integer("archived_at"),
});

export const productVariants = sqliteTable("product_variants", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  attributeName: text("attribute_name").notNull(),
  attributeValue: text("attribute_value").notNull(),
  extraPricePaise: integer("extra_price_paise").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  archivedAt: integer("archived_at"),
});

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  productId: text("product_id").references(() => products.id),
  name: text("name").notNull(),
  pricePaise: integer("price_paise").notNull(),
  billingPeriod: text("billing_period").notNull(),
  minQuantity: integer("min_quantity").notNull().default(1),
  availableFrom: text("available_from"),
  availableTo: text("available_to"),
  autoCloseOnEnd: integer("auto_close_on_end", { mode: "boolean" })
    .notNull()
    .default(false),
  canCloseEarly: integer("can_close_early", { mode: "boolean" })
    .notNull()
    .default(false),
  canPause: integer("can_pause", { mode: "boolean" })
    .notNull()
    .default(false),
  canRenew: integer("can_renew", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  archivedAt: integer("archived_at"),
});

export const taxes = sqliteTable("taxes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  rateBps: integer("rate_bps").notNull(),
  isActive: integer("is_active", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  archivedAt: integer("archived_at"),
});

export const discounts = sqliteTable("discounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  value: integer("value").notNull(),
  scope: text("scope").notNull(),
  productId: text("product_id").references(() => products.id),
  minQuantity: integer("min_quantity").notNull().default(0),
  minPurchasePaise: integer("min_purchase_paise").notNull().default(0),
  startDate: text("start_date"),
  endDate: text("end_date"),
  maxUses: integer("max_uses"),
  timesUsed: integer("times_used").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  archivedAt: integer("archived_at"),
});

export const quotationTemplates = sqliteTable("quotation_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  planId: text("plan_id").references(() => plans.id),
  validityDays: integer("validity_days").notNull().default(30),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  archivedAt: integer("archived_at"),
});

export const quotationTemplateLines = sqliteTable("quotation_template_lines", {
  id: text("id").primaryKey(),
  templateId: text("template_id")
    .notNull()
    .references(() => quotationTemplates.id),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  variantId: text("variant_id").references(() => productVariants.id),
  quantity: integer("quantity").notNull().default(1),
  taxId: text("tax_id").references(() => taxes.id),
  createdAt: integer("created_at").notNull(),
});

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    subNumber: text("sub_number").notNull().unique(),
    customerId: text("customer_id")
      .notNull()
      .references(() => users.id),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id),
    status: text("status").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    nextBillingDate: text("next_billing_date"),
    discountId: text("discount_id").references(() => discounts.id),
    paymentTermsDays: integer("payment_terms_days").notNull().default(30),
    templateId: text("template_id").references(() => quotationTemplates.id),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    archivedAt: integer("archived_at"),
  },
  (table) => [
    index("subscriptions_status_idx").on(table.status),
    index("subscriptions_next_billing_date_idx").on(table.nextBillingDate),
    index("subscriptions_status_next_billing_date_idx").on(
      table.status,
      table.nextBillingDate,
    ),
    index("subscriptions_customer_id_idx").on(table.customerId),
    index("subscriptions_created_at_idx").on(table.createdAt),
    index("subscriptions_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);

export const subscriptionLines = sqliteTable(
  "subscription_lines",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscriptions.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    variantId: text("variant_id").references(() => productVariants.id),
    quantity: integer("quantity").notNull().default(1),
    unitPricePaise: integer("unit_price_paise").notNull(),
    taxId: text("tax_id").references(() => taxes.id),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("subscription_lines_subscription_id_idx").on(table.subscriptionId),
  ],
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscriptions.id),
    customerId: text("customer_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull(),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    dueDate: text("due_date").notNull(),
    subtotalPaise: integer("subtotal_paise").notNull(),
    discountPaise: integer("discount_paise").notNull().default(0),
    taxPaise: integer("tax_paise").notNull().default(0),
    totalPaise: integer("total_paise").notNull(),
    amountPaidPaise: integer("amount_paid_paise").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    archivedAt: integer("archived_at"),
  },
  (table) => [
    index("invoices_status_due_date_idx").on(table.status, table.dueDate),
    index("invoices_customer_id_created_at_idx").on(
      table.customerId,
      table.createdAt,
    ),
    uniqueIndex("invoices_subscription_id_period_start_unique").on(
      table.subscriptionId,
      table.periodStart,
    ),
    index("invoices_created_at_idx").on(table.createdAt),
    index("invoices_subscription_id_idx").on(table.subscriptionId),
  ],
);

export const invoiceLines = sqliteTable(
  "invoice_lines",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    variantId: text("variant_id").references(() => productVariants.id),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull(),
    unitPricePaise: integer("unit_price_paise").notNull(),
    taxRateBasisPoints: integer("tax_rate_basis_points").notNull().default(0),
    lineTotalPaise: integer("line_total_paise").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("invoice_lines_invoice_id_idx").on(table.invoiceId),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id),
    customerId: text("customer_id")
      .notNull()
      .references(() => users.id),
    amountPaise: integer("amount_paise").notNull(),
    method: text("method").notNull(),
    reference: text("reference"),
    paymentDate: text("payment_date"),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("payments_invoice_id_idx").on(table.invoiceId)],
);

export const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  sales_price_paise INTEGER NOT NULL,
  cost_price_paise INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  attribute_name TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  extra_price_paise INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  name TEXT NOT NULL,
  price_paise INTEGER NOT NULL,
  billing_period TEXT NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 1,
  available_from TEXT,
  available_to TEXT,
  auto_close_on_end INTEGER NOT NULL DEFAULT 0,
  can_close_early INTEGER NOT NULL DEFAULT 0,
  can_pause INTEGER NOT NULL DEFAULT 0,
  can_renew INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE TABLE IF NOT EXISTS taxes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rate_bps INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE TABLE IF NOT EXISTS discounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  value INTEGER NOT NULL,
  scope TEXT NOT NULL,
  product_id TEXT REFERENCES products(id),
  min_quantity INTEGER NOT NULL DEFAULT 0,
  min_purchase_paise INTEGER NOT NULL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  max_uses INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE TABLE IF NOT EXISTS quotation_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan_id TEXT REFERENCES plans(id),
  validity_days INTEGER NOT NULL DEFAULT 30,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE TABLE IF NOT EXISTS quotation_template_lines (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES quotation_templates(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  variant_id TEXT REFERENCES product_variants(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  tax_id TEXT REFERENCES taxes(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  sub_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES users(id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  next_billing_date TEXT,
  discount_id TEXT REFERENCES discounts(id),
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  template_id TEXT REFERENCES quotation_templates(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE TABLE IF NOT EXISTS subscription_lines (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  variant_id TEXT REFERENCES product_variants(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_paise INTEGER NOT NULL,
  tax_id TEXT REFERENCES taxes(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  customer_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  due_date TEXT NOT NULL,
  subtotal_paise INTEGER NOT NULL,
  discount_paise INTEGER NOT NULL DEFAULT 0,
  tax_paise INTEGER NOT NULL DEFAULT 0,
  total_paise INTEGER NOT NULL,
  amount_paid_paise INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  variant_id TEXT REFERENCES product_variants(id),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_paise INTEGER NOT NULL,
  tax_rate_basis_points INTEGER NOT NULL DEFAULT 0,
  line_total_paise INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  customer_id TEXT NOT NULL REFERENCES users(id),
  amount_paise INTEGER NOT NULL,
  method TEXT NOT NULL,
  reference TEXT,
  payment_date TEXT,
  recorded_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);
CREATE INDEX IF NOT EXISTS subscriptions_next_billing_date_idx ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS subscriptions_status_next_billing_date_idx ON subscriptions(status, next_billing_date);
CREATE INDEX IF NOT EXISTS subscriptions_customer_id_idx ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_created_at_idx ON subscriptions(created_at);
CREATE INDEX IF NOT EXISTS subscriptions_status_created_at_idx ON subscriptions(status, created_at);
CREATE INDEX IF NOT EXISTS subscription_lines_subscription_id_idx ON subscription_lines(subscription_id);
CREATE INDEX IF NOT EXISTS invoices_status_due_date_idx ON invoices(status, due_date);
CREATE INDEX IF NOT EXISTS invoices_customer_id_created_at_idx ON invoices(customer_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_subscription_id_period_start_unique ON invoices(subscription_id, period_start);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices(created_at);
CREATE INDEX IF NOT EXISTS invoices_subscription_id_idx ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS invoice_lines_invoice_id_idx ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON payments(invoice_id);
`;
