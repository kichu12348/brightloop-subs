import { describe, expect, it } from "bun:test";
import { buildApp } from "../../app.ts";
import { createTestDb } from "../../db/client.ts";
import { users } from "../../db/schema.ts";
import { TestClock } from "../../lib/clock.ts";
import {
  BillingPeriod,
  ProductType,
  Role,
  SubscriptionStatus,
  ErrorCode,
} from "@brightloop/shared";

describe("Subscriptions Module Integration Tests", () => {
  it("creates a subscription from a Quotation Template and steps through Quotation -> Confirmed -> Active", async () => {
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
        email: "customer@brightloop.com",
        passwordHash: "hash",
        role: Role.Customer,
        name: "Acme Corp",
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const prodRes = await app.inject({
      method: "POST",
      url: "/api/products",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Cloud Hosting",
        type: ProductType.Subscription,
        salesPricePaise: 50000,
        costPricePaise: 20000,
        variants: [
          {
            attributeName: "Storage",
            attributeValue: "1TB",
            extraPricePaise: 15000,
          },
        ],
      },
    });
    expect(prodRes.statusCode).toBe(201);
    const product = JSON.parse(prodRes.body) as {
      id: string;
      variants: Array<{ id: string }>;
    };
    const variantId = product.variants[0]?.id;

    const planRes = await app.inject({
      method: "POST",
      url: "/api/plans",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Monthly Pro",
        pricePaise: 50000,
        billingPeriod: BillingPeriod.Monthly,
        minQuantity: 1,
        canPause: true,
        canCloseEarly: true,
        canRenew: true,
      },
    });
    expect(planRes.statusCode).toBe(201);
    const plan = JSON.parse(planRes.body) as { id: string };

    const taxRes = await app.inject({
      method: "POST",
      url: "/api/taxes",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "GST 18%",
        rateBps: 1800,
        isActive: true,
      },
    });
    expect(taxRes.statusCode).toBe(201);
    const tax = JSON.parse(taxRes.body) as { id: string };

    const tplRes = await app.inject({
      method: "POST",
      url: "/api/quotation-templates",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Standard Cloud Plan",
        planId: plan.id,
        validityDays: 30,
        lines: [
          {
            productId: product.id,
            variantId,
            quantity: 2,
            taxId: tax.id,
          },
        ],
      },
    });
    expect(tplRes.statusCode).toBe(201);
    const template = JSON.parse(tplRes.body) as { id: string };

    const createSubRes = await app.inject({
      method: "POST",
      url: "/api/subscriptions",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        customerId,
        templateId: template.id,
        startDate: "2026-01-01",
      },
    });
    expect(createSubRes.statusCode).toBe(201);
    const sub = JSON.parse(createSubRes.body) as {
      id: string;
      subNumber: string;
      status: string;
      startDate: string;
      endDate: string;
      nextBillingDate: string;
      lines: Array<{
        unitPricePaise: number;
        quantity: number;
      }>;
    };

    expect(sub.subNumber).toMatch(/^SUB-/);
    expect(sub.status).toBe(SubscriptionStatus.Quotation);
    expect(sub.startDate).toBe("2026-01-01");
    expect(sub.endDate).toBe("2026-01-31");
    expect(sub.nextBillingDate).toBe("2026-01-01");
    expect(sub.lines).toHaveLength(1);
    expect(sub.lines[0]?.unitPricePaise).toBe(65000);
    expect(sub.lines[0]?.quantity).toBe(2);

    const confirmRes = await app.inject({
      method: "POST",
      url: `/api/subscriptions/${sub.id}/transition`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: SubscriptionStatus.Confirmed },
    });
    expect(confirmRes.statusCode).toBe(200);
    const confirmedSub = JSON.parse(confirmRes.body) as { status: string };
    expect(confirmedSub.status).toBe(SubscriptionStatus.Confirmed);

    const activateRes = await app.inject({
      method: "POST",
      url: `/api/subscriptions/${sub.id}/transition`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: SubscriptionStatus.Active },
    });
    expect(activateRes.statusCode).toBe(200);
    const activeSub = JSON.parse(activateRes.body) as {
      status: string;
      nextBillingDate: string;
    };
    expect(activeSub.status).toBe(SubscriptionStatus.Active);
    expect(activeSub.nextBillingDate).toBe("2026-01-01");
  });

  it("enforces plan lifecycle rules and rejects invalid pauses with 422 PLAN_RULE_VIOLATION", async () => {
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
        email: "cust2@brightloop.com",
        passwordHash: "hash",
        role: Role.Customer,
        name: "Non-Pausable Customer",
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const prodRes = await app.inject({
      method: "POST",
      url: "/api/products",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Basic Server",
        type: ProductType.Subscription,
        salesPricePaise: 10000,
        costPricePaise: 5000,
        variants: [],
      },
    });
    const product = JSON.parse(prodRes.body) as { id: string };

    const planRes = await app.inject({
      method: "POST",
      url: "/api/plans",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Strict Non-Pausable Plan",
        pricePaise: 10000,
        billingPeriod: BillingPeriod.Monthly,
        minQuantity: 1,
        canPause: false,
        canCloseEarly: false,
      },
    });
    const plan = JSON.parse(planRes.body) as { id: string };

    const createRes = await app.inject({
      method: "POST",
      url: "/api/subscriptions",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        customerId,
        planId: plan.id,
        startDate: "2026-01-01",
        lines: [{ productId: product.id, quantity: 1 }],
      },
    });
    expect(createRes.statusCode).toBe(201);
    const sub = JSON.parse(createRes.body) as { id: string };

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

    const pauseRes = await app.inject({
      method: "POST",
      url: `/api/subscriptions/${sub.id}/transition`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: SubscriptionStatus.Paused },
    });
    expect(pauseRes.statusCode).toBe(422);
    const err = JSON.parse(pauseRes.body) as {
      error: { code: string; message: string };
    };
    expect(err.error.code).toBe(ErrorCode.PlanRuleViolation);
  });

  it("enforces customer isolation: Customer A receives 404 when requesting Customer B's subscription", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(new Date("2026-01-01T00:00:00Z").getTime());
    const app = await buildApp({ db: testDb, clock });

    const adminToken = app.jwt.sign({
      id: "admin-1",
      email: "admin@brightloop.com",
      role: Role.Admin,
    });

    const customerAId = crypto.randomUUID();
    const customerBId = crypto.randomUUID();

    testDb
      .insert(users)
      .values([
        {
          id: customerAId,
          email: "customera@brightloop.com",
          passwordHash: "hash",
          role: Role.Customer,
          name: "Customer A",
          createdAt: clock.nowMs(),
          updatedAt: clock.nowMs(),
        },
        {
          id: customerBId,
          email: "customerb@brightloop.com",
          passwordHash: "hash",
          role: Role.Customer,
          name: "Customer B",
          createdAt: clock.nowMs(),
          updatedAt: clock.nowMs(),
        },
      ])
      .run();

    const customerAToken = app.jwt.sign({
      id: customerAId,
      email: "customera@brightloop.com",
      role: Role.Customer,
    });

    const prodRes = await app.inject({
      method: "POST",
      url: "/api/products",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Widget",
        type: ProductType.Subscription,
        salesPricePaise: 5000,
        costPricePaise: 2000,
        variants: [],
      },
    });
    const product = JSON.parse(prodRes.body) as { id: string };

    const planRes = await app.inject({
      method: "POST",
      url: "/api/plans",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Standard",
        pricePaise: 5000,
        billingPeriod: BillingPeriod.Monthly,
        minQuantity: 1,
      },
    });
    const plan = JSON.parse(planRes.body) as { id: string };

    const subBRes = await app.inject({
      method: "POST",
      url: "/api/subscriptions",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        customerId: customerBId,
        planId: plan.id,
        startDate: "2026-01-01",
        lines: [{ productId: product.id, quantity: 1 }],
      },
    });
    expect(subBRes.statusCode).toBe(201);
    const subB = JSON.parse(subBRes.body) as { id: string };

    const getRes = await app.inject({
      method: "GET",
      url: `/api/subscriptions/${subB.id}`,
      headers: { authorization: `Bearer ${customerAToken}` },
    });
    expect(getRes.statusCode).toBe(404);

    const listRes = await app.inject({
      method: "GET",
      url: "/api/subscriptions",
      headers: { authorization: `Bearer ${customerAToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.body) as {
      items: unknown[];
      total: number;
    };
    expect(listBody.total).toBe(0);
    expect(listBody.items).toHaveLength(0);
  });
});

