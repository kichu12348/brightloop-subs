import { Type, type Static } from "@sinclair/typebox";
import { InvoiceSummarySchema } from "./invoices.ts";

export const DashboardSummarySchema = Type.Object(
  {
    activeSubscriptionsCount: Type.Integer({ minimum: 0 }),
    totalSubscriptionsByStatus: Type.Record(
      Type.String(),
      Type.Integer({ minimum: 0 }),
    ),
    totalRevenueCollectedPaise: Type.Integer({ minimum: 0 }),
    totalOutstandingPaise: Type.Integer({ minimum: 0 }),
    overdueInvoicesCount: Type.Integer({ minimum: 0 }),
    overdueAmountPaise: Type.Integer({ minimum: 0 }),
    recentOverdueInvoices: Type.Array(InvoiceSummarySchema),
  },
  { additionalProperties: false },
);
export type DashboardSummary = Static<typeof DashboardSummarySchema>;

