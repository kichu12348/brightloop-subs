import type {
  CreatePlanBody,
  UpdatePlanBody,
  PaginationQuery,
  PaginatedResponse,
} from "@brightloop/shared";
import { ErrorCode } from "@brightloop/shared";
import { AppError } from "../../errors/appError.ts";
import type { Clock } from "../../lib/clock.ts";
import type { PlansRepository, PlanRecord } from "./repository.ts";

export interface PlansServiceDependencies {
  repository: PlansRepository;
  clock: Clock;
}

export interface PlansService {
  createPlan(input: CreatePlanBody): Promise<PlanRecord>;
  getPlanById(id: string): Promise<PlanRecord>;
  updatePlan(id: string, input: UpdatePlanBody): Promise<PlanRecord>;
  deletePlan(id: string): Promise<void>;
  listPlans(query: PaginationQuery): Promise<PaginatedResponse<PlanRecord>>;
}

export function createPlansService(deps: PlansServiceDependencies): PlansService {
  return {
    async createPlan(input: CreatePlanBody): Promise<PlanRecord> {
      const now = deps.clock.nowMs();
      return deps.repository.createPlan({
        id: crypto.randomUUID(),
        name: input.name.trim(),
        pricePaise: input.pricePaise,
        billingPeriod: input.billingPeriod,
        minQuantity: input.minQuantity ?? 1,
        availableFrom: input.availableFrom ?? null,
        availableTo: input.availableTo ?? null,
        autoCloseOnEnd: input.autoCloseOnEnd ?? false,
        canCloseEarly: input.canCloseEarly ?? false,
        canPause: input.canPause ?? false,
        canRenew: input.canRenew ?? true,
        createdAt: now,
        updatedAt: now,
      });
    },

    async getPlanById(id: string): Promise<PlanRecord> {
      const plan = await deps.repository.findPlanById(id);
      if (!plan) {
        throw new AppError(ErrorCode.NotFound, "Plan not found", 404);
      }
      return plan;
    },

    async updatePlan(
      id: string,
      input: UpdatePlanBody,
    ): Promise<PlanRecord> {
      const now = deps.clock.nowMs();
      const updated = await deps.repository.updatePlan(id, {
        name: input.name?.trim(),
        pricePaise: input.pricePaise,
        billingPeriod: input.billingPeriod,
        minQuantity: input.minQuantity,
        availableFrom: input.availableFrom,
        availableTo: input.availableTo,
        autoCloseOnEnd: input.autoCloseOnEnd,
        canCloseEarly: input.canCloseEarly,
        canPause: input.canPause,
        canRenew: input.canRenew,
        updatedAt: now,
      });

      if (!updated) {
        throw new AppError(ErrorCode.NotFound, "Plan not found", 404);
      }

      return updated;
    },

    async deletePlan(id: string): Promise<void> {
      const now = deps.clock.nowMs();
      const deleted = await deps.repository.softDeletePlan(id, now);
      if (!deleted) {
        throw new AppError(ErrorCode.NotFound, "Plan not found", 404);
      }
    },

    async listPlans(
      query: PaginationQuery,
    ): Promise<PaginatedResponse<PlanRecord>> {
      const page = query.page ?? 1;
      const pageSize = Math.min(query.pageSize ?? 20, 100);
      const offset = (page - 1) * pageSize;

      const { items, total } = await deps.repository.listPlans(
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

