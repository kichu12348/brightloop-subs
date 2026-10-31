import { eq, and, isNull, count, desc } from "drizzle-orm";
import type { AppDatabase } from "../../db/client.ts";
import { taxes } from "../../db/schema.ts";

export interface TaxRecord {
  id: string;
  name: string;
  rateBps: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export interface CreateTaxData {
  id: string;
  name: string;
  rateBps: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UpdateTaxData {
  name?: string | undefined;
  rateBps?: number | undefined;
  isActive?: boolean | undefined;
  updatedAt: number;
}

export interface TaxesRepository {
  createTax(data: CreateTaxData): Promise<TaxRecord>;
  findTaxById(id: string): Promise<TaxRecord | null>;
  listTaxes(
    limit: number,
    offset: number,
  ): Promise<{ items: TaxRecord[]; total: number }>;
  updateTax(id: string, data: UpdateTaxData): Promise<TaxRecord | null>;
}

export function createSqliteTaxesRepository(
  database: AppDatabase,
): TaxesRepository {
  return {
    async createTax(data: CreateTaxData): Promise<TaxRecord> {
      const inserted = database
        .insert(taxes)
        .values({
          id: data.id,
          name: data.name,
          rateBps: data.rateBps,
          isActive: data.isActive,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
        .returning()
        .get();

      return {
        id: inserted.id,
        name: inserted.name,
        rateBps: inserted.rateBps,
        isActive: inserted.isActive,
        createdAt: inserted.createdAt,
        updatedAt: inserted.updatedAt,
        archivedAt: inserted.archivedAt,
      };
    },

    async findTaxById(id: string): Promise<TaxRecord | null> {
      const row = database
        .select()
        .from(taxes)
        .where(and(eq(taxes.id, id), isNull(taxes.archivedAt)))
        .get();

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        name: row.name,
        rateBps: row.rateBps,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        archivedAt: row.archivedAt,
      };
    },

    async listTaxes(
      limit: number,
      offset: number,
    ): Promise<{ items: TaxRecord[]; total: number }> {
      const totalResult = database
        .select({ total: count() })
        .from(taxes)
        .where(isNull(taxes.archivedAt))
        .get();
      const total = totalResult?.total ?? 0;

      const rows = database
        .select()
        .from(taxes)
        .where(isNull(taxes.archivedAt))
        .orderBy(desc(taxes.createdAt))
        .limit(limit)
        .offset(offset)
        .all();

      const items: TaxRecord[] = rows.map((row) => ({
        id: row.id,
        name: row.name,
        rateBps: row.rateBps,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        archivedAt: row.archivedAt,
      }));

      return { items, total };
    },

    async updateTax(
      id: string,
      data: UpdateTaxData,
    ): Promise<TaxRecord | null> {
      const existing = database
        .select()
        .from(taxes)
        .where(and(eq(taxes.id, id), isNull(taxes.archivedAt)))
        .get();

      if (!existing) {
        return null;
      }

      const updateValues: Record<string, unknown> = {
        updatedAt: data.updatedAt,
      };
      if (data.name !== undefined) {
        updateValues["name"] = data.name;
      }
      if (data.rateBps !== undefined) {
        updateValues["rateBps"] = data.rateBps;
      }
      if (data.isActive !== undefined) {
        updateValues["isActive"] = data.isActive;
      }

      const updated = database
        .update(taxes)
        .set(updateValues)
        .where(eq(taxes.id, id))
        .returning()
        .get();

      return {
        id: updated.id,
        name: updated.name,
        rateBps: updated.rateBps,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        archivedAt: updated.archivedAt,
      };
    },
  };
}

