import {
  type CreateSubscriptionBody,
  type SubscriptionListQuery,
  type PaginatedResponse,
  ErrorCode,
  Role,
  SubscriptionStatus,
} from "@brightloop/shared";
import { AppError } from "../../errors/appError.ts";
import type { Clock } from "../../lib/clock.ts";
import { addDaysIso } from "../billing/periodStrategies.ts";
import { computeUnitPricePaise } from "../billing/pricing.ts";
import { validateSubscriptionTransition } from "./lifecyclePolicy.ts";
import type {
  SubscriptionsRepository,
  SubscriptionDetailRecord,
  SubscriptionSummaryRecord,
} from "./repository.ts";
import type { UsersService } from "../users/service.ts";
import type { PlansService } from "../plans/service.ts";
import type { ProductsService } from "../products/service.ts";
import type { TaxesService } from "../taxes/service.ts";
import type { DiscountsService } from "../discounts/service.ts";
import type { QuotationTemplatesService } from "../quotationTemplates/service.ts";

export interface SubscriptionsServiceDependencies {
  repository: SubscriptionsRepository;
  usersService: UsersService;
  plansService: PlansService;
  productsService: ProductsService;
  taxesService: TaxesService;
  discountsService: DiscountsService;
  quotationTemplatesService: QuotationTemplatesService;
  clock: Clock;
}

export interface SubscriptionsService {
  createSubscription(
    input: CreateSubscriptionBody,
  ): Promise<SubscriptionDetailRecord>;
  getSubscriptionById(
    id: string,
    callerRole: Role,
    callerId: string,
  ): Promise<SubscriptionDetailRecord>;
  listSubscriptions(
    query: SubscriptionListQuery,
    callerRole: Role,
    callerId: string,
  ): Promise<PaginatedResponse<SubscriptionSummaryRecord>>;
  transitionSubscription(
    id: string,
    toStatus: SubscriptionStatus,
    callerRole: Role,
    callerId: string,
  ): Promise<SubscriptionDetailRecord>;
}

function normalizeSubscriptionStatus(
  status: string | undefined,
): SubscriptionStatus | undefined {
  if (!status) {
    return undefined;
  }
  switch (status.toLowerCase()) {
    case SubscriptionStatus.Draft:
      return SubscriptionStatus.Draft;
    case SubscriptionStatus.Quotation:
      return SubscriptionStatus.Quotation;
    case SubscriptionStatus.Confirmed:
      return SubscriptionStatus.Confirmed;
    case SubscriptionStatus.Active:
      return SubscriptionStatus.Active;
    case SubscriptionStatus.Paused:
      return SubscriptionStatus.Paused;
    case SubscriptionStatus.Closed:
      return SubscriptionStatus.Closed;
    default:
      return undefined;
  }
}

