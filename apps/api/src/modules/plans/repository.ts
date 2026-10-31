import { eq, and, isNull, count, desc } from "drizzle-orm";
import type { AppDatabase } from "../../db/client.ts";
import { plans } from "../../db/schema.ts";
import { BillingPeriod } from "@brightloop/shared";

export interface PlanRecord {
  id: string;
  name: string;
  pricePaise: number;
  billingPeriod: BillingPeriod;
  minQuantity: number;
  availableFrom: string | null;
  availableTo: string | null;
  autoCloseOnEnd: boolean;
  canCloseEarly: boolean;
  canPause: boolean;
  canRenew: boolean;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export interface CreatePlanData {
  id: string;
  name: string;
  pricePaise: number;
  billingPeriod: BillingPeriod;
  minQuantity: number;
  availableFrom: string | null;
  availableTo: string | null;
  autoCloseOnEnd: boolean;
  canCloseEarly: boolean;
  canPause: boolean;
  canRenew: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UpdatePlanData {
  name?: string | undefined;
  pricePaise?: number | undefined;
  billingPeriod?: BillingPeriod | undefined;
  minQuantity?: number | undefined;
  availableFrom?: string | null | undefined;
  availableTo?: string | null | undefined;
  autoCloseOnEnd?: boolean | undefined;
  canCloseEarly?: boolean | undefined;
  canPause?: boolean | undefined;
  canRenew?: boolean | undefined;
  updatedAt: number;
}

export interface PlansRepository {
  createPlan(data: CreatePlanData): Promise<PlanRecord>;
  findPlanById(id: string): Promise<PlanRecord | null>;
  listPlans(
    limit: number,
    offset: number,
  ): Promise<{ items: PlanRecord[]; total: number }>;
  updatePlan(
    id: string,
    data: UpdatePlanData,
  ): Promise<PlanRecord | null>;
  softDeletePlan(id: string, nowMs: number): Promise<boolean>;
}

function parseBillingPeriod(period: string): BillingPeriod {
  if (
    period === BillingPeriod.Daily ||
    period === BillingPeriod.Weekly ||
    period === BillingPeriod.Monthly ||
    period === BillingPeriod.Yearly
  ) {
    return period;
  }
  throw new Error(`Invalid billing period: ${period}`);
}

export function createSqlitePlansRepository(
  database: AppDatabase,
): PlansRepository {
  return {
    async createPlan(data: CreatePlanData): Promise<PlanRecord> {
      const inserted = database
        .insert(plans)
        .values({
          id: data.id,
          name: data.name,
          pricePaise: data.pricePaise,
          billingPeriod: data.billingPeriod,
          minQuantity: data.minQuantity,
          availableFrom: data.availableFrom,
          availableTo: data.availableTo,
          autoCloseOnEnd: data.autoCloseOnEnd,
          canCloseEarly: data.canCloseEarly,
          canPause: data.canPause,
          canRenew: data.canRenew,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
        .returning()
        .get();

      return {
        id: inserted.id,
        name: inserted.name,
        pricePaise: inserted.pricePaise,
        billingPeriod: parseBillingPeriod(inserted.billingPeriod),
        minQuantity: inserted.minQuantity,
        availableFrom: inserted.availableFrom,
        availableTo: inserted.availableTo,
        autoCloseOnEnd: inserted.autoCloseOnEnd,
        canCloseEarly: inserted.canCloseEarly,
        canPause: inserted.canPause,
        canRenew: inserted.canRenew,
        createdAt: inserted.createdAt,
        updatedAt: inserted.updatedAt,
        archivedAt: inserted.archivedAt,
      };
    },

    async findPlanById(id: string): Promise<PlanRecord | null> {
      const row = database
        .select()
        .from(plans)
        .where(and(eq(plans.id, id), isNull(plans.archivedAt)))
        .get();

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        name: row.name,
        pricePaise: row.pricePaise,
        billingPeriod: parseBillingPeriod(row.billingPeriod),
        minQuantity: row.minQuantity,
        availableFrom: row.availableFrom,
        availableTo: row.availableTo,
        autoCloseOnEnd: row.autoCloseOnEnd,
        canCloseEarly: row.canCloseEarly,
        canPause: row.canPause,
        canRenew: row.canRenew,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        archivedAt: row.archivedAt,
      };
    },

    async listPlans(
      limit: number,
      offset: number,
    ): Promise<{ items: PlanRecord[]; total: number }> {
      const totalResult = database
        .select({ total: count() })
        .from(plans)
        .where(isNull(plans.archivedAt))
        .get();
      const total = totalResult?.total ?? 0;

      const rows = database
        .select()
        .from(plans)
        .where(isNull(plans.archivedAt))
        .orderBy(desc(plans.createdAt))
        .limit(limit)
        .offset(offset)
        .all();

      const items: PlanRecord[] = rows.map((row) => ({
        id: row.id,
        name: row.name,
        pricePaise: row.pricePaise,
        billingPeriod: parseBillingPeriod(row.billingPeriod),
        minQuantity: row.minQuantity,
        availableFrom: row.availableFrom,
        availableTo: row.availableTo,
        autoCloseOnEnd: row.autoCloseOnEnd,
        canCloseEarly: row.canCloseEarly,
        canPause: row.canPause,
        canRenew: row.canRenew,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        archivedAt: row.archivedAt,
      }));

      return { items, total };
    },

    async updatePlan(
      id: string,
      data: UpdatePlanData,
    ): Promise<PlanRecord | null> {
      const existing = database
        .select()
        .from(plans)
        .where(and(eq(plans.id, id), isNull(plans.archivedAt)))
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
      if (data.pricePaise !== undefined) {
        updateValues["pricePaise"] = data.pricePaise;
      }
      if (data.billingPeriod !== undefined) {
        updateValues["billingPeriod"] = data.billingPeriod;
      }
      if (data.minQuantity !== undefined) {
        updateValues["minQuantity"] = data.minQuantity;
      }
      if (data.availableFrom !== undefined) {
        updateValues["availableFrom"] = data.availableFrom;
      }
      if (data.availableTo !== undefined) {
        updateValues["availableTo"] = data.availableTo;
      }
      if (data.autoCloseOnEnd !== undefined) {
        updateValues["autoCloseOnEnd"] = data.autoCloseOnEnd;
      }
      if (data.canCloseEarly !== undefined) {
        updateValues["canCloseEarly"] = data.canCloseEarly;
      }
      if (data.canPause !== undefined) {
        updateValues["canPause"] = data.canPause;
      }
      if (data.canRenew !== undefined) {
        updateValues["canRenew"] = data.canRenew;
      }

      const updated = database
        .update(plans)
        .set(updateValues)
        .where(eq(plans.id, id))
        .returning()
        .get();

      return {
        id: updated.id,
        name: updated.name,
        pricePaise: updated.pricePaise,
        billingPeriod: parseBillingPeriod(updated.billingPeriod),
        minQuantity: updated.minQuantity,
        availableFrom: updated.availableFrom,
        availableTo: updated.availableTo,
        autoCloseOnEnd: updated.autoCloseOnEnd,
        canCloseEarly: updated.canCloseEarly,
        canPause: updated.canPause,
        canRenew: updated.canRenew,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        archivedAt: updated.archivedAt,
      };
    },

    async softDeletePlan(id: string, nowMs: number): Promise<boolean> {
      const existing = database
        .select()
        .from(plans)
        .where(and(eq(plans.id, id), isNull(plans.archivedAt)))
        .get();

      if (!existing) {
        return false;
      }

      database
        .update(plans)
        .set({ archivedAt: nowMs })
        .where(eq(plans.id, id))
        .run();

      return true;
    },
  };
}

