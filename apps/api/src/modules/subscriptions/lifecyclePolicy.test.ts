import { describe, expect, it } from "bun:test";
import {
  ErrorCode,
  InvoiceStatus,
  SubscriptionStatus,
} from "@brightloop/shared";
import { AppError } from "../../errors/appError.ts";
import {
  type PlanLifecycleRules,
  validateInvoiceTransition,
  validatePaymentAllocation,
  validateSubscriptionTransition,
} from "./lifecyclePolicy.ts";

describe("Subscription Lifecycle Policy", () => {
  const permissivePlan: PlanLifecycleRules = {
    canPause: true,
    canCloseEarly: true,
    canRenew: true,
  };

  const strictPlan: PlanLifecycleRules = {
    canPause: false,
    canCloseEarly: false,
    canRenew: false,
  };

  describe("Valid transitions", () => {
    it("allows standard forward progression", () => {
      expect(() =>
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Draft,
          toStatus: SubscriptionStatus.Quotation,
          plan: permissivePlan,
        }),
      ).not.toThrow();

      expect(() =>
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Quotation,
          toStatus: SubscriptionStatus.Confirmed,
          plan: permissivePlan,
        }),
      ).not.toThrow();

      expect(() =>
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Confirmed,
          toStatus: SubscriptionStatus.Active,
          plan: permissivePlan,
        }),
      ).not.toThrow();
    });

    it("allows pausing and unpausing when plan permits", () => {
      expect(() =>
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Active,
          toStatus: SubscriptionStatus.Paused,
          plan: permissivePlan,
        }),
      ).not.toThrow();

      expect(() =>
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Paused,
          toStatus: SubscriptionStatus.Active,
          plan: permissivePlan,
        }),
      ).not.toThrow();
    });

    it("allows early closure when plan permits", () => {
      expect(() =>
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Active,
          toStatus: SubscriptionStatus.Closed,
          plan: permissivePlan,
          currentDate: "2026-06-01",
          expiryDate: "2026-12-31",
        }),
      ).not.toThrow();

      expect(() =>
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Paused,
          toStatus: SubscriptionStatus.Closed,
          plan: permissivePlan,
          currentDate: "2026-06-01",
          expiryDate: "2026-12-31",
        }),
      ).not.toThrow();
    });

    it("allows closure on or after expiry date even when canCloseEarly is false", () => {
      expect(() =>
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Active,
          toStatus: SubscriptionStatus.Closed,
          plan: strictPlan,
          currentDate: "2026-12-31",
          expiryDate: "2026-12-31",
        }),
      ).not.toThrow();

      expect(() =>
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Active,
          toStatus: SubscriptionStatus.Closed,
          plan: strictPlan,
          currentDate: "2027-01-01",
          expiryDate: "2026-12-31",
        }),
      ).not.toThrow();
    });

    it("allows renewing closed subscription when plan permits", () => {
      expect(() =>
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Closed,
          toStatus: SubscriptionStatus.Active,
          plan: permissivePlan,
        }),
      ).not.toThrow();
    });
  });

  describe("Invalid state machine transitions", () => {
    it("rejects invalid jumps with INVALID_TRANSITION", () => {
      try {
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Draft,
          toStatus: SubscriptionStatus.Active,
          plan: permissivePlan,
        });
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appError = err as AppError;
        expect(appError.code).toBe(ErrorCode.InvalidTransition);
        expect(appError.statusCode).toBe(409);
      }
    });

    it("rejects transitioning closed back to draft", () => {
      try {
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Closed,
          toStatus: SubscriptionStatus.Draft,
          plan: permissivePlan,
        });
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appError = err as AppError;
        expect(appError.code).toBe(ErrorCode.InvalidTransition);
        expect(appError.statusCode).toBe(409);
      }
    });
  });

  describe("Plan rule violations", () => {
    it("rejects pausing when canPause is false", () => {
      try {
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Active,
          toStatus: SubscriptionStatus.Paused,
          plan: strictPlan,
        });
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appError = err as AppError;
        expect(appError.code).toBe(ErrorCode.PlanRuleViolation);
        expect(appError.statusCode).toBe(422);
      }
    });

    it("rejects early close when canCloseEarly is false and currentDate < expiryDate", () => {
      try {
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Active,
          toStatus: SubscriptionStatus.Closed,
          plan: strictPlan,
          currentDate: "2026-06-01",
          expiryDate: "2026-12-31",
        });
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appError = err as AppError;
        expect(appError.code).toBe(ErrorCode.PlanRuleViolation);
        expect(appError.statusCode).toBe(422);
      }
    });

    it("rejects renewing closed subscription when canRenew is false", () => {
      try {
        validateSubscriptionTransition({
          fromStatus: SubscriptionStatus.Closed,
          toStatus: SubscriptionStatus.Active,
          plan: strictPlan,
        });
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appError = err as AppError;
        expect(appError.code).toBe(ErrorCode.PlanRuleViolation);
        expect(appError.statusCode).toBe(422);
      }
    });
  });
});

