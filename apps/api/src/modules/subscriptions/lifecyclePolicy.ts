import {
  type InvoiceStatus,
  type SubscriptionStatus,
  ErrorCode,
  SubscriptionStatus as SubsStatus,
  canTransition,
  SUBSCRIPTION_TRANSITIONS,
  INVOICE_TRANSITIONS,
} from "@brightloop/shared";
import { AppError } from "../../errors/appError.ts";

export interface PlanLifecycleRules {
  readonly canPause: boolean;
  readonly canCloseEarly: boolean;
  readonly canRenew: boolean;
  readonly autoCloseOnEnd?: boolean;
}

export interface SubscriptionTransitionInput {
  readonly fromStatus: SubscriptionStatus;
  readonly toStatus: SubscriptionStatus;
  readonly plan: PlanLifecycleRules;
  readonly currentDate?: string;
  readonly expiryDate?: string | null;
}

export interface PaymentAllocationResult {
  readonly newPaidPaise: number;
  readonly shouldMarkPaid: boolean;
}

export function validateSubscriptionTransition(
  input: SubscriptionTransitionInput,
): void {
  const { fromStatus, toStatus, plan, currentDate, expiryDate } = input;

  if (!canTransition(SUBSCRIPTION_TRANSITIONS, fromStatus, toStatus)) {
    throw new AppError(
      ErrorCode.InvalidTransition,
      `Cannot transition subscription from ${fromStatus} to ${toStatus}`,
    );
  }

  if (
    fromStatus === SubsStatus.Active &&
    toStatus === SubsStatus.Paused &&
    !plan.canPause
  ) {
    throw new AppError(
      ErrorCode.PlanRuleViolation,
      "Plan does not allow pausing subscriptions",
    );
  }

  if (
    (fromStatus === SubsStatus.Active || fromStatus === SubsStatus.Paused) &&
    toStatus === SubsStatus.Closed
  ) {
    const isEarly =
      expiryDate !== null &&
      expiryDate !== undefined &&
      currentDate !== undefined &&
      currentDate < expiryDate;

    if (isEarly && !plan.canCloseEarly) {
      throw new AppError(
        ErrorCode.PlanRuleViolation,
        "Plan does not allow closing subscription before its expiry date",
      );
    }
  }

  if (
    fromStatus === SubsStatus.Closed &&
    toStatus === SubsStatus.Active &&
    !plan.canRenew
  ) {
    throw new AppError(
      ErrorCode.PlanRuleViolation,
      "Plan does not allow renewing closed subscriptions",
    );
  }
}

export function validateInvoiceTransition(
  fromStatus: InvoiceStatus,
  toStatus: InvoiceStatus,
): void {
  if (!canTransition(INVOICE_TRANSITIONS, fromStatus, toStatus)) {
    throw new AppError(
      ErrorCode.InvalidTransition,
      `Cannot transition invoice from ${fromStatus} to ${toStatus}`,
    );
  }
}

export function validatePaymentAllocation(
  invoiceTotalPaise: number,
  currentPaidPaise: number,
  paymentAmountPaise: number,
): PaymentAllocationResult {
  if (paymentAmountPaise <= 0) {
    throw new AppError(
      ErrorCode.ValidationError,
      "Payment amount must be greater than zero",
    );
  }

  const newPaidPaise = currentPaidPaise + paymentAmountPaise;

  if (newPaidPaise > invoiceTotalPaise) {
    throw new AppError(
      ErrorCode.Overpayment,
      `Payment of ${paymentAmountPaise} paise exceeds remaining balance of ${invoiceTotalPaise - currentPaidPaise} paise`,
    );
  }

  return {
    newPaidPaise,
    shouldMarkPaid: newPaidPaise === invoiceTotalPaise,
  };
}

