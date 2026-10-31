import { eq, and, isNull, lte, or, isNotNull, sql } from "drizzle-orm";
import type { AppDatabase } from "../../db/client.ts";
import {
  subscriptions,
  subscriptionLines,
  plans,
  products,
  productVariants,
  taxes,
  discounts,
  invoices,
  invoiceLines,
} from "../../db/schema.ts";
import {
  type BillingRunResult,
  type BillingFailure,
  type BillingPeriod,
  type DiscountKind,
  type DiscountScope,
  SubscriptionStatus,
  InvoiceStatus,
  RealtimeEventType,
} from "@brightloop/shared";
import type { Clock } from "../../lib/clock.ts";
import { advanceBillingDate, addDaysIso } from "./periodStrategies.ts";
import {
  calculateInvoice,
  type InvoiceLineInput,
} from "./invoiceCalculator.ts";
import type { DiscountData } from "./discountStrategies.ts";
import type { RealtimePublisher } from "../realtime/index.ts";

export interface BillingServiceDependencies {
  db: AppDatabase;
  clock: Clock;
  realtime?: RealtimePublisher;
}

export interface BillingService {
  runBilling(targetDate?: string): Promise<BillingRunResult>;
}

export function createBillingService(
  deps: BillingServiceDependencies,
): BillingService {
  return {
    async runBilling(targetDate?: string): Promise<BillingRunResult> {
      const today = targetDate ?? deps.clock.todayIso();
      const nowMs = deps.clock.nowMs();

      const candidateSubs = deps.db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.status, SubscriptionStatus.Active),
            isNull(subscriptions.archivedAt),
            or(
              lte(subscriptions.nextBillingDate, today),
              and(
                isNotNull(subscriptions.endDate),
                lte(subscriptions.endDate, today),
              ),
            ),
          ),
        )
        .all();

      let processedCount = 0;
      let invoicesCreated = 0;
      let subscriptionsClosed = 0;
      let skippedDuplicates = 0;
      const failures: BillingFailure[] = [];

      for (const candidate of candidateSubs) {
        processedCount += 1;
        try {
          const createdInThisSub: Array<{
            id: string;
            subscriptionId: string;
            customerId: string;
            totalPaise: number;
            periodStart: string;
            periodEnd: string;
          }> = [];

          deps.db.transaction((tx) => {
            const sub = tx
              .select()
              .from(subscriptions)
              .where(
                and(
                  eq(subscriptions.id, candidate.id),
                  isNull(subscriptions.archivedAt),
                ),
              )
              .get();

            if (!sub || sub.status !== SubscriptionStatus.Active) {
              return;
            }

            const plan = tx
              .select()
              .from(plans)
              .where(eq(plans.id, sub.planId))
              .get();

            if (!plan) {
              throw new Error(`Plan ${sub.planId} not found`);
            }

            let currentNextBillingDate = sub.nextBillingDate;
            const expiryDate = sub.endDate;

            if (
              expiryDate !== null &&
              expiryDate <= today &&
              plan.autoCloseOnEnd &&
              (!currentNextBillingDate || currentNextBillingDate >= expiryDate)
            ) {
              tx.update(subscriptions)
                .set({
                  status: SubscriptionStatus.Closed,
                  updatedAt: nowMs,
                })
                .where(eq(subscriptions.id, sub.id))
                .run();
              subscriptionsClosed += 1;
              return;
            }

            const lineRows = tx
              .select({
                line: subscriptionLines,
                prod: products,
                variant: productVariants,
                tax: taxes,
              })
              .from(subscriptionLines)
              .innerJoin(products, eq(subscriptionLines.productId, products.id))
              .leftJoin(
                productVariants,
                eq(subscriptionLines.variantId, productVariants.id),
              )
              .leftJoin(taxes, eq(subscriptionLines.taxId, taxes.id))
              .where(eq(subscriptionLines.subscriptionId, sub.id))
              .all();

            while (
              currentNextBillingDate !== null &&
              currentNextBillingDate <= today
            ) {
              if (
                expiryDate !== null &&
                currentNextBillingDate >= expiryDate &&
                plan.autoCloseOnEnd
              ) {
                tx.update(subscriptions)
                  .set({
                    status: SubscriptionStatus.Closed,
                    updatedAt: nowMs,
                  })
                  .where(eq(subscriptions.id, sub.id))
                  .run();
                subscriptionsClosed += 1;
                break;
              }

              let discountData: DiscountData | null = null;
              if (sub.discountId) {
                const disc = tx
                  .select()
                  .from(discounts)
                  .where(
                    and(
                      eq(discounts.id, sub.discountId),
                      isNull(discounts.archivedAt),
                    ),
                  )
                  .get();

                if (disc) {
                  discountData = {
                    id: disc.id,
                    code: disc.name,
                    kind: disc.kind as DiscountKind,
                    value: disc.value,
                    scope: disc.scope as DiscountScope,
                    productId: disc.productId,
                    minQuantity: disc.minQuantity,
                    minPurchasePaise: disc.minPurchasePaise,
                    startDate: disc.startDate,
                    endDate: disc.endDate,
                    maxUses: disc.maxUses,
                    timesUsed: disc.timesUsed,
                  };
                }
              }

              const invoiceLinesInput: InvoiceLineInput[] = lineRows.map(
                (item) => ({
                  productId: item.prod.id,
                  variantId: item.variant ? item.variant.id : null,
                  description: item.variant
                    ? `${item.prod.name} (${item.variant.attributeName}: ${item.variant.attributeValue})`
                    : item.prod.name,
                  basePricePaise: item.prod.salesPricePaise,
                  extraPricePaise: item.variant
                    ? item.variant.extraPricePaise
                    : 0,
                  quantity: item.line.quantity,
                  tax: item.tax
                    ? {
                        rateBasisPoints: item.tax.rateBps,
                        isActive: Boolean(item.tax.isActive),
                      }
                    : null,
                }),
              );

              const calculated = calculateInvoice({
                billingDate: currentNextBillingDate,
                lines: invoiceLinesInput,
                discount: discountData,
              });

              const periodStart = currentNextBillingDate;
              const periodEnd = advanceBillingDate(
                periodStart,
                plan.billingPeriod as BillingPeriod,
              );
              const dueDate = addDaysIso(
                periodStart,
                sub.paymentTermsDays,
              );

              const invoiceId = crypto.randomUUID();

              const insertedInvoice = tx
                .insert(invoices)
                .values({
                  id: invoiceId,
                  subscriptionId: sub.id,
                  customerId: sub.customerId,
                  status: InvoiceStatus.Draft,
                  periodStart,
                  periodEnd,
                  dueDate,
                  subtotalPaise: calculated.subtotalPaise,
                  discountPaise: calculated.discountTotalPaise,
                  taxPaise: calculated.taxTotalPaise,
                  totalPaise: calculated.totalAmountPaise,
                  amountPaidPaise: 0,
                  createdAt: nowMs,
                  updatedAt: nowMs,
                })
                .onConflictDoNothing({
                  target: [invoices.subscriptionId, invoices.periodStart],
                })
                .returning()
                .get();

              const nextPeriodDate = advanceBillingDate(
                currentNextBillingDate,
                plan.billingPeriod as BillingPeriod,
              );

              if (!insertedInvoice) {
                skippedDuplicates += 1;
                currentNextBillingDate = nextPeriodDate;
                tx.update(subscriptions)
                  .set({
                    nextBillingDate: currentNextBillingDate,
                    updatedAt: nowMs,
                  })
                  .where(eq(subscriptions.id, sub.id))
                  .run();
                continue;
              }

              invoicesCreated += 1;
              createdInThisSub.push({
                id: insertedInvoice.id,
                subscriptionId: sub.id,
                customerId: sub.customerId,
                totalPaise: calculated.totalAmountPaise,
                periodStart,
                periodEnd,
              });

              for (const cl of calculated.lines) {
                tx.insert(invoiceLines)
                  .values({
                    id: crypto.randomUUID(),
                    invoiceId: insertedInvoice.id,
                    productId: cl.productId,
                    variantId: cl.variantId,
                    description: cl.description,
                    quantity: cl.quantity,
                    unitPricePaise: cl.unitPricePaise,
                    taxRateBasisPoints: cl.taxRateBasisPoints,
                    lineTotalPaise: cl.totalPaise,
                    createdAt: nowMs,
                  })
                  .run();
              }

              if (calculated.discountApplied && sub.discountId) {
                tx.update(discounts)
                  .set({
                    timesUsed: sql`${discounts.timesUsed} + 1`,
                    updatedAt: nowMs,
                  })
                  .where(eq(discounts.id, sub.discountId))
                  .run();
              }

              currentNextBillingDate = nextPeriodDate;

              tx.update(subscriptions)
                .set({
                  nextBillingDate: currentNextBillingDate,
                  updatedAt: nowMs,
                })
                .where(eq(subscriptions.id, sub.id))
                .run();

              if (
                expiryDate !== null &&
                currentNextBillingDate >= expiryDate &&
                plan.autoCloseOnEnd
              ) {
                tx.update(subscriptions)
                  .set({
                    status: SubscriptionStatus.Closed,
                    updatedAt: nowMs,
                  })
                  .where(eq(subscriptions.id, sub.id))
                  .run();
                subscriptionsClosed += 1;
                break;
              }
            }
          });

          for (const inv of createdInThisSub) {
            deps.realtime?.publish({
              type: RealtimeEventType.InvoiceCreated,
              timestampMs: nowMs,
              customerId: inv.customerId,
              payload: {
                id: inv.id,
                subscriptionId: inv.subscriptionId,
                customerId: inv.customerId,
                totalPaise: inv.totalPaise,
                periodStart: inv.periodStart,
                periodEnd: inv.periodEnd,
              },
            });
          }
        } catch (err) {
          failures.push({
            subscriptionId: candidate.id,
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const result: BillingRunResult = {
        targetDate: today,
        processedCount,
        invoicesCreated,
        subscriptionsClosed,
        skippedDuplicates,
        failures,
      };

      deps.realtime?.publish({
        type: RealtimeEventType.BillingRunCompleted,
        timestampMs: nowMs,
        payload: {
          invoicesCreated,
          subscriptionsClosed,
          targetDate: today,
        },
      });

      return result;
    },
  };
}