describe("Invoice Lifecycle Policy", () => {
  it("allows valid invoice transitions", () => {
    expect(() =>
      validateInvoiceTransition(
        InvoiceStatus.Draft,
        InvoiceStatus.Confirmed,
      ),
    ).not.toThrow();

    expect(() =>
      validateInvoiceTransition(
        InvoiceStatus.Confirmed,
        InvoiceStatus.Paid,
      ),
    ).not.toThrow();

    expect(() =>
      validateInvoiceTransition(
        InvoiceStatus.Draft,
        InvoiceStatus.Cancelled,
      ),
    ).not.toThrow();

    expect(() =>
      validateInvoiceTransition(
        InvoiceStatus.Confirmed,
        InvoiceStatus.Cancelled,
      ),
    ).not.toThrow();
  });

  it("rejects invalid invoice transitions with INVALID_TRANSITION", () => {
    try {
      validateInvoiceTransition(InvoiceStatus.Draft, InvoiceStatus.Paid);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appError = err as AppError;
      expect(appError.code).toBe(ErrorCode.InvalidTransition);
      expect(appError.statusCode).toBe(409);
    }

    try {
      validateInvoiceTransition(InvoiceStatus.Paid, InvoiceStatus.Confirmed);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appError = err as AppError;
      expect(appError.code).toBe(ErrorCode.InvalidTransition);
      expect(appError.statusCode).toBe(409);
    }
  });
});

describe("Payment Allocation Validation", () => {
  it("allows valid partial payment", () => {
    const result = validatePaymentAllocation(10000, 5000, 3000);
    expect(result.newPaidPaise).toBe(8000);
    expect(result.shouldMarkPaid).toBe(false);
  });

  it("marks paid when payment exactly reaches invoice total", () => {
    const result = validatePaymentAllocation(10000, 5000, 5000);
    expect(result.newPaidPaise).toBe(10000);
    expect(result.shouldMarkPaid).toBe(true);
  });

  it("marks paid on full single payment from zero", () => {
    const result = validatePaymentAllocation(10000, 0, 10000);
    expect(result.newPaidPaise).toBe(10000);
    expect(result.shouldMarkPaid).toBe(true);
  });

  it("rejects overpayment with OVERPAYMENT error code", () => {
    try {
      validatePaymentAllocation(10000, 9000, 2000);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appError = err as AppError;
      expect(appError.code).toBe(ErrorCode.Overpayment);
      expect(appError.statusCode).toBe(422);
    }
  });

  it("rejects overpayment on initial payment", () => {
    try {
      validatePaymentAllocation(10000, 0, 15000);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appError = err as AppError;
      expect(appError.code).toBe(ErrorCode.Overpayment);
      expect(appError.statusCode).toBe(422);
    }
  });

  it("rejects zero or negative payment amount", () => {
    expect(() => validatePaymentAllocation(10000, 0, 0)).toThrow(
      "Payment amount must be greater than zero",
    );
    expect(() => validatePaymentAllocation(10000, 0, -100)).toThrow(
      "Payment amount must be greater than zero",
    );
  });
});

