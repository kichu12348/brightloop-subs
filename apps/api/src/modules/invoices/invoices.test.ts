import { describe, expect, it } from "bun:test";
import { buildApp } from "../../app.ts";
import { createTestDb } from "../../db/client.ts";
import { users, invoices, subscriptions, plans } from "../../db/schema.ts";
import { TestClock } from "../../lib/clock.ts";
import {
  InvoiceStatus,
  PaymentMethod,
  Role,
  SubscriptionStatus,
  BillingPeriod,
  ErrorCode,
} from "@brightloop/shared";

describe("Invoices & Payments Module Integration Tests", () => {
  it("enforces customer isolation: Customer A receives 404 when requesting Customer B's invoice", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(new Date("2026-01-01T00:00:00Z").getTime());
    const app = await buildApp({ db: testDb, clock });

    const customerAId = crypto.randomUUID();
    const customerBId = crypto.randomUUID();

    testDb
      .insert(users)
      .values([
        {
          id: customerAId,
          email: "inva@brightloop.com",
          passwordHash: "hash",
          role: Role.Customer,
          name: "Customer A",
          createdAt: clock.nowMs(),
          updatedAt: clock.nowMs(),
        },
        {
          id: customerBId,
          email: "invb@brightloop.com",
          passwordHash: "hash",
          role: Role.Customer,
          name: "Customer B",
          createdAt: clock.nowMs(),
          updatedAt: clock.nowMs(),
        },
      ])
      .run();

    const planId = crypto.randomUUID();
    testDb
      .insert(plans)
      .values({
        id: planId,
        name: "Test Plan",
        pricePaise: 10000,
        billingPeriod: BillingPeriod.Monthly,
        minQuantity: 1,
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const subBId = crypto.randomUUID();
    testDb
      .insert(subscriptions)
      .values({
        id: subBId,
        subNumber: "SUB-000099",
        customerId: customerBId,
        planId,
        status: SubscriptionStatus.Active,
        startDate: "2026-01-01",
        nextBillingDate: "2026-02-01",
        paymentTermsDays: 30,
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const invoiceBId = crypto.randomUUID();
    testDb
      .insert(invoices)
      .values({
        id: invoiceBId,
        subscriptionId: subBId,
        customerId: customerBId,
        status: InvoiceStatus.Confirmed,
        periodStart: "2026-01-01",
        periodEnd: "2026-02-01",
        dueDate: "2026-01-31",
        subtotalPaise: 10000,
        discountPaise: 0,
        taxPaise: 0,
        totalPaise: 10000,
        amountPaidPaise: 0,
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const customerAToken = app.jwt.sign({
      id: customerAId,
      email: "inva@brightloop.com",
      role: Role.Customer,
    });

    const getRes = await app.inject({
      method: "GET",
      url: `/api/invoices/${invoiceBId}`,
      headers: { authorization: `Bearer ${customerAToken}` },
    });
    expect(getRes.statusCode).toBe(404);

    const listRes = await app.inject({
      method: "GET",
      url: "/api/invoices",
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

  it("handles invoice transitions and disallows manual transition to Paid", async () => {
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
        email: "trans@brightloop.com",
        passwordHash: "hash",
        role: Role.Customer,
        name: "Transition Customer",
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const planId = crypto.randomUUID();
    testDb
      .insert(plans)
      .values({
        id: planId,
        name: "Test Plan",
        pricePaise: 10000,
        billingPeriod: BillingPeriod.Monthly,
        minQuantity: 1,
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const subId = crypto.randomUUID();
    testDb
      .insert(subscriptions)
      .values({
        id: subId,
        subNumber: "SUB-000100",
        customerId,
        planId,
        status: SubscriptionStatus.Active,
        startDate: "2026-01-01",
        nextBillingDate: "2026-02-01",
        paymentTermsDays: 30,
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const invId = crypto.randomUUID();
    testDb
      .insert(invoices)
      .values({
        id: invId,
        subscriptionId: subId,
        customerId,
        status: InvoiceStatus.Draft,
        periodStart: "2026-01-01",
        periodEnd: "2026-02-01",
        dueDate: "2026-01-31",
        subtotalPaise: 10000,
        discountPaise: 0,
        taxPaise: 0,
        totalPaise: 10000,
        amountPaidPaise: 0,
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const confirmRes = await app.inject({
      method: "POST",
      url: `/api/invoices/${invId}/transition`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: InvoiceStatus.Confirmed },
    });
    expect(confirmRes.statusCode).toBe(200);
    const confirmed = JSON.parse(confirmRes.body) as { status: string };
    expect(confirmed.status).toBe(InvoiceStatus.Confirmed);

    const paidRes = await app.inject({
      method: "POST",
      url: `/api/invoices/${invId}/transition`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: InvoiceStatus.Paid },
    });
    expect(paidRes.statusCode).toBe(400);
  });

  it("records partial payments, rejects OVERPAYMENT with 422, and auto-transitions to Paid on full balance", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(new Date("2026-01-01T00:00:00Z").getTime());
    const app = await buildApp({ db: testDb, clock });

    const customerId = crypto.randomUUID();
    testDb
      .insert(users)
      .values({
        id: customerId,
        email: "payer@brightloop.com",
        passwordHash: "hash",
        role: Role.Customer,
        name: "Payer Customer",
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const customerToken = app.jwt.sign({
      id: customerId,
      email: "payer@brightloop.com",
      role: Role.Customer,
    });

    const planId = crypto.randomUUID();
    testDb
      .insert(plans)
      .values({
        id: planId,
        name: "Payment Plan",
        pricePaise: 10000,
        billingPeriod: BillingPeriod.Monthly,
        minQuantity: 1,
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const subId = crypto.randomUUID();
    testDb
      .insert(subscriptions)
      .values({
        id: subId,
        subNumber: "SUB-000101",
        customerId,
        planId,
        status: SubscriptionStatus.Active,
        startDate: "2026-01-01",
        nextBillingDate: "2026-02-01",
        paymentTermsDays: 30,
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const invId = crypto.randomUUID();
    testDb
      .insert(invoices)
      .values({
        id: invId,
        subscriptionId: subId,
        customerId,
        status: InvoiceStatus.Confirmed,
        periodStart: "2026-01-01",
        periodEnd: "2026-02-01",
        dueDate: "2026-01-31",
        subtotalPaise: 10000,
        discountPaise: 0,
        taxPaise: 0,
        totalPaise: 10000,
        amountPaidPaise: 0,
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const pay1Res = await app.inject({
      method: "POST",
      url: `/api/invoices/${invId}/payments`,
      headers: { authorization: `Bearer ${customerToken}` },
      payload: {
        amountPaise: 4000,
        method: PaymentMethod.Card,
        note: "Partial payment installment 1",
      },
    });
    expect(pay1Res.statusCode).toBe(201);
    const pay1 = JSON.parse(pay1Res.body) as {
      amountPaise: number;
      method: string;
      reference: string;
    };
    expect(pay1.amountPaise).toBe(4000);
    expect(pay1.method).toBe(PaymentMethod.Card);

    const getInv1Res = await app.inject({
      method: "GET",
      url: `/api/invoices/${invId}`,
      headers: { authorization: `Bearer ${customerToken}` },
    });
    const inv1 = JSON.parse(getInv1Res.body) as {
      amountPaidPaise: number;
      status: string;
    };
    expect(inv1.amountPaidPaise).toBe(4000);
    expect(inv1.status).toBe(InvoiceStatus.Confirmed);

    const overpayRes = await app.inject({
      method: "POST",
      url: `/api/invoices/${invId}/payments`,
      headers: { authorization: `Bearer ${customerToken}` },
      payload: {
        amountPaise: 7000,
        method: PaymentMethod.Upi,
      },
    });
    expect(overpayRes.statusCode).toBe(422);
    const overpayErr = JSON.parse(overpayRes.body) as {
      error: { code: string; message: string };
    };
    expect(overpayErr.error.code).toBe(ErrorCode.Overpayment);

    const pay2Res = await app.inject({
      method: "POST",
      url: `/api/invoices/${invId}/payments`,
      headers: { authorization: `Bearer ${customerToken}` },
      payload: {
        amountPaise: 6000,
        method: PaymentMethod.BankTransfer,
        note: "Final payment balance",
      },
    });
    expect(pay2Res.statusCode).toBe(201);

    const getInv2Res = await app.inject({
      method: "GET",
      url: `/api/invoices/${invId}`,
      headers: { authorization: `Bearer ${customerToken}` },
    });
    const inv2 = JSON.parse(getInv2Res.body) as {
      amountPaidPaise: number;
      status: string;
    };
    expect(inv2.amountPaidPaise).toBe(10000);
    expect(inv2.status).toBe(InvoiceStatus.Paid);

    const pay3Res = await app.inject({
      method: "POST",
      url: `/api/invoices/${invId}/payments`,
      headers: { authorization: `Bearer ${customerToken}` },
      payload: {
        amountPaise: 1000,
        method: PaymentMethod.Cash,
      },
    });
    expect(pay3Res.statusCode).toBe(409);
  });
});
