import { describe, expect, it } from "bun:test";
import { buildApp } from "../../app.ts";
import { createTestDb } from "../../db/client.ts";
import {
  users,
  plans,
  products,
  invoices,
} from "../../db/schema.ts";
import { TestClock } from "../../lib/clock.ts";
import {
  Role,
  SubscriptionStatus,
  InvoiceStatus,
  BillingPeriod,
  ProductType,
  PaymentMethod,
  RealtimeEventType,
  type ServerRealtimeEvent,
} from "@brightloop/shared";

interface WsTestClient {
  ws: WebSocket;
  messages: ServerRealtimeEvent[];
  waitForMessage: (
    predicate: (msg: ServerRealtimeEvent) => boolean,
    timeoutMs?: number,
  ) => Promise<ServerRealtimeEvent>;
  closePromise: Promise<{ code: number; reason: string }>;
  close: () => void;
}

function connectWs(url: string): Promise<WsTestClient> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const messages: ServerRealtimeEvent[] = [];
    const waiters: Array<{
      predicate: (msg: ServerRealtimeEvent) => boolean;
      resolve: (msg: ServerRealtimeEvent) => void;
    }> = [];

    let resolveClose: (val: { code: number; reason: string }) => void = () => {};
    const closePromise = new Promise<{ code: number; reason: string }>(
      (res) => {
        resolveClose = res;
      },
    );

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as ServerRealtimeEvent;
        messages.push(parsed);
        for (let i = waiters.length - 1; i >= 0; i--) {
          const waiter = waiters[i];
          if (waiter && waiter.predicate(parsed)) {
            waiters.splice(i, 1);
            waiter.resolve(parsed);
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = (event) => {
      resolveClose({ code: event.code, reason: event.reason });
    };

    ws.onerror = (err) => {
      reject(err);
    };

    ws.onopen = () => {
      resolve({
        ws,
        messages,
        waitForMessage(
          predicate: (msg: ServerRealtimeEvent) => boolean,
          timeoutMs = 4000,
        ): Promise<ServerRealtimeEvent> {
          const found = messages.find(predicate);
          if (found) {
            return Promise.resolve(found);
          }
          return new Promise<ServerRealtimeEvent>((res, rej) => {
            const timer = setTimeout(() => {
              rej(new Error(`Timed out waiting for message after ${timeoutMs}ms`));
            }, timeoutMs);

            waiters.push({
              predicate,
              resolve: (msg) => {
                clearTimeout(timer);
                res(msg);
              },
            });
          });
        },
        closePromise,
        close(): void {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        },
      });
    };
  });
}

function getPort(app: Awaited<ReturnType<typeof buildApp>>): number {
  const address = app.server.address();
  if (typeof address === "object" && address !== null) {
    return address.port;
  }
  return 0;
}

