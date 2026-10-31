import { describe, expect, it } from "bun:test";
import { buildApp } from "../../app.ts";
import { createTestDb } from "../../db/client.ts";
import { users, discounts } from "../../db/schema.ts";
import { TestClock } from "../../lib/clock.ts";
import {
  BillingPeriod,
  DiscountKind,
  DiscountScope,
  ProductType,
  Role,
  SubscriptionStatus,
} from "@brightloop/shared";
import { startBillingScheduler } from "./scheduler.ts";
import { eq } from "drizzle-orm";

describe("Idempotent Billing Engine & Scheduler Integration Tests", () => {
  it("enforces Invariant #1 & #2: runs billing idempotently twice on same date with zero duplicates", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(new Date("2026-01-01T00:00:00Z").getTime());
    const app = await buildApp({ db: testDb, clock });

    const adminToken = app.jwt.sign({
      id: "admin-1",
      email: "admin@brightloop.com",
      role: Role.Admin,
    });

    const customerId = crypto.randomUUID();
    testDb
      .insert(users)
      .values({
        id: customerId,
        email: "customer-bill@brightloop.com",
        passwordHash: "hash",
        role: Role.Customer,
        name: "Billing Test Customer",
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const prodRes = await app.inject({
      method: "POST",
      url: "/api/products",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "SaaS App",
        type: ProductType.Subscription,
        salesPricePaise: 10000,
        costPricePaise: 3000,
        variants: [],
      },
    });
    const product = JSON.parse(prodRes.body) as { id: string };

    const planRes = await app.inject({
      method: "POST",
      url: "/api/plans",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Monthly 100",
        pricePaise: 10000,
        billingPeriod: BillingPeriod.Monthly,
        minQuantity: 1,
      },
    });
    const plan = JSON.parse(planRes.body) as { id: string };

    const discRes = await app.inject({
      method: "POST",
      url: "/api/discounts",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Welcome fixed discount",
        kind: DiscountKind.Fixed,
        value: 2000,
        scope: DiscountScope.Subscription,
        maxUses: 5,
      },
    });
    const discount = JSON.parse(discRes.body) as { id: string };

    const subRes = await app.inject({
      method: "POST",
      url: "/api/subscriptions",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        customerId,
        planId: plan.id,
        discountId: discount.id,
        startDate: "2026-01-01",
        lines: [{ productId: product.id, quantity: 1 }],
      },
    });
    const sub = JSON.parse(subRes.body) as { id: string };

    await app.inject({
      method: "POST",
      url: `/api/subscriptions/${sub.id}/transition`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: SubscriptionStatus.Quotation },
    });
    await app.inject({
      method: "POST",
      url: `/api/subscriptions/${sub.id}/transition`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: SubscriptionStatus.Confirmed },
    });
    await app.inject({
      method: "POST",
      url: `/api/subscriptions/${sub.id}/transition`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: SubscriptionStatus.Active },
    });

    const run1Res = await app.inject({
      method: "POST",
      url: "/api/billing/run",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { targetDate: "2026-01-01" },
    });
    expect(run1Res.statusCode).toBe(200);
    const run1 = JSON.parse(run1Res.body) as {
      processedCount: number;
      invoicesCreated: number;
      skippedDuplicates: number;
      failures: unknown[];
    };
    expect(run1.processedCount).toBe(1);
    expect(run1.invoicesCreated).toBe(1);
    expect(run1.skippedDuplicates).toBe(0);
    expect(run1.failures).toHaveLength(0);

    const discRow1 = testDb
      .select()
      .from(discounts)
      .where(eq(discounts.id, discount.id))
      .get();
    expect(discRow1?.timesUsed).toBe(1);

    const run2Res = await app.inject({
      method: "POST",
      url: "/api/billing/run",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { targetDate: "2026-01-01" },
    });
    expect(run2Res.statusCode).toBe(200);
    const run2 = JSON.parse(run2Res.body) as {
      invoicesCreated: number;
      skippedDuplicates: number;
      failures: unknown[];
    };
    expect(run2.invoicesCreated).toBe(0);
    expect(run2.skippedDuplicates).toBe(0);
    expect(run2.failures).toHaveLength(0);

    const discRow2 = testDb
      .select()
      .from(discounts)
      .where(eq(discounts.id, discount.id))
      .get();
    expect(discRow2?.timesUsed).toBe(1);
  });

  it("handles multi-period catch-up when targetDate is 3 months ahead and exhausts discount at maxUses", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(new Date("2026-01-01T00:00:00Z").getTime());
    const app = await buildApp({ db: testDb, clock });

    const adminToken = app.jwt.sign({
      id: "admin-1",
      email: "admin@brightloop.com",
      role: Role.Admin,
    });

    const customerId = crypto.randomUUID();
    testDb
      .insert(users)
      .values({
        id: customerId,
        email: "catchup@brightloop.com",
        passwordHash: "hash",
        role: Role.Customer,
        name: "Catchup Customer",
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const prodRes = await app.inject({
      method: "POST",
      url: "/api/products",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Database Cluster",
        type: ProductType.Subscription,
        salesPricePaise: 20000,
        costPricePaise: 8000,
        variants: [],
      },
    });
    const product = JSON.parse(prodRes.body) as { id: string };

    const planRes = await app.inject({
      method: "POST",
      url: "/api/plans",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Monthly DB",
        pricePaise: 20000,
        billingPeriod: BillingPeriod.Monthly,
        minQuantity: 1,
      },
    });
    const plan = JSON.parse(planRes.body) as { id: string };

    const discRes = await app.inject({
      method: "POST",
      url: "/api/discounts",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "First 2 Months Discount",
        kind: DiscountKind.Fixed,
        value: 5000,
        scope: DiscountScope.Subscription,
        maxUses: 2,
      },
    });
    const discount = JSON.parse(discRes.body) as { id: string };

    const subRes = await app.inject({
      method: "POST",
      url: "/api/subscriptions",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        customerId,
        planId: plan.id,
        discountId: discount.id,
        startDate: "2026-01-01",
        lines: [{ productId: product.id, quantity: 1 }],
      },
    });
    const sub = JSON.parse(subRes.body) as { id: string };

    await app.inject({
      method: "POST",
      url: `/api/subscriptions/${sub.id}/transition`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: SubscriptionStatus.Quotation },
    });
    await app.inject({
      method: "POST",
      url: `/api/subscriptions/${sub.id}/transition`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: SubscriptionStatus.Confirmed },
    });
    await app.inject({
      method: "POST",
      url: `/api/subscriptions/${sub.id}/transition`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: SubscriptionStatus.Active },
    });

    const catchupRes = await app.inject({
      method: "POST",
      url: "/api/billing/run",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { targetDate: "2026-04-01" },
    });
    expect(catchupRes.statusCode).toBe(200);
    const catchup = JSON.parse(catchupRes.body) as {
      invoicesCreated: number;
      failures: unknown[];
    };
    expect(catchup.invoicesCreated).toBe(4);
    expect(catchup.failures).toHaveLength(0);

    const discRow = testDb
      .select()
      .from(discounts)
      .where(eq(discounts.id, discount.id))
      .get();
    expect(discRow?.timesUsed).toBe(2);

    const invoicesRes = await app.inject({
      method: "GET",
      url: `/api/invoices?customerId=${customerId}&pageSize=10`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(invoicesRes.statusCode).toBe(200);
    const invoicesBody = JSON.parse(invoicesRes.body) as {
      items: Array<{
        periodStart: string;
        discountPaise: number;
        totalPaise: number;
      }>;
      total: number;
    };

    expect(invoicesBody.total).toBe(4);

    const period1 = invoicesBody.items.find((i) => i.periodStart === "2026-01-01");
    const period2 = invoicesBody.items.find((i) => i.periodStart === "2026-02-01");
    const period3 = invoicesBody.items.find((i) => i.periodStart === "2026-03-01");
    const period4 = invoicesBody.items.find((i) => i.periodStart === "2026-04-01");

    expect(period1?.discountPaise).toBe(5000);
    expect(period1?.totalPaise).toBe(15000);

    expect(period2?.discountPaise).toBe(5000);
    expect(period2?.totalPaise).toBe(15000);

    expect(period3?.discountPaise).toBe(0);
    expect(period3?.totalPaise).toBe(20000);

    expect(period4?.discountPaise).toBe(0);
    expect(period4?.totalPaise).toBe(20000);
  });

  it("auto-closes subscription when expiryDate is reached and autoCloseOnEnd is true", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(new Date("2026-01-01T00:00:00Z").getTime());
    const app = await buildApp({ db: testDb, clock });

    const adminToken = app.jwt.sign({
      id: "admin-1",
      email: "admin@brightloop.com",
      role: Role.Admin,
    });

    const customerId = crypto.randomUUID();
    testDb
      .insert(users)
      .values({
        id: customerId,
        email: "autoclose@brightloop.com",
        passwordHash: "hash",
        role: Role.Customer,
        name: "Auto-close Customer",
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const prodRes = await app.inject({
      method: "POST",
      url: "/api/products",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Fixed Term Subscription",
        type: ProductType.Subscription,
        salesPricePaise: 8000,
        costPricePaise: 3000,
        variants: [],
      },
    });
    const product = JSON.parse(prodRes.body) as { id: string };

    const planRes = await app.inject({
      method: "POST",
      url: "/api/plans",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Fixed Term Plan",
        pricePaise: 8000,
        billingPeriod: BillingPeriod.Monthly,
        minQuantity: 1,
        autoCloseOnEnd: true,
      },
    });
    const plan = JSON.parse(planRes.body) as { id: string };

    const subRes = await app.inject({
      method: "POST",
      url: "/api/subscriptions",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        customerId,
        planId: plan.id,
        startDate: "2026-01-01",
        expiryDate: "2026-03-01",
        lines: [{ productId: product.id, quantity: 1 }],
      },
    });
    const sub = JSON.parse(subRes.body) as { id: string };

    await app.inject({
      method: "POST",
      url: `/api/subscriptions/${sub.id}/transition`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: SubscriptionStatus.Quotation },
    });
    await app.inject({
      method: "POST",
      url: `/api/subscriptions/${sub.id}/transition`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: SubscriptionStatus.Confirmed },
    });
    await app.inject({
      method: "POST",
      url: `/api/subscriptions/${sub.id}/transition`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: SubscriptionStatus.Active },
    });

    const runRes = await app.inject({
      method: "POST",
      url: "/api/billing/run",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { targetDate: "2026-03-01" },
    });
    expect(runRes.statusCode).toBe(200);
    const runResult = JSON.parse(runRes.body) as {
      invoicesCreated: number;
      subscriptionsClosed: number;
    };

    expect(runResult.invoicesCreated).toBe(2);
    expect(runResult.subscriptionsClosed).toBe(1);

    const getSubRes = await app.inject({
      method: "GET",
      url: `/api/subscriptions/${sub.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const subDetail = JSON.parse(getSubRes.body) as { status: string };
    expect(subDetail.status).toBe(SubscriptionStatus.Closed);
  });

  it("creates scheduler with protect: true and stops cleanly", () => {
    const scheduler = startBillingScheduler({
      runBilling: async () => ({
        targetDate: "2026-01-01",
        processedCount: 0,
        invoicesCreated: 0,
        subscriptionsClosed: 0,
        skippedDuplicates: 0,
        failures: [],
      }),
    });
    expect(scheduler).toBeDefined();
    scheduler.stop();
  });
});

