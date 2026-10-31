import { eq, and, isNull, count, desc, like, or } from "drizzle-orm";
import type { AppDatabase } from "../../db/client.ts";
import {
  subscriptions,
  subscriptionLines,
  users,
  plans,
  products,
  productVariants,
} from "../../db/schema.ts";
import {
  type SubscriptionStatus,
  SubscriptionStatus as SubsStatus,
  type BillingPeriod,
} from "@brightloop/shared";

export interface SubscriptionRecord {
  id: string;
  subNumber: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  nextBillingDate: string | null;
  discountId: string | null;
  paymentTermsDays: number;
  templateId: string | null;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export interface SubscriptionLineRecord {
  id: string;
  subscriptionId: string;
  productId: string;
  productName?: string;
  variantId: string | null;
  variantName?: string | null;
  quantity: number;
  unitPricePaise: number;
  taxId: string | null;
  createdAt: number;
}

export interface SubscriptionSummaryRecord {
  id: string;
  subNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  nextBillingDate: string | null;
  discountId: string | null;
  paymentTermsDays: number;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export interface SubscriptionDetailRecord {
  id: string;
  subNumber: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  planId: string;
  plan: {
    id: string;
    name: string;
    pricePaise: number;
    billingPeriod: BillingPeriod;
    minQuantity: number;
    autoCloseOnEnd: boolean;
    canCloseEarly: boolean;
    canPause: boolean;
    canRenew: boolean;
  };
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  nextBillingDate: string | null;
  discountId: string | null;
  paymentTermsDays: number;
  lines: SubscriptionLineRecord[];
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export interface CreateSubscriptionData {
  id: string;
  subNumber: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  nextBillingDate: string | null;
  discountId: string | null;
  paymentTermsDays: number;
  templateId: string | null;
  createdAt: number;
  updatedAt: number;
  lines: Array<{
    id: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    unitPricePaise: number;
    taxId: string | null;
    createdAt: number;
  }>;
}

export interface ListSubscriptionsFilter {
  customerId?: string | undefined;
  status?: SubscriptionStatus | undefined;
  search?: string | undefined;
  limit: number;
  offset: number;
}

export interface SubscriptionsRepository {
  generateSubNumber(): Promise<string>;
  createSubscription(data: CreateSubscriptionData): Promise<SubscriptionDetailRecord>;
  findSubscriptionById(id: string): Promise<SubscriptionDetailRecord | null>;
  findSubscriptionRecordById(id: string): Promise<SubscriptionRecord | null>;
  listSubscriptions(
    filter: ListSubscriptionsFilter,
  ): Promise<{ items: SubscriptionSummaryRecord[]; total: number }>;
  updateSubscriptionStatus(
    id: string,
    status: SubscriptionStatus,
    nextBillingDate: string | null | undefined,
    updatedAt: number,
  ): Promise<boolean>;
}

function parseSubscriptionStatus(value: string): SubscriptionStatus {
  switch (value) {
    case SubsStatus.Draft:
    case SubsStatus.Quotation:
    case SubsStatus.Confirmed:
    case SubsStatus.Active:
    case SubsStatus.Paused:
    case SubsStatus.Closed:
      return value;
    default:
      throw new Error(`Invalid subscription status: ${value}`);
  }
}

export function createSqliteSubscriptionsRepository(
  database: AppDatabase,
): SubscriptionsRepository {
  return {
    async generateSubNumber(): Promise<string> {
      const result = database
        .select({ total: count() })
        .from(subscriptions)
        .get();
      const nextNum = (result?.total ?? 0) + 1;
      return `SUB-${String(nextNum).padStart(6, "0")}`;
    },

    async createSubscription(
      data: CreateSubscriptionData,
    ): Promise<SubscriptionDetailRecord> {
      database.transaction((tx) => {
        tx.insert(subscriptions)
          .values({
            id: data.id,
            subNumber: data.subNumber,
            customerId: data.customerId,
            planId: data.planId,
            status: data.status,
            startDate: data.startDate,
            endDate: data.endDate,
            nextBillingDate: data.nextBillingDate,
            discountId: data.discountId,
            paymentTermsDays: data.paymentTermsDays,
            templateId: data.templateId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          })
          .run();

        for (const line of data.lines) {
          tx.insert(subscriptionLines)
            .values({
              id: line.id,
              subscriptionId: data.id,
              productId: line.productId,
              variantId: line.variantId,
              quantity: line.quantity,
              unitPricePaise: line.unitPricePaise,
              taxId: line.taxId,
              createdAt: line.createdAt,
            })
            .run();
        }
      });

      const detail = await this.findSubscriptionById(data.id);
      if (!detail) {
        throw new Error("Failed to retrieve created subscription");
      }
      return detail;
    },

    async findSubscriptionById(
      id: string,
    ): Promise<SubscriptionDetailRecord | null> {
      const subRow = database
        .select({
          sub: subscriptions,
          cust: users,
          pl: plans,
        })
        .from(subscriptions)
        .innerJoin(users, eq(subscriptions.customerId, users.id))
        .innerJoin(plans, eq(subscriptions.planId, plans.id))
        .where(
          and(
            eq(subscriptions.id, id),
            isNull(subscriptions.archivedAt),
          ),
        )
        .get();

      if (!subRow) {
        return null;
      }

      const lineRows = database
        .select({
          line: subscriptionLines,
          prod: products,
          variant: productVariants,
        })
        .from(subscriptionLines)
        .innerJoin(products, eq(subscriptionLines.productId, products.id))
        .leftJoin(
          productVariants,
          eq(subscriptionLines.variantId, productVariants.id),
        )
        .where(eq(subscriptionLines.subscriptionId, id))
        .all();

      const lines: SubscriptionLineRecord[] = lineRows.map((r) => ({
        id: r.line.id,
        subscriptionId: r.line.subscriptionId,
        productId: r.line.productId,
        productName: r.prod.name,
        variantId: r.line.variantId,
        variantName: r.variant
          ? `${r.variant.attributeName}: ${r.variant.attributeValue}`
          : null,
        quantity: r.line.quantity,
        unitPricePaise: r.line.unitPricePaise,
        taxId: r.line.taxId,
        createdAt: r.line.createdAt,
      }));

      return {
        id: subRow.sub.id,
        subNumber: subRow.sub.subNumber,
        customerId: subRow.sub.customerId,
        customer: {
          id: subRow.cust.id,
          name: subRow.cust.name,
          email: subRow.cust.email,
        },
        planId: subRow.sub.planId,
        plan: {
          id: subRow.pl.id,
          name: subRow.pl.name,
          pricePaise: subRow.pl.pricePaise,
          billingPeriod: subRow.pl.billingPeriod as BillingPeriod,
          minQuantity: subRow.pl.minQuantity,
          autoCloseOnEnd: subRow.pl.autoCloseOnEnd,
          canCloseEarly: subRow.pl.canCloseEarly,
          canPause: subRow.pl.canPause,
          canRenew: subRow.pl.canRenew,
        },
        status: parseSubscriptionStatus(subRow.sub.status),
        startDate: subRow.sub.startDate,
        endDate: subRow.sub.endDate,
        nextBillingDate: subRow.sub.nextBillingDate,
        discountId: subRow.sub.discountId,
        paymentTermsDays: subRow.sub.paymentTermsDays,
        lines,
        createdAt: subRow.sub.createdAt,
        updatedAt: subRow.sub.updatedAt,
        archivedAt: subRow.sub.archivedAt,
      };
    },

    async findSubscriptionRecordById(
      id: string,
    ): Promise<SubscriptionRecord | null> {
      const row = database
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.id, id),
            isNull(subscriptions.archivedAt),
          ),
        )
        .get();

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        subNumber: row.subNumber,
        customerId: row.customerId,
        planId: row.planId,
        status: parseSubscriptionStatus(row.status),
        startDate: row.startDate,
        endDate: row.endDate,
        nextBillingDate: row.nextBillingDate,
        discountId: row.discountId,
        paymentTermsDays: row.paymentTermsDays,
        templateId: row.templateId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        archivedAt: row.archivedAt,
      };
    },