describe("Authenticated Real-Time WebSockets Integration Tests", () => {
  it("closes connection with 1008 when connecting to /api/ws without a valid token", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(new Date("2026-01-01T00:00:00Z").getTime());
    const app = await buildApp({ db: testDb, clock });

    await app.listen({ port: 0, host: "127.0.0.1" });
    const port = getPort(app);

    try {
      const clientNoToken = await connectWs(`ws://127.0.0.1:${port}/api/ws`);
      const closeNoToken = await clientNoToken.closePromise;
      expect(closeNoToken.code).toBe(1008);

      const clientInvalidToken = await connectWs(
        `ws://127.0.0.1:${port}/api/ws?token=invalid.jwt.token`,
      );
      const closeInvalidToken = await clientInvalidToken.closePromise;
      expect(closeInvalidToken.code).toBe(1008);

      const expiredToken = app.jwt.sign(
        { id: "usr-expired", role: Role.Admin, email: "expired@test.com" },
        { expiresIn: "1ms" },
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      const clientExpiredToken = await connectWs(
        `ws://127.0.0.1:${port}/api/ws?token=${expiredToken}`,
      );
      const closeExpiredToken = await clientExpiredToken.closePromise;
      expect(closeExpiredToken.code).toBe(1008);
    } finally {
      await app.close();
    }
  });

  it("delivers BillingRunCompleted, SubscriptionStatusChanged, and PaymentRecorded events to Admin client in real time", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(new Date("2026-01-01T00:00:00Z").getTime());
    const app = await buildApp({ db: testDb, clock });

    await app.listen({ port: 0, host: "127.0.0.1" });
    const port = getPort(app);

    const adminId = crypto.randomUUID();
    const customerId = crypto.randomUUID();

    testDb
      .insert(users)
      .values([
        {
          id: adminId,
          email: "admin-ws@brightloop.com",
          passwordHash: "hash",
          role: Role.Admin,
          name: "Admin WS",
          createdAt: clock.nowMs(),
          updatedAt: clock.nowMs(),
        },
        {
          id: customerId,
          email: "cust-ws@brightloop.com",
          passwordHash: "hash",
          role: Role.Customer,
          name: "Customer WS",
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
        name: "Standard Plan",
        pricePaise: 5000,
        billingPeriod: BillingPeriod.Monthly,
        minQuantity: 1,
        canPause: true,
        canCloseEarly: true,
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const productId = crypto.randomUUID();
    testDb
      .insert(products)
      .values({
        id: productId,
        name: "Cloud Hosting",
        type: ProductType.Subscription,
        salesPricePaise: 5000,
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const adminToken = app.jwt.sign({
      id: adminId,
      role: Role.Admin,
      email: "admin-ws@brightloop.com",
    });

    const adminClient = await connectWs(
      `ws://127.0.0.1:${port}/api/ws?token=${adminToken}`,
    );

    try {
      const connectedMsg = await adminClient.waitForMessage(
        (m) => m.type === RealtimeEventType.Connected,
      );
      expect(connectedMsg.type).toBe(RealtimeEventType.Connected);

      const sub = await app.container.subscriptionsService.createSubscription({
        customerId,
        planId,
        startDate: "2026-01-01",
        lines: [
          {
            productId,
            quantity: 1,
          },
        ],
      });

      await app.container.subscriptionsService.transitionSubscription(
        sub.id,
        SubscriptionStatus.Quotation,
        Role.Admin,
        adminId,
      );

      const statusChangedMsg = await adminClient.waitForMessage(
        (m) =>
          m.type === RealtimeEventType.SubscriptionStatusChanged &&
          m.payload.id === sub.id &&
          m.payload.toStatus === SubscriptionStatus.Quotation,
      );
      expect(statusChangedMsg.type).toBe(
        RealtimeEventType.SubscriptionStatusChanged,
      );
      expect(statusChangedMsg.customerId).toBe(customerId);

      const invoiceId = crypto.randomUUID();
      testDb
        .insert(invoices)
        .values({
          id: invoiceId,
          subscriptionId: sub.id,
          customerId,
          status: InvoiceStatus.Confirmed,
          periodStart: "2026-01-01",
          periodEnd: "2026-02-01",
          dueDate: "2026-01-31",
          subtotalPaise: 5000,
          discountPaise: 0,
          taxPaise: 0,
          totalPaise: 5000,
          amountPaidPaise: 0,
          createdAt: clock.nowMs(),
          updatedAt: clock.nowMs(),
        })
        .run();

      await app.container.invoicesService.recordPayment(
        invoiceId,
        {
          amountPaise: 5000,
          method: PaymentMethod.Card,
        },
        Role.Admin,
        adminId,
      );

      const paymentMsg = await adminClient.waitForMessage(
        (m) =>
          m.type === RealtimeEventType.PaymentRecorded &&
          m.payload.invoiceId === invoiceId,
      );
      expect(paymentMsg.type).toBe(RealtimeEventType.PaymentRecorded);
      if (paymentMsg.type === RealtimeEventType.PaymentRecorded) {
        expect(paymentMsg.customerId).toBe(customerId);
        expect(paymentMsg.payload.amountPaise).toBe(5000);
      }

      await app.container.billingService.runBilling("2026-01-01");

      const billingMsg = await adminClient.waitForMessage(
        (m) => m.type === RealtimeEventType.BillingRunCompleted,
      );
      expect(billingMsg.type).toBe(RealtimeEventType.BillingRunCompleted);
      if (billingMsg.type === RealtimeEventType.BillingRunCompleted) {
        expect(billingMsg.customerId).toBeUndefined();
        expect(billingMsg.payload.targetDate).toBe("2026-01-01");
      }
    } finally {
      adminClient.close();
      await app.close();
    }
  });

  it("enforces Customer Isolation: Customer A receives real-time events while Customer B receives nothing", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(new Date("2026-01-01T00:00:00Z").getTime());
    const app = await buildApp({ db: testDb, clock });

    await app.listen({ port: 0, host: "127.0.0.1" });
    const port = getPort(app);

    const customerAId = crypto.randomUUID();
    const customerBId = crypto.randomUUID();

    testDb
      .insert(users)
      .values([
        {
          id: customerAId,
          email: "customer-a@brightloop.com",
          passwordHash: "hash",
          role: Role.Customer,
          name: "Customer A",
          createdAt: clock.nowMs(),
          updatedAt: clock.nowMs(),
        },
        {
          id: customerBId,
          email: "customer-b@brightloop.com",
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
        name: "Pro Plan",
        pricePaise: 12000,
        billingPeriod: BillingPeriod.Monthly,
        minQuantity: 1,
        canPause: true,
        canCloseEarly: true,
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const productId = crypto.randomUUID();
    testDb
      .insert(products)
      .values({
        id: productId,
        name: "Pro SaaS",
        type: ProductType.Subscription,
        salesPricePaise: 12000,
        createdAt: clock.nowMs(),
        updatedAt: clock.nowMs(),
      })
      .run();

    const tokenA = app.jwt.sign({
      id: customerAId,
      role: Role.Customer,
      email: "customer-a@brightloop.com",
    });

    const tokenB = app.jwt.sign({
      id: customerBId,
      role: Role.Customer,
      email: "customer-b@brightloop.com",
    });

    const clientA = await connectWs(
      `ws://127.0.0.1:${port}/api/ws?token=${tokenA}`,
    );
    const clientB = await connectWs(
      `ws://127.0.0.1:${port}/api/ws?token=${tokenB}`,
    );

    try {
      const connA = await clientA.waitForMessage(
        (m) => m.type === RealtimeEventType.Connected,
      );
      const connB = await clientB.waitForMessage(
        (m) => m.type === RealtimeEventType.Connected,
      );

      expect(connA.type).toBe(RealtimeEventType.Connected);
      if (connA.type === RealtimeEventType.Connected) {
        expect(connA.payload.userId).toBe(customerAId);
      }
      expect(connB.type).toBe(RealtimeEventType.Connected);
      if (connB.type === RealtimeEventType.Connected) {
        expect(connB.payload.userId).toBe(customerBId);
      }

      const subA = await app.container.subscriptionsService.createSubscription({
        customerId: customerAId,
        planId,
        startDate: "2026-01-01",
        lines: [
          {
            productId,
            quantity: 1,
          },
        ],
      });

      await app.container.subscriptionsService.transitionSubscription(
        subA.id,
        SubscriptionStatus.Quotation,
        Role.Admin,
        "admin-id",
      );

      const subAMsg = await clientA.waitForMessage(
        (m) =>
          m.type === RealtimeEventType.SubscriptionStatusChanged &&
          m.payload.id === subA.id,
      );
      expect(subAMsg.type).toBe(RealtimeEventType.SubscriptionStatusChanged);
      expect(subAMsg.customerId).toBe(customerAId);

      const invoiceAId = crypto.randomUUID();
      testDb
        .insert(invoices)
        .values({
          id: invoiceAId,
          subscriptionId: subA.id,
          customerId: customerAId,
          status: InvoiceStatus.Confirmed,
          periodStart: "2026-01-01",
          periodEnd: "2026-02-01",
          dueDate: "2026-01-31",
          subtotalPaise: 12000,
          discountPaise: 0,
          taxPaise: 0,
          totalPaise: 12000,
          amountPaidPaise: 0,
          createdAt: clock.nowMs(),
          updatedAt: clock.nowMs(),
        })
        .run();

      await app.container.invoicesService.recordPayment(
        invoiceAId,
        {
          amountPaise: 12000,
          method: PaymentMethod.BankTransfer,
        },
        Role.Customer,
        customerAId,
      );

      const paymentAMsg = await clientA.waitForMessage(
        (m) =>
          m.type === RealtimeEventType.PaymentRecorded &&
          m.payload.invoiceId === invoiceAId,
      );
      expect(paymentAMsg.type).toBe(RealtimeEventType.PaymentRecorded);
      expect(paymentAMsg.customerId).toBe(customerAId);

      await app.container.billingService.runBilling("2026-01-01");

      await new Promise((resolve) => setTimeout(resolve, 300));

      const clientBMessages = clientB.messages;
      expect(clientBMessages.length).toBe(1);
      const firstMsg = clientBMessages[0];
      expect(firstMsg?.type).toBe(RealtimeEventType.Connected);

      const foreignMessages = clientBMessages.filter(
        (m) =>
          m.type === RealtimeEventType.SubscriptionStatusChanged ||
          m.type === RealtimeEventType.PaymentRecorded ||
          m.type === RealtimeEventType.BillingRunCompleted,
      );
      expect(foreignMessages.length).toBe(0);
    } finally {
      clientA.close();
      clientB.close();
      await app.close();
    }
  });
});
