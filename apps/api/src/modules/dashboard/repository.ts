import { eq, and, isNull, lt, count, desc, sql } from "drizzle-orm";
import type { AppDatabase } from "../../db/client.ts";
import { subscriptions, invoices, payments, users } from "../../db/schema.ts";
import {
  type DashboardSummary,
  type InvoiceSummary,
  SubscriptionStatus,
  InvoiceStatus,
} from "@brightloop/shared";

export interface DashboardRepository {
  getSummary(todayIso: string): Promise<DashboardSummary>;
}

export function createSqliteDashboardRepository(
  database: AppDatabase,
): DashboardRepository {
  return {
    async getSummary(todayIso: string): Promise<DashboardSummary> {
      const activeRes = database
        .select({ total: count() })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.status, SubscriptionStatus.Active),
            isNull(subscriptions.archivedAt),
          ),
        )
        .get();

      const statusRows = database
        .select({
          status: subscriptions.status,
          total: count(),
        })
        .from(subscriptions)
        .where(isNull(subscriptions.archivedAt))
        .groupBy(subscriptions.status)
        .all();

      const totalSubscriptionsByStatus: Record<string, number> = {};
      for (const row of statusRows) {
        totalSubscriptionsByStatus[row.status] = row.total;
      }

      const revRes = database
        .select({
          total: sql<number>`coalesce(sum(${payments.amountPaise}), 0)`,
        })
        .from(payments)
        .get();

      const outRes = database
        .select({
          total: sql<number>`coalesce(sum(${invoices.totalPaise} - ${invoices.amountPaidPaise}), 0)`,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.status, InvoiceStatus.Confirmed),
            isNull(invoices.archivedAt),
          ),
        )
        .get();

      const overdueRes = database
        .select({
          totalCount: count(),
          totalAmount: sql<number>`coalesce(sum(${invoices.totalPaise} - ${invoices.amountPaidPaise}), 0)`,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.status, InvoiceStatus.Confirmed),
            lt(invoices.dueDate, todayIso),
            isNull(invoices.archivedAt),
          ),
        )
        .get();

      const overdueRows = database
        .select({
          inv: invoices,
          cust: users,
        })
        .from(invoices)
        .innerJoin(users, eq(invoices.customerId, users.id))
        .where(
          and(
            eq(invoices.status, InvoiceStatus.Confirmed),
            lt(invoices.dueDate, todayIso),
            isNull(invoices.archivedAt),
          ),
        )
        .orderBy(desc(invoices.dueDate))
        .limit(10)
        .all();

      const recentOverdueInvoices: InvoiceSummary[] = overdueRows.map((r) => ({
        id: r.inv.id,
        subscriptionId: r.inv.subscriptionId,
        customerId: r.inv.customerId,
        customerName: r.cust.name,
        customerEmail: r.cust.email,
        status: r.inv.status as InvoiceStatus,
        periodStart: r.inv.periodStart,
        periodEnd: r.inv.periodEnd,
        dueDate: r.inv.dueDate,
        subtotalPaise: r.inv.subtotalPaise,
        discountPaise: r.inv.discountPaise,
        taxPaise: r.inv.taxPaise,
        totalPaise: r.inv.totalPaise,
        amountPaidPaise: r.inv.amountPaidPaise,
        createdAt: r.inv.createdAt,
        updatedAt: r.inv.updatedAt,
        archivedAt: r.inv.archivedAt,
      }));

      return {
        activeSubscriptionsCount: activeRes?.total ?? 0,
        totalSubscriptionsByStatus,
        totalRevenueCollectedPaise: revRes?.total ?? 0,
        totalOutstandingPaise: outRes?.total ?? 0,
        overdueInvoicesCount: overdueRes?.totalCount ?? 0,
        overdueAmountPaise: overdueRes?.totalAmount ?? 0,
        recentOverdueInvoices,
      };
    },
  };
}

