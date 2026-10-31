import { eq, and, isNull, inArray, count, desc } from "drizzle-orm";
import type { AppDatabase } from "../../db/client.ts";
import {
  quotationTemplates,
  quotationTemplateLines,
} from "../../db/schema.ts";

export interface QuotationTemplateLineRecord {
  id: string;
  templateId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  taxId: string | null;
  createdAt: number;
}

export interface QuotationTemplateDetailRecord {
  id: string;
  name: string;
  planId: string | null;
  validityDays: number;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
  lines: QuotationTemplateLineRecord[];
}

export interface CreateTemplateData {
  id: string;
  name: string;
  planId: string | null;
  validityDays: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateTemplateLineData {
  id: string;
  templateId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  taxId: string | null;
  createdAt: number;
}

export interface QuotationTemplatesRepository {
  createTemplate(
    template: CreateTemplateData,
    lines: CreateTemplateLineData[],
  ): Promise<QuotationTemplateDetailRecord>;
  findTemplateById(id: string): Promise<QuotationTemplateDetailRecord | null>;
  listTemplates(
    limit: number,
    offset: number,
  ): Promise<{ items: QuotationTemplateDetailRecord[]; total: number }>;
  softDeleteTemplate(id: string, nowMs: number): Promise<boolean>;
}

export function createSqliteQuotationTemplatesRepository(
  database: AppDatabase,
): QuotationTemplatesRepository {
  return {
    async createTemplate(
      template: CreateTemplateData,
      lines: CreateTemplateLineData[],
    ): Promise<QuotationTemplateDetailRecord> {
      database.transaction((tx) => {
        tx.insert(quotationTemplates)
          .values({
            id: template.id,
            name: template.name,
            planId: template.planId,
            validityDays: template.validityDays,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
          })
          .run();

        for (const line of lines) {
          tx.insert(quotationTemplateLines)
            .values({
              id: line.id,
              templateId: line.templateId,
              productId: line.productId,
              variantId: line.variantId,
              quantity: line.quantity,
              taxId: line.taxId,
              createdAt: line.createdAt,
            })
            .run();
        }
      });

      return {
        id: template.id,
        name: template.name,
        planId: template.planId,
        validityDays: template.validityDays,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        archivedAt: null,
        lines: lines.map((l) => ({ ...l })),
      };
    },

    async findTemplateById(
      id: string,
    ): Promise<QuotationTemplateDetailRecord | null> {
      const templateRow = database
        .select()
        .from(quotationTemplates)
        .where(
          and(
            eq(quotationTemplates.id, id),
            isNull(quotationTemplates.archivedAt),
          ),
        )
        .get();

      if (!templateRow) {
        return null;
      }

      const lineRows = database
        .select()
        .from(quotationTemplateLines)
        .where(eq(quotationTemplateLines.templateId, id))
        .all();

      return {
        id: templateRow.id,
        name: templateRow.name,
        planId: templateRow.planId,
        validityDays: templateRow.validityDays,
        createdAt: templateRow.createdAt,
        updatedAt: templateRow.updatedAt,
        archivedAt: templateRow.archivedAt,
        lines: lineRows.map((l) => ({
          id: l.id,
          templateId: l.templateId,
          productId: l.productId,
          variantId: l.variantId,
          quantity: l.quantity,
          taxId: l.taxId,
          createdAt: l.createdAt,
        })),
      };
    },

    async listTemplates(
      limit: number,
      offset: number,
    ): Promise<{ items: QuotationTemplateDetailRecord[]; total: number }> {
      const totalResult = database
        .select({ total: count() })
        .from(quotationTemplates)
        .where(isNull(quotationTemplates.archivedAt))
        .get();
      const total = totalResult?.total ?? 0;

      const templateRows = database
        .select()
        .from(quotationTemplates)
        .where(isNull(quotationTemplates.archivedAt))
        .orderBy(desc(quotationTemplates.createdAt))
        .limit(limit)
        .offset(offset)
        .all();

      if (templateRows.length === 0) {
        return { items: [], total };
      }

      const templateIds = templateRows.map((t) => t.id);
      const lineRows = database
        .select()
        .from(quotationTemplateLines)
        .where(inArray(quotationTemplateLines.templateId, templateIds))
        .all();

      const linesByTemplateId = new Map<
        string,
        QuotationTemplateLineRecord[]
      >();
      for (const line of lineRows) {
        const existing = linesByTemplateId.get(line.templateId);
        const mapped: QuotationTemplateLineRecord = {
          id: line.id,
          templateId: line.templateId,
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          taxId: line.taxId,
          createdAt: line.createdAt,
        };
        if (existing) {
          existing.push(mapped);
        } else {
          linesByTemplateId.set(line.templateId, [mapped]);
        }
      }

      const items: QuotationTemplateDetailRecord[] = templateRows.map((t) => ({
        id: t.id,
        name: t.name,
        planId: t.planId,
        validityDays: t.validityDays,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        archivedAt: t.archivedAt,
        lines: linesByTemplateId.get(t.id) ?? [],
      }));

      return { items, total };
    },

    async softDeleteTemplate(id: string, nowMs: number): Promise<boolean> {
      const existing = database
        .select()
        .from(quotationTemplates)
        .where(
          and(
            eq(quotationTemplates.id, id),
            isNull(quotationTemplates.archivedAt),
          ),
        )
        .get();

      if (!existing) {
        return false;
      }

      database
        .update(quotationTemplates)
        .set({ archivedAt: nowMs })
        .where(eq(quotationTemplates.id, id))
        .run();

      return true;
    },
  };
}

