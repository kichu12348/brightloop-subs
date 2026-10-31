import { describe, expect, it } from "bun:test";
import { buildApp } from "../../app.ts";
import { createTestDb } from "../../db/client.ts";
import { users, subscriptions, plans, invoices, payments } from "../../db/schema.ts";
import { TestClock } from "../../lib/clock.ts";
import {
  BillingPeriod,
  InvoiceStatus,
  PaymentMethod,
  Role,
  SubscriptionStatus,
} from "@brightloop/shared";

describe("Finance Dashboard Module Integration Tests", () => {
  it("computes all aggregations via SQL over indexed columns correctly", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(new Date("2026-03-15T00:00:00Z").getTime());
    const app = await buildApp({ db: testDb, clock });

    const adminToken = app.jwt.sign({
      id: "admin-1",
      email: "admin@brightloop.com",
      role: Role.Admin,
    });

    testDb
      .insert(users)
      .values({
        id: "admin-1",
        email: "admin@brightloop.com",
        passwordHash: "hash",
        role: Role.Admin,
        name: "Admin User",
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const customerId = crypto.randomUUID();
    testDb
      .insert(users)
      .values({
        id: customerId,
        email: "dashcust@brightloop.com",
        passwordHash: "hash",
        role: Role.Customer,
        name: "Dashboard Customer",
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const planId = crypto.randomUUID();
    testDb
      .insert(plans)
      .values({
        id: planId,
        name: "Dash Plan",
        pricePaise: 10000,
        billingPeriod: BillingPeriod.Monthly,
        minQuantity: 1,
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const sub1Id = crypto.randomUUID();
    const sub2Id = crypto.randomUUID();
    const sub3Id = crypto.randomUUID();

    testDb
      .insert(subscriptions)
      .values([
        {
          id: sub1Id,
          subNumber: "SUB-001001",
          customerId,
          planId,
          status: SubscriptionStatus.Active,
          startDate: "2026-01-01",
          nextBillingDate: "2026-04-01",
          paymentTermsDays: 30,
          createdAt: clock.nowMs(),
          updatedAt: clock.nowMs(),
        },
        {
          id: sub2Id,
          subNumber: "SUB-001002",
          customerId,
          planId,
          status: SubscriptionStatus.Active,
          startDate: "2026-02-01",
          nextBillingDate: "2026-04-01",
          paymentTermsDays: 30,
          createdAt: clock.nowMs(),
          updatedAt: clock.nowMs(),
        },
        {
          id: sub3Id,
          subNumber: "SUB-001003",
          customerId,
          planId,
          status: SubscriptionStatus.Closed,
          startDate: "2026-01-01",
          nextBillingDate: null,
          paymentTermsDays: 30,
          createdAt: clock.nowMs(),
          updatedAt: clock.nowMs(),
        },
      ])
      .run();

    const inv1Id = crypto.randomUUID();
    const inv2Id = crypto.randomUUID();
    const inv3Id = crypto.randomUUID();

    testDb
      .insert(invoices)
      .values([
        {
          id: inv1Id,
          subscriptionId: sub1Id,
          customerId,
          status: InvoiceStatus.Paid,
          periodStart: "2026-01-01",
          periodEnd: "2026-02-01",
          dueDate: "2026-01-31",
          subtotalPaise: 10000,
          discountPaise: 0,
          taxPaise: 0,
          totalPaise: 10000,
          amountPaidPaise: 10000,
          createdAt: clock.nowMs(),
          updatedAt: clock.nowMs(),
        },
        {
          id: inv2Id,
          subscriptionId: sub1Id,
          customerId,
          status: InvoiceStatus.Confirmed,
          periodStart: "2026-02-01",
          periodEnd: "2026-03-01",
          dueDate: "2026-03-01",
          subtotalPaise: 10000,
          discountPaise: 0,
          taxPaise: 0,
          totalPaise: 10000,
          amountPaidPaise: 2000,
          createdAt: clock.nowMs(),
          updatedAt: clock.nowMs(),
        },
        {
          id: inv3Id,
          subscriptionId: sub2Id,
          customerId,
          status: InvoiceStatus.Confirmed,
          periodStart: "2026-03-01",
          periodEnd: "2026-04-01",
          dueDate: "2026-03-31",
          subtotalPaise: 10000,
          discountPaise: 0,
          taxPaise: 0,
          totalPaise: 10000,
          amountPaidPaise: 0,
          createdAt: clock.nowMs(),
          updatedAt: clock.nowMs(),
        },
      ])
      .run();

    testDb
      .insert(payments)
      .values([
        {
          id: crypto.randomUUID(),
          invoiceId: inv1Id,
          customerId,
          amountPaise: 10000,
          method: PaymentMethod.Card,
          reference: "Full payment",
          paymentDate: "2026-01-15",
          recordedBy: "admin-1",
          createdAt: clock.nowMs(),
        },
        {
          id: crypto.randomUUID(),
          invoiceId: inv2Id,
          customerId,
          amountPaise: 2000,
          method: PaymentMethod.Upi,
          reference: "Partial payment",
          paymentDate: "2026-02-15",
          recordedBy: "admin-1",
          createdAt: clock.nowMs(),
        },
      ])
      .run();

    const summaryRes = await app.inject({
      method: "GET",
      url: "/api/dashboard/summary",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(summaryRes.statusCode).toBe(200);
    const summary = JSON.parse(summaryRes.body) as {
      activeSubscriptionsCount: number;
      totalSubscriptionsByStatus: Record<string, number>;
      totalRevenueCollectedPaise: number;
      totalOutstandingPaise: number;
      overdueInvoicesCount: number;
      overdueAmountPaise: number;
      recentOverdueInvoices: Array<{ id: string; dueDate: string }>;
    };

    expect(summary.activeSubscriptionsCount).toBe(2);
    expect(summary.totalSubscriptionsByStatus[SubscriptionStatus.Active]).toBe(2);
    expect(summary.totalSubscriptionsByStatus[SubscriptionStatus.Closed]).toBe(1);

    expect(summary.totalRevenueCollectedPaise).toBe(12000);

    expect(summary.totalOutstandingPaise).toBe(18000);

    expect(summary.overdueInvoicesCount).toBe(1);
    expect(summary.overdueAmountPaise).toBe(8000);

    expect(summary.recentOverdueInvoices).toHaveLength(1);
    expect(summary.recentOverdueInvoices[0]?.id).toBe(inv2Id);
    expect(summary.recentOverdueInvoices[0]?.dueDate).toBe("2026-03-01");

    const customerToken = app.jwt.sign({
      id: customerId,
      email: "dashcust@brightloop.com",
      role: Role.Customer,
    });
    const customerRes = await app.inject({
      method: "GET",
      url: "/api/dashboard/summary",
      headers: { authorization: `Bearer ${customerToken}` },
    });
    expect(customerRes.statusCode).toBe(403);
  });
});
