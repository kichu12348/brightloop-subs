import type {
  CreateTaxBody,
  UpdateTaxBody,
  PaginationQuery,
  PaginatedResponse,
} from "@brightloop/shared";
import { ErrorCode } from "@brightloop/shared";
import { AppError } from "../../errors/appError.ts";
import type { Clock } from "../../lib/clock.ts";
import type { TaxesRepository, TaxRecord } from "./repository.ts";

export interface TaxesServiceDependencies {
  repository: TaxesRepository;
  clock: Clock;
}

export interface TaxesService {
  createTax(input: CreateTaxBody): Promise<TaxRecord>;
  getTaxById(id: string): Promise<TaxRecord>;
  updateTax(id: string, input: UpdateTaxBody): Promise<TaxRecord>;
  listTaxes(query: PaginationQuery): Promise<PaginatedResponse<TaxRecord>>;
}

export function createTaxesService(deps: TaxesServiceDependencies): TaxesService {
  return {
    async createTax(input: CreateTaxBody): Promise<TaxRecord> {
      const now = deps.clock.nowMs();
      return deps.repository.createTax({
        id: crypto.randomUUID(),
        name: input.name.trim(),
        rateBps: input.rateBps,
        isActive: input.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      });
    },

    async getTaxById(id: string): Promise<TaxRecord> {
      const tax = await deps.repository.findTaxById(id);
      if (!tax) {
        throw new AppError(ErrorCode.NotFound, "Tax not found", 404);
      }
      return tax;
    },

    async updateTax(
      id: string,
      input: UpdateTaxBody,
    ): Promise<TaxRecord> {
      const now = deps.clock.nowMs();
      const updated = await deps.repository.updateTax(id, {
        name: input.name?.trim(),
        rateBps: input.rateBps,
        isActive: input.isActive,
        updatedAt: now,
      });

      if (!updated) {
        throw new AppError(ErrorCode.NotFound, "Tax not found", 404);
      }

      return updated;
    },

    async listTaxes(
      query: PaginationQuery,
    ): Promise<PaginatedResponse<TaxRecord>> {
      const page = query.page ?? 1;
      const pageSize = Math.min(query.pageSize ?? 20, 100);
      const offset = (page - 1) * pageSize;

      const { items, total } = await deps.repository.listTaxes(
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

