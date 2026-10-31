import {
  type SubscriptionStatus,
  SubscriptionStatus as SubsStatus,
  type InvoiceStatus,
  InvoiceStatus as InvStatus,
} from "./enums.ts";

export const SUBSCRIPTION_TRANSITIONS: Record<
  SubscriptionStatus,
  readonly SubscriptionStatus[]
> = {
  [SubsStatus.Draft]: [SubsStatus.Quotation],
  [SubsStatus.Quotation]: [SubsStatus.Confirmed, SubsStatus.Closed],
  [SubsStatus.Confirmed]: [SubsStatus.Active, SubsStatus.Closed],
  [SubsStatus.Active]: [SubsStatus.Paused, SubsStatus.Closed],
  [SubsStatus.Paused]: [SubsStatus.Active, SubsStatus.Closed],
  [SubsStatus.Closed]: [],
};

export const INVOICE_TRANSITIONS: Record<
  InvoiceStatus,
  readonly InvoiceStatus[]
> = {
  [InvStatus.Draft]: [InvStatus.Confirmed, InvStatus.Cancelled],
  [InvStatus.Confirmed]: [InvStatus.Paid, InvStatus.Cancelled],
  [InvStatus.Paid]: [],
  [InvStatus.Cancelled]: [],
};

export function canTransition<T extends string>(
  map: Record<T, readonly T[]>,
  from: T,
  to: T,
): boolean {
  const allowed = map[from];
  if (!allowed) {
    return false;
  }
  return allowed.includes(to);
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled union value: ${JSON.stringify(value)}`);
}

