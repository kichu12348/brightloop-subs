import { eq, and, isNull, count, desc } from "drizzle-orm";
import type { AppDatabase } from "../../db/client.ts";
import { discounts } from "../../db/schema.ts";
import { DiscountKind, DiscountScope } from "@brightloop/shared";

export interface DiscountRecord {
  id: string;
  name: string;
  kind: DiscountKind;
  value: number;
  scope: DiscountScope;
  productId: string | null;
  minQuantity: number;
  minPurchasePaise: number;
  startDate: string | null;
  endDate: string | null;
  maxUses: number | null;
  timesUsed: number;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export interface CreateDiscountData {
  id: string;
  name: string;
  kind: DiscountKind;
  value: number;
  scope: DiscountScope;
  productId: string | null;
  minQuantity: number;
  minPurchasePaise: number;
  startDate: string | null;
  endDate: string | null;
  maxUses: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface UpdateDiscountData {
  name?: string | undefined;
  kind?: DiscountKind | undefined;
  value?: number | undefined;
  scope?: DiscountScope | undefined;
  productId?: string | null | undefined;
  minQuantity?: number | undefined;
  minPurchasePaise?: number | undefined;
  startDate?: string | null | undefined;
  endDate?: string | null | undefined;
  maxUses?: number | null | undefined;
  updatedAt: number;
}

export interface DiscountsRepository {
  createDiscount(data: CreateDiscountData): Promise<DiscountRecord>;
  findDiscountById(id: string): Promise<DiscountRecord | null>;
  listDiscounts(
    limit: number,
    offset: number,
  ): Promise<{ items: DiscountRecord[]; total: number }>;
  updateDiscount(
    id: string,
    data: UpdateDiscountData,
  ): Promise<DiscountRecord | null>;
}

function parseDiscountKind(kind: string): DiscountKind {
  if (kind === DiscountKind.Fixed || kind === DiscountKind.Percentage) {
    return kind;
  }
  throw new Error(`Invalid discount kind: ${kind}`);
}

function parseDiscountScope(scope: string): DiscountScope {
  if (scope === DiscountScope.Product || scope === DiscountScope.Subscription) {
    return scope;
  }
  throw new Error(`Invalid discount scope: ${scope}`);
}

export function createSqliteDiscountsRepository(
  database: AppDatabase,
): DiscountsRepository {
  return {
    async createDiscount(data: CreateDiscountData): Promise<DiscountRecord> {
      const inserted = database
        .insert(discounts)
        .values({
          id: data.id,
          name: data.name,
          kind: data.kind,
          value: data.value,
          scope: data.scope,
          productId: data.productId,
          minQuantity: data.minQuantity,
          minPurchasePaise: data.minPurchasePaise,
          startDate: data.startDate,
          endDate: data.endDate,
          maxUses: data.maxUses,
          timesUsed: 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
        .returning()
        .get();

      return {
        id: inserted.id,
        name: inserted.name,
        kind: parseDiscountKind(inserted.kind),
        value: inserted.value,
        scope: parseDiscountScope(inserted.scope),
        productId: inserted.productId,
        minQuantity: inserted.minQuantity,
        minPurchasePaise: inserted.minPurchasePaise,
        startDate: inserted.startDate,
        endDate: inserted.endDate,
        maxUses: inserted.maxUses,
        timesUsed: inserted.timesUsed,
        createdAt: inserted.createdAt,
        updatedAt: inserted.updatedAt,
        archivedAt: inserted.archivedAt,
      };
    },

    async findDiscountById(id: string): Promise<DiscountRecord | null> {
      const row = database
        .select()
        .from(discounts)
        .where(and(eq(discounts.id, id), isNull(discounts.archivedAt)))
        .get();

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        name: row.name,
        kind: parseDiscountKind(row.kind),
        value: row.value,
        scope: parseDiscountScope(row.scope),
        productId: row.productId,
        minQuantity: row.minQuantity,
        minPurchasePaise: row.minPurchasePaise,
        startDate: row.startDate,
        endDate: row.endDate,
        maxUses: row.maxUses,
        timesUsed: row.timesUsed,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        archivedAt: row.archivedAt,
      };
    },

    async listDiscounts(
      limit: number,
      offset: number,
    ): Promise<{ items: DiscountRecord[]; total: number }> {
      const totalResult = database
        .select({ total: count() })
        .from(discounts)
        .where(isNull(discounts.archivedAt))
        .get();
      const total = totalResult?.total ?? 0;

      const rows = database
        .select()
        .from(discounts)
        .where(isNull(discounts.archivedAt))
        .orderBy(desc(discounts.createdAt))
        .limit(limit)
        .offset(offset)
        .all();

      const items: DiscountRecord[] = rows.map((row) => ({
        id: row.id,
        name: row.name,
        kind: parseDiscountKind(row.kind),
        value: row.value,
        scope: parseDiscountScope(row.scope),
        productId: row.productId,
        minQuantity: row.minQuantity,
        minPurchasePaise: row.minPurchasePaise,
        startDate: row.startDate,
        endDate: row.endDate,
        maxUses: row.maxUses,
        timesUsed: row.timesUsed,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        archivedAt: row.archivedAt,
      }));

      return { items, total };
    },

    async updateDiscount(
      id: string,
      data: UpdateDiscountData,
    ): Promise<DiscountRecord | null> {
      const existing = database
        .select()
        .from(discounts)
        .where(and(eq(discounts.id, id), isNull(discounts.archivedAt)))
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
      if (data.kind !== undefined) {
        updateValues["kind"] = data.kind;
      }
      if (data.value !== undefined) {
        updateValues["value"] = data.value;
      }
      if (data.scope !== undefined) {
        updateValues["scope"] = data.scope;
      }
      if (data.productId !== undefined) {
        updateValues["productId"] = data.productId;
      }
      if (data.minQuantity !== undefined) {
        updateValues["minQuantity"] = data.minQuantity;
      }
      if (data.minPurchasePaise !== undefined) {
        updateValues["minPurchasePaise"] = data.minPurchasePaise;
      }
      if (data.startDate !== undefined) {
        updateValues["startDate"] = data.startDate;
      }
      if (data.endDate !== undefined) {
        updateValues["endDate"] = data.endDate;
      }
      if (data.maxUses !== undefined) {
        updateValues["maxUses"] = data.maxUses;
      }

      const updated = database
        .update(discounts)
        .set(updateValues)
        .where(eq(discounts.id, id))
        .returning()
        .get();

      return {
        id: updated.id,
        name: updated.name,
        kind: parseDiscountKind(updated.kind),
        value: updated.value,
        scope: parseDiscountScope(updated.scope),
        productId: updated.productId,
        minQuantity: updated.minQuantity,
        minPurchasePaise: updated.minPurchasePaise,
        startDate: updated.startDate,
        endDate: updated.endDate,
        maxUses: updated.maxUses,
        timesUsed: updated.timesUsed,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        archivedAt: updated.archivedAt,
      };
    },
  };
}