export function createSubscriptionsService(
  deps: SubscriptionsServiceDependencies,
): SubscriptionsService {
  return {
    async createSubscription(
      input: CreateSubscriptionBody,
    ): Promise<SubscriptionDetailRecord> {
      await deps.usersService.getUserById(input.customerId);

      let resolvedPlanId = input.planId;
      let resolvedExpiryDate = input.expiryDate ?? null;
      let resolvedLines = input.lines;

      if (input.templateId) {
        const template =
          await deps.quotationTemplatesService.getTemplateById(
            input.templateId,
          );
        if (!resolvedPlanId && template.planId) {
          resolvedPlanId = template.planId;
        }
        if (!resolvedExpiryDate) {
          resolvedExpiryDate = addDaysIso(
            input.startDate,
            template.validityDays,
          );
        }
        if (!resolvedLines || resolvedLines.length === 0) {
          resolvedLines = template.lines.map((tl) => ({
            productId: tl.productId,
            variantId: tl.variantId,
            quantity: tl.quantity,
            taxId: tl.taxId,
          }));
        }
      }

      if (!resolvedPlanId) {
        throw new AppError(
          ErrorCode.ValidationError,
          "Plan ID is required",
          400,
        );
      }

      const plan = await deps.plansService.getPlanById(resolvedPlanId);

      if (plan.availableFrom && input.startDate < plan.availableFrom) {
        throw new AppError(
          ErrorCode.PlanRuleViolation,
          "Plan is not yet available on start date",
          422,
        );
      }
      if (plan.availableTo && input.startDate > plan.availableTo) {
        throw new AppError(
          ErrorCode.PlanRuleViolation,
          "Plan is expired on start date",
          422,
        );
      }

      if (!resolvedLines || resolvedLines.length === 0) {
        throw new AppError(
          ErrorCode.ValidationError,
          "Subscription must have at least one line",
          400,
        );
      }

      let totalQuantity = 0;
      for (const line of resolvedLines) {
        if (line.quantity < plan.minQuantity) {
          throw new AppError(
            ErrorCode.PlanRuleViolation,
            `Line quantity ${line.quantity} is below plan minimum of ${plan.minQuantity}`,
            422,
          );
        }
        totalQuantity += line.quantity;
      }

      if (totalQuantity < plan.minQuantity) {
        throw new AppError(
          ErrorCode.PlanRuleViolation,
          `Total quantity ${totalQuantity} is below plan minimum of ${plan.minQuantity}`,
          422,
        );
      }

      if (input.discountId) {
        await deps.discountsService.getDiscountById(input.discountId);
      }

      const now = deps.clock.nowMs();
      const lineRecords: Array<{
        id: string;
        productId: string;
        variantId: string | null;
        quantity: number;
        unitPricePaise: number;
        taxId: string | null;
        createdAt: number;
      }> = [];

      for (const line of resolvedLines) {
        const product = await deps.productsService.getProductById(
          line.productId,
        );
        let extraPricePaise = 0;
        if (line.variantId) {
          const variant = product.variants.find(
            (v) => v.id === line.variantId,
          );
          if (!variant) {
            throw new AppError(
              ErrorCode.NotFound,
              `Variant ${line.variantId} not found on product ${line.productId}`,
              404,
            );
          }
          extraPricePaise = variant.extraPricePaise;
        }

        if (line.taxId) {
          await deps.taxesService.getTaxById(line.taxId);
        }

        const unitPricePaise = computeUnitPricePaise(
          product.salesPricePaise,
          extraPricePaise,
        );

        lineRecords.push({
          id: crypto.randomUUID(),
          productId: line.productId,
          variantId: line.variantId ?? null,
          quantity: line.quantity,
          unitPricePaise,
          taxId: line.taxId ?? null,
          createdAt: now,
        });
      }

      const initialStatus = input.templateId
        ? SubscriptionStatus.Quotation
        : SubscriptionStatus.Draft;

      const subNumber = await deps.repository.generateSubNumber();
      const subscriptionId = crypto.randomUUID();

      return deps.repository.createSubscription({
        id: subscriptionId,
        subNumber,
        customerId: input.customerId,
        planId: resolvedPlanId,
        status: initialStatus,
        startDate: input.startDate,
        endDate: resolvedExpiryDate,
        nextBillingDate: input.startDate,
        discountId: input.discountId ?? null,
        paymentTermsDays: input.paymentTermsDays ?? 30,
        templateId: input.templateId ?? null,
        createdAt: now,
        updatedAt: now,
        lines: lineRecords,
      });
    },

    async getSubscriptionById(
      id: string,
      callerRole: Role,
      callerId: string,
    ): Promise<SubscriptionDetailRecord> {
      const sub = await deps.repository.findSubscriptionById(id);
      if (!sub) {
        throw new AppError(
          ErrorCode.NotFound,
          "Subscription not found",
          404,
        );
      }

      if (callerRole === Role.Customer && sub.customerId !== callerId) {
        throw new AppError(
          ErrorCode.NotFound,
          "Subscription not found",
          404,
        );
      }

      return sub;
    },

    async listSubscriptions(
      query: SubscriptionListQuery,
      callerRole: Role,
      callerId: string,
    ): Promise<PaginatedResponse<SubscriptionSummaryRecord>> {
      const page = query.page ?? 1;
      const pageSize = Math.min(query.pageSize ?? 20, 100);
      const offset = (page - 1) * pageSize;

      const effectiveCustomerId =
        callerRole === Role.Customer ? callerId : query.customerId;

      const { items, total } = await deps.repository.listSubscriptions({
        customerId: effectiveCustomerId,
        status: normalizeSubscriptionStatus(query.status),
        search: query.search?.trim(),
        limit: pageSize,
        offset,
      });

      return {
        items,
        total,
        page,
        pageSize,
      };
    },

    async transitionSubscription(
      id: string,
      toStatus: SubscriptionStatus,
      callerRole: Role,
      callerId: string,
    ): Promise<SubscriptionDetailRecord> {
      const sub = await deps.repository.findSubscriptionById(id);
      if (!sub) {
        throw new AppError(
          ErrorCode.NotFound,
          "Subscription not found",
          404,
        );
      }

      if (callerRole === Role.Customer) {
        if (sub.customerId !== callerId) {
          throw new AppError(
            ErrorCode.NotFound,
            "Subscription not found",
            404,
          );
        }

        const isCustomerAllowed =
          (sub.status === SubscriptionStatus.Active &&
            toStatus === SubscriptionStatus.Paused) ||
          (sub.status === SubscriptionStatus.Paused &&
            toStatus === SubscriptionStatus.Active) ||
          ((sub.status === SubscriptionStatus.Active ||
            sub.status === SubscriptionStatus.Paused) &&
            toStatus === SubscriptionStatus.Closed) ||
          (sub.status === SubscriptionStatus.Closed &&
            toStatus === SubscriptionStatus.Active);

        if (!isCustomerAllowed) {
          throw new AppError(
            ErrorCode.Forbidden,
            "Customers cannot perform this transition",
            403,
          );
        }
      }

      const today = deps.clock.todayIso();
      validateSubscriptionTransition({
        fromStatus: sub.status,
        toStatus,
        plan: sub.plan,
        currentDate: today,
        expiryDate: sub.endDate,
      });

      let nextBillingDate = sub.nextBillingDate;
      if (toStatus === SubscriptionStatus.Active) {
        if (!nextBillingDate) {
          nextBillingDate =
            sub.startDate > today ? sub.startDate : today;
        }
      }

      const now = deps.clock.nowMs();
      await deps.repository.updateSubscriptionStatus(
        id,
        toStatus,
        nextBillingDate,
        now,
      );

      const updated = await deps.repository.findSubscriptionById(id);
      if (!updated) {
        throw new AppError(
          ErrorCode.NotFound,
          "Subscription not found after update",
          404,
        );
      }
      return updated;
    },
  };
}

