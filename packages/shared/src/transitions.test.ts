import { describe, expect, it } from "bun:test";
import { SubscriptionStatus, InvoiceStatus } from "./enums.ts";
import {
  SUBSCRIPTION_TRANSITIONS,
  INVOICE_TRANSITIONS,
  canTransition,
} from "./transitions.ts";

describe("Subscription transitions", () => {
  it("allows valid transitions", () => {
    expect(
      canTransition(
        SUBSCRIPTION_TRANSITIONS,
        SubscriptionStatus.Draft,
        SubscriptionStatus.Quotation,
      ),
    ).toBe(true);
    expect(
      canTransition(
        SUBSCRIPTION_TRANSITIONS,
        SubscriptionStatus.Quotation,
        SubscriptionStatus.Confirmed,
      ),
    ).toBe(true);
    expect(
      canTransition(
        SUBSCRIPTION_TRANSITIONS,
        SubscriptionStatus.Quotation,
        SubscriptionStatus.Closed,
      ),
    ).toBe(true);
    expect(
      canTransition(
        SUBSCRIPTION_TRANSITIONS,
        SubscriptionStatus.Confirmed,
        SubscriptionStatus.Active,
      ),
    ).toBe(true);
    expect(
      canTransition(
        SUBSCRIPTION_TRANSITIONS,
        SubscriptionStatus.Active,
        SubscriptionStatus.Paused,
      ),
    ).toBe(true);
    expect(
      canTransition(
        SUBSCRIPTION_TRANSITIONS,
        SubscriptionStatus.Paused,
        SubscriptionStatus.Active,
      ),
    ).toBe(true);
    expect(
      canTransition(
        SUBSCRIPTION_TRANSITIONS,
        SubscriptionStatus.Active,
        SubscriptionStatus.Closed,
      ),
    ).toBe(true);
    expect(
      canTransition(
        SUBSCRIPTION_TRANSITIONS,
        SubscriptionStatus.Paused,
        SubscriptionStatus.Closed,
      ),
    ).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(
      canTransition(
        SUBSCRIPTION_TRANSITIONS,
        SubscriptionStatus.Draft,
        SubscriptionStatus.Active,
      ),
    ).toBe(false);
    expect(
      canTransition(
        SUBSCRIPTION_TRANSITIONS,
        SubscriptionStatus.Closed,
        SubscriptionStatus.Active,
      ),
    ).toBe(true);
    expect(
      canTransition(
        SUBSCRIPTION_TRANSITIONS,
        SubscriptionStatus.Closed,
        SubscriptionStatus.Draft,
      ),
    ).toBe(false);
    expect(
      canTransition(
        SUBSCRIPTION_TRANSITIONS,
        SubscriptionStatus.Closed,
        SubscriptionStatus.Paused,
      ),
    ).toBe(false);
  });
});

describe("Invoice transitions", () => {
  it("allows valid transitions", () => {
    expect(
      canTransition(
        INVOICE_TRANSITIONS,
        InvoiceStatus.Draft,
        InvoiceStatus.Confirmed,
      ),
    ).toBe(true);
    expect(
      canTransition(
        INVOICE_TRANSITIONS,
        InvoiceStatus.Draft,
        InvoiceStatus.Cancelled,
      ),
    ).toBe(true);
    expect(
      canTransition(
        INVOICE_TRANSITIONS,
        InvoiceStatus.Confirmed,
        InvoiceStatus.Paid,
      ),
    ).toBe(true);
    expect(
      canTransition(
        INVOICE_TRANSITIONS,
        InvoiceStatus.Confirmed,
        InvoiceStatus.Cancelled,
      ),
    ).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(
      canTransition(
        INVOICE_TRANSITIONS,
        InvoiceStatus.Draft,
        InvoiceStatus.Paid,
      ),
    ).toBe(false);
    expect(
      canTransition(
        INVOICE_TRANSITIONS,
        InvoiceStatus.Paid,
        InvoiceStatus.Draft,
      ),
    ).toBe(false);
    expect(
      canTransition(
        INVOICE_TRANSITIONS,
        InvoiceStatus.Cancelled,
        InvoiceStatus.Confirmed,
      ),
    ).toBe(false);
  });
});

