import type {
  CreateDiscountBody,
  UpdateDiscountBody,
  PaginationQuery,
  PaginatedResponse,
} from "@brightloop/shared";
import { ErrorCode, DiscountScope } from "@brightloop/shared";
import { AppError } from "../../errors/appError.ts";
import type { Clock } from "../../lib/clock.ts";
import type { DiscountsRepository, DiscountRecord } from "./repository.ts";

export interface DiscountsServiceDependencies {
  repository: DiscountsRepository;
  clock: Clock;
}

export interface DiscountsService {
  createDiscount(input: CreateDiscountBody): Promise<DiscountRecord>;
  getDiscountById(id: string): Promise<DiscountRecord>;
  updateDiscount(
    id: string,
    input: UpdateDiscountBody,
  ): Promise<DiscountRecord>;
  listDiscounts(
    query: PaginationQuery,
  ): Promise<PaginatedResponse<DiscountRecord>>;
}

export function createDiscountsService(
  deps: DiscountsServiceDependencies,
): DiscountsService {
  return {
    async createDiscount(input: CreateDiscountBody): Promise<DiscountRecord> {
      if (input.scope === DiscountScope.Product && !input.productId) {
        throw new AppError(
          ErrorCode.PlanRuleViolation,
          "productId is required when discount scope is product",
          422,
        );
      }

      const now = deps.clock.nowMs();
      return deps.repository.createDiscount({
        id: crypto.randomUUID(),
        name: input.name.trim(),
        kind: input.kind,
        value: input.value,
        scope: input.scope,
        productId: input.productId ?? null,
        minQuantity: input.minQuantity ?? 0,
        minPurchasePaise: input.minPurchasePaise ?? 0,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        maxUses: input.maxUses ?? null,
        createdAt: now,
        updatedAt: now,
      });
    },

    async getDiscountById(id: string): Promise<DiscountRecord> {
      const discount = await deps.repository.findDiscountById(id);
      if (!discount) {
        throw new AppError(ErrorCode.NotFound, "Discount not found", 404);
      }
      return discount;
    },

    async updateDiscount(
      id: string,
      input: UpdateDiscountBody,
    ): Promise<DiscountRecord> {
      const existing = await deps.repository.findDiscountById(id);
      if (!existing) {
        throw new AppError(ErrorCode.NotFound, "Discount not found", 404);
      }

      const targetScope = input.scope ?? existing.scope;
      const targetProductId =
        input.productId !== undefined ? input.productId : existing.productId;
      if (targetScope === DiscountScope.Product && !targetProductId) {
        throw new AppError(
          ErrorCode.PlanRuleViolation,
          "productId is required when discount scope is product",
          422,
        );
      }

      const now = deps.clock.nowMs();
      const updated = await deps.repository.updateDiscount(id, {
        name: input.name?.trim(),
        kind: input.kind,
        value: input.value,
        scope: input.scope,
        productId: input.productId,
        minQuantity: input.minQuantity,
        minPurchasePaise: input.minPurchasePaise,
        startDate: input.startDate,
        endDate: input.endDate,
        maxUses: input.maxUses,
        updatedAt: now,
      });

      if (!updated) {
        throw new AppError(ErrorCode.NotFound, "Discount not found", 404);
      }

      return updated;
    },

    async listDiscounts(
      query: PaginationQuery,
    ): Promise<PaginatedResponse<DiscountRecord>> {
      const page = query.page ?? 1;
      const pageSize = Math.min(query.pageSize ?? 20, 100);
      const offset = (page - 1) * pageSize;

      const { items, total } = await deps.repository.listDiscounts(
        pageSize,
        offset,
      );

      return {
        items,
        total,
        page,
        pageSize,
      };
    },
  };
}