    async listSubscriptions(
      filter: ListSubscriptionsFilter,
    ): Promise<{ items: SubscriptionSummaryRecord[]; total: number }> {
      const conditions = [isNull(subscriptions.archivedAt)];

      if (filter.customerId) {
        conditions.push(eq(subscriptions.customerId, filter.customerId));
      }

      if (filter.status) {
        conditions.push(eq(subscriptions.status, filter.status));
      }

      if (filter.search) {
        const pattern = `%${filter.search}%`;
        const searchCond = or(
          like(subscriptions.subNumber, pattern),
          like(users.name, pattern),
          like(users.email, pattern),
        );
        if (searchCond) {
          conditions.push(searchCond);
        }
      }

      const whereClause = and(...conditions);

      const totalResult = database
        .select({ total: count() })
        .from(subscriptions)
        .innerJoin(users, eq(subscriptions.customerId, users.id))
        .innerJoin(plans, eq(subscriptions.planId, plans.id))
        .where(whereClause)
        .get();

      const total = totalResult?.total ?? 0;

      const rows = database
        .select({
          sub: subscriptions,
          cust: users,
          pl: plans,
        })
        .from(subscriptions)
        .innerJoin(users, eq(subscriptions.customerId, users.id))
        .innerJoin(plans, eq(subscriptions.planId, plans.id))
        .where(whereClause)
        .orderBy(desc(subscriptions.createdAt))
        .limit(filter.limit)
        .offset(filter.offset)
        .all();

      const items: SubscriptionSummaryRecord[] = rows.map((r) => ({
        id: r.sub.id,
        subNumber: r.sub.subNumber,
        customerId: r.sub.customerId,
        customerName: r.cust.name,
        customerEmail: r.cust.email,
        planId: r.sub.planId,
        planName: r.pl.name,
        status: parseSubscriptionStatus(r.sub.status),
        startDate: r.sub.startDate,
        endDate: r.sub.endDate,
        nextBillingDate: r.sub.nextBillingDate,
        discountId: r.sub.discountId,
        paymentTermsDays: r.sub.paymentTermsDays,
        createdAt: r.sub.createdAt,
        updatedAt: r.sub.updatedAt,
        archivedAt: r.sub.archivedAt,
      }));

      return { items, total };
    },

    async updateSubscriptionStatus(
      id: string,
      status: SubscriptionStatus,
      nextBillingDate: string | null | undefined,
      updatedAt: number,
    ): Promise<boolean> {
      const updateData: Record<string, unknown> = {
        status,
        updatedAt,
      };
      if (nextBillingDate !== undefined) {
        updateData["nextBillingDate"] = nextBillingDate;
      }

      const updated = database
        .update(subscriptions)
        .set(updateData)
        .where(
          and(
            eq(subscriptions.id, id),
            isNull(subscriptions.archivedAt),
          ),
        )
        .returning()
        .get();

      return Boolean(updated);
    },
  };
}
