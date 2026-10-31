export const Role = {
  Admin: "admin",
  Staff: "staff",
  Customer: "customer",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ProductType = {
  Service: "service",
  Consumable: "consumable",
  Subscription: "subscription",
} as const;

export type ProductType = (typeof ProductType)[keyof typeof ProductType];

export const BillingPeriod = {
  Daily: "daily",
  Weekly: "weekly",
  Monthly: "monthly",
  Yearly: "yearly",
} as const;

export type BillingPeriod = (typeof BillingPeriod)[keyof typeof BillingPeriod];

export const DiscountKind = {
  Fixed: "fixed",
  Percentage: "percentage",
} as const;

export type DiscountKind = (typeof DiscountKind)[keyof typeof DiscountKind];

export const DiscountScope = {
  Product: "product",
  Subscription: "subscription",
} as const;

export type DiscountScope = (typeof DiscountScope)[keyof typeof DiscountScope];

export const SubscriptionStatus = {
  Draft: "draft",
  Quotation: "quotation",
  Confirmed: "confirmed",
  Active: "active",
  Paused: "paused",
  Closed: "closed",
} as const;

export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const InvoiceStatus = {
  Draft: "draft",
  Confirmed: "confirmed",
  Paid: "paid",
  Cancelled: "cancelled",
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const PaymentMethod = {
  BankTransfer: "bank_transfer",
  Card: "card",
  Upi: "upi",
  Cash: "cash",
} as const;

export type PaymentMethod =
  (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const ErrorCode = {
  ValidationError: "VALIDATION_ERROR",
  Unauthorized: "UNAUTHORIZED",
  Forbidden: "FORBIDDEN",
  NotFound: "NOT_FOUND",
  Conflict: "CONFLICT",
  InvalidTransition: "INVALID_TRANSITION",
  PlanRuleViolation: "PLAN_RULE_VIOLATION",
  DiscountExhausted: "DISCOUNT_EXHAUSTED",
  DiscountIneligible: "DISCOUNT_INELIGIBLE",
  Overpayment: "OVERPAYMENT",
  InternalError: "INTERNAL_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INVALID_TRANSITION: "INVALID_TRANSITION",
  PLAN_RULE_VIOLATION: "PLAN_RULE_VIOLATION",
  DISCOUNT_EXHAUSTED: "DISCOUNT_EXHAUSTED",
  DISCOUNT_INELIGIBLE: "DISCOUNT_INELIGIBLE",
  OVERPAYMENT: "OVERPAYMENT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

