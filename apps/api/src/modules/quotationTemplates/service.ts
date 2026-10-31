import type {
  CreateQuotationTemplateBody,
  PaginationQuery,
  PaginatedResponse,
} from "@brightloop/shared";
import { ErrorCode } from "@brightloop/shared";
import { AppError } from "../../errors/appError.ts";
import type { Clock } from "../../lib/clock.ts";
import type {
  QuotationTemplatesRepository,
  QuotationTemplateDetailRecord,
  CreateTemplateLineData,
} from "./repository.ts";

export interface QuotationTemplatesServiceDependencies {
  repository: QuotationTemplatesRepository;
  clock: Clock;
}

export interface QuotationTemplatesService {
  createTemplate(
    input: CreateQuotationTemplateBody,
  ): Promise<QuotationTemplateDetailRecord>;
  getTemplateById(id: string): Promise<QuotationTemplateDetailRecord>;
  deleteTemplate(id: string): Promise<void>;
  listTemplates(
    query: PaginationQuery,
  ): Promise<PaginatedResponse<QuotationTemplateDetailRecord>>;
}

export function createQuotationTemplatesService(
  deps: QuotationTemplatesServiceDependencies,
): QuotationTemplatesService {
  return {
    async createTemplate(
      input: CreateQuotationTemplateBody,
    ): Promise<QuotationTemplateDetailRecord> {
      const now = deps.clock.nowMs();
      const templateId = crypto.randomUUID();

      const lines: CreateTemplateLineData[] = input.lines.map((line) => ({
        id: crypto.randomUUID(),
        templateId,
        productId: line.productId,
        variantId: line.variantId ?? null,
        quantity: line.quantity,
        taxId: line.taxId ?? null,
        createdAt: now,
      }));

      return deps.repository.createTemplate(
        {
          id: templateId,
          name: input.name.trim(),
          planId: input.planId ?? null,
          validityDays: input.validityDays,
          createdAt: now,
          updatedAt: now,
        },
        lines,
      );
    },

    async getTemplateById(
      id: string,
    ): Promise<QuotationTemplateDetailRecord> {
      const template = await deps.repository.findTemplateById(id);
      if (!template) {
        throw new AppError(
          ErrorCode.NotFound,
          "Quotation template not found",
          404,
        );
      }
      return template;
    },

    async deleteTemplate(id: string): Promise<void> {
      const now = deps.clock.nowMs();
      const deleted = await deps.repository.softDeleteTemplate(id, now);
      if (!deleted) {
        throw new AppError(
          ErrorCode.NotFound,
          "Quotation template not found",
          404,
        );
      }
    },

    async listTemplates(
      query: PaginationQuery,
    ): Promise<PaginatedResponse<QuotationTemplateDetailRecord>> {
      const page = query.page ?? 1;
      const pageSize = Math.min(query.pageSize ?? 20, 100);
      const offset = (page - 1) * pageSize;

      const { items, total } = await deps.repository.listTemplates(
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

