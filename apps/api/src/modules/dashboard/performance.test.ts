import { describe, expect, it } from "bun:test";
import { buildApp } from "../../app.ts";
import { createTestDb } from "../../db/client.ts";
import { TestClock } from "../../lib/clock.ts";
import { seedDatabase } from "../../db/seed.ts";
import { Role } from "@brightloop/shared";

describe("Scale & Performance Benchmark Tests (5,000+ Subscriptions)", () => {
  it("executes all four critical read and write endpoints under the 300ms budget", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(new Date("2026-03-15T00:00:00Z").getTime());
    const app = await buildApp({ db: testDb, clock });

    const seedResult = await seedDatabase(testDb, {
      todayIso: clock.todayIso(),
      nowMs: clock.nowMs(),
    });

    expect(seedResult.subscriptionsCount).toBeGreaterThanOrEqual(5000);
    expect(seedResult.invoicesCount).toBeGreaterThanOrEqual(5000);

    const adminToken = app.jwt.sign({
      id: "user-admin-1",
      email: "admin@brightloop.test",
      role: Role.Admin,
    });

    const summaryStart = performance.now();
    const summaryRes = await app.inject({
      method: "GET",
      url: "/api/dashboard/summary",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const summaryElapsed = performance.now() - summaryStart;

    expect(summaryRes.statusCode).toBe(200);
    expect(summaryElapsed).toBeLessThan(300);

    const summaryData = JSON.parse(summaryRes.body) as {
      activeSubscriptionsCount: number;
      overdueInvoicesCount: number;
      totalRevenueCollectedPaise: number;
    };
    expect(summaryData.activeSubscriptionsCount).toBe(3500);
    expect(summaryData.overdueInvoicesCount).toBe(800);
    expect(summaryData.totalRevenueCollectedPaise).toBeGreaterThan(0);

    const subsStart = performance.now();
    const subsRes = await app.inject({
      method: "GET",
      url: "/api/subscriptions?page=1&pageSize=20&status=Active",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const subsElapsed = performance.now() - subsStart;

    expect(subsRes.statusCode).toBe(200);
    expect(subsElapsed).toBeLessThan(300);

    const subsData = JSON.parse(subsRes.body) as {
      items: unknown[];
      total: number;
      page: number;
      pageSize: number;
    };
    expect(subsData.items.length).toBe(20);
    expect(subsData.total).toBe(3500);
    expect(subsData.page).toBe(1);
    expect(subsData.pageSize).toBe(20);

    const invoicesStart = performance.now();
    const invoicesRes = await app.inject({
      method: "GET",
      url: "/api/invoices?page=1&pageSize=20&overdueOnly=true",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const invoicesElapsed = performance.now() - invoicesStart;

    expect(invoicesRes.statusCode).toBe(200);
    expect(invoicesElapsed).toBeLessThan(300);

    const invoicesData = JSON.parse(invoicesRes.body) as {
      items: unknown[];
      total: number;
      page: number;
      pageSize: number;
    };
    expect(invoicesData.items.length).toBe(20);
    expect(invoicesData.total).toBe(800);
    expect(invoicesData.page).toBe(1);
    expect(invoicesData.pageSize).toBe(20);

    const billingStart = performance.now();
    const billingRes = await app.inject({
      method: "POST",
      url: "/api/billing/run",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {},
    });
    const billingElapsed = performance.now() - billingStart;

    expect(billingRes.statusCode).toBe(200);
    expect(billingElapsed).toBeLessThan(300);

    const billingData = JSON.parse(billingRes.body) as {
      processedCount: number;
      invoicesCreated: number;
      failures: unknown[];
    };
    expect(billingData.processedCount).toBe(150);
    expect(billingData.invoicesCreated).toBe(150);
    expect(billingData.failures.length).toBe(0);
  });
});

