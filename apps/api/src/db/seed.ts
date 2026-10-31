import { db, type AppDatabase } from "./client.ts";
import {
  users,
  products,
  productVariants,
  plans,
  taxes,
  discounts,
  quotationTemplates,
  quotationTemplateLines,
  subscriptions,
  subscriptionLines,
  invoices,
  invoiceLines,
  payments,
  passwordResetTokens,
} from "./schema.ts";
import {
  Role,
  ProductType,
  BillingPeriod,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentMethod,
  DiscountKind,
  DiscountScope,
} from "@brightloop/shared";
import { addDaysIso } from "../modules/billing/index.ts";
import { systemClock } from "../lib/clock.ts";

export interface SeedOptions {
  todayIso?: string;
  nowMs?: number;
}

export interface SeedResult {
  usersCount: number;
  productsCount: number;
  variantsCount: number;
  plansCount: number;
  taxesCount: number;
  discountsCount: number;
  templatesCount: number;
  templateLinesCount: number;
  subscriptionsCount: number;
  subscriptionLinesCount: number;
  invoicesCount: number;
  invoiceLinesCount: number;
  paymentsCount: number;
  elapsedMs: number;
}

const CHUNK_SIZE = 500;

function pad(num: number, size: number): string {
  let s = num.toString();
  while (s.length < size) {
    s = "0" + s;
  }
  return s;
}

export async function seedDatabase(
  targetDb: AppDatabase,
  options?: SeedOptions,
): Promise<SeedResult> {
  const startTime = performance.now();
  const today = options?.todayIso ?? systemClock.todayIso();
  const nowMs = options?.nowMs ?? systemClock.nowMs();

  const passwordHash = await Bun.password.hash("Brightloop@123", {
    algorithm: "argon2id",
  });

  const usersList: Array<typeof users.$inferInsert> = [
    {
      id: "user-admin-1",
      email: "admin@brightloop.test",
      passwordHash,
      role: Role.Admin,
      name: "Admin User",
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "user-staff-1",
      email: "staff@brightloop.test",
      passwordHash,
      role: Role.Staff,
      name: "Staff User",
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "user-customer-demo",
      email: "customer@brightloop.test",
      passwordHash,
      role: Role.Customer,
      name: "Primary Demo Customer",
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
  ];

  for (let i = 1; i <= 250; i += 1) {
    usersList.push({
      id: `user-customer-${i}`,
      email: `customer${i}@brightloop.test`,
      passwordHash,
      role: Role.Customer,
      name: `Customer ${i}`,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    });
  }

  const productsList: Array<typeof products.$inferInsert> = [
    {
      id: "prod-erp-core",
      name: "Brightloop ERP Core",
      type: ProductType.Service,
      salesPricePaise: 150000,
      costPricePaise: 50000,
      notes: "Core Enterprise Resource Planning engine",
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "prod-crm-addon",
      name: "Brightloop CRM Add-on",
      type: ProductType.Service,
      salesPricePaise: 80000,
      costPricePaise: 20000,
      notes: "Customer relationship management module",
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "prod-payroll",
      name: "Payroll Automation",
      type: ProductType.Service,
      salesPricePaise: 120000,
      costPricePaise: 30000,
      notes: "Statutory payroll compliance and automation",
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "prod-helpdesk",
      name: "Helpdesk Pro",
      type: ProductType.Service,
      salesPricePaise: 60000,
      costPricePaise: 15000,
      notes: "Omnichannel customer support ticketing",
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
  ];

  const variantsList: Array<typeof productVariants.$inferInsert> = [
    {
      id: "var-erp-odoo",
      productId: "prod-erp-core",
      attributeName: "Brand",
      attributeValue: "Odoo",
      extraPricePaise: 56000,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "var-erp-std",
      productId: "prod-erp-core",
      attributeName: "Brand",
      attributeValue: "Standard",
      extraPricePaise: 0,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "var-crm-std",
      productId: "prod-crm-addon",
      attributeName: "Tier",
      attributeValue: "Standard",
      extraPricePaise: 0,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "var-crm-ent",
      productId: "prod-crm-addon",
      attributeName: "Tier",
      attributeValue: "Enterprise",
      extraPricePaise: 40000,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "var-pay-std",
      productId: "prod-payroll",
      attributeName: "Edition",
      attributeValue: "Standard",
      extraPricePaise: 0,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "var-help-std",
      productId: "prod-helpdesk",
      attributeName: "Level",
      attributeValue: "Standard",
      extraPricePaise: 0,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
  ];

  const plansList: Array<typeof plans.$inferInsert> = [
    {
      id: "plan-monthly-std",
      productId: "prod-erp-core",
      name: "SMB Monthly Starter",
      pricePaise: 100000,
      billingPeriod: BillingPeriod.Monthly,
      minQuantity: 1,
      availableFrom: addDaysIso(today, -365),
      availableTo: null,
      autoCloseOnEnd: false,
      canCloseEarly: true,
      canPause: true,
      canRenew: true,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "plan-yearly-ent",
      productId: "prod-erp-core",
      name: "Enterprise Yearly Bundle",
      pricePaise: 1000000,
      billingPeriod: BillingPeriod.Yearly,
      minQuantity: 1,
      availableFrom: addDaysIso(today, -365),
      availableTo: null,
      autoCloseOnEnd: false,
      canCloseEarly: false,
      canPause: true,
      canRenew: true,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "plan-weekly-smb",
      productId: "prod-crm-addon",
      name: "Growth Weekly",
      pricePaise: 25000,
      billingPeriod: BillingPeriod.Weekly,
      minQuantity: 1,
      availableFrom: addDaysIso(today, -365),
      availableTo: null,
      autoCloseOnEnd: false,
      canCloseEarly: true,
      canPause: false,
      canRenew: true,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "plan-daily-trial",
      productId: "prod-helpdesk",
      name: "Trial Daily",
      pricePaise: 5000,
      billingPeriod: BillingPeriod.Daily,
      minQuantity: 1,
      availableFrom: addDaysIso(today, -365),
      availableTo: null,
      autoCloseOnEnd: true,
      canCloseEarly: false,
      canPause: false,
      canRenew: false,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
  ];

  const taxesList: Array<typeof taxes.$inferInsert> = [
    {
      id: "tax-gst-18",
      name: "GST 18%",
      rateBps: 1800,
      isActive: true,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "tax-gst-12",
      name: "GST 12%",
      rateBps: 1200,
      isActive: true,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "tax-service-legacy",
      name: "Service Tax (Legacy)",
      rateBps: 1400,
      isActive: false,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
  ];

  const discountsList: Array<typeof discounts.$inferInsert> = [
    {
      id: "disc-volume-seat",
      name: "Volume Seat Discount",
      kind: DiscountKind.Percentage,
      value: 1500,
      scope: DiscountScope.Subscription,
      productId: null,
      minQuantity: 5,
      minPurchasePaise: 0,
      startDate: addDaysIso(today, -100),
      endDate: addDaysIso(today, 200),
      maxUses: 100,
      timesUsed: 42,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "disc-prod-fixed",
      name: "Product Fixed Discount",
      kind: DiscountKind.Fixed,
      value: 20000,
      scope: DiscountScope.Product,
      productId: "prod-erp-core",
      minQuantity: 1,
      minPurchasePaise: 0,
      startDate: addDaysIso(today, -60),
      endDate: addDaysIso(today, 120),
      maxUses: null,
      timesUsed: 15,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "disc-early-bird",
      name: "Early Bird Monthly",
      kind: DiscountKind.Percentage,
      value: 1000,
      scope: DiscountScope.Subscription,
      productId: null,
      minQuantity: 1,
      minPurchasePaise: 0,
      startDate: addDaysIso(today, -90),
      endDate: addDaysIso(today, 90),
      maxUses: 500,
      timesUsed: 120,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
  ];

  const quotationTemplatesList: Array<typeof quotationTemplates.$inferInsert> = [
    {
      id: "tpl-yearly-ent",
      name: "Enterprise Yearly Bundle",
      planId: "plan-yearly-ent",
      validityDays: 30,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
    {
      id: "tpl-monthly-smb",
      name: "SMB Monthly Starter",
      planId: "plan-monthly-std",
      validityDays: 15,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    },
  ];

  const quotationTemplateLinesList: Array<
    typeof quotationTemplateLines.$inferInsert
  > = [
    {
      id: "tpl-line-1",
      templateId: "tpl-yearly-ent",
      productId: "prod-erp-core",
      variantId: "var-erp-odoo",
      quantity: 5,
      taxId: "tax-gst-18",
      createdAt: nowMs,
    },
    {
      id: "tpl-line-2",
      templateId: "tpl-yearly-ent",
      productId: "prod-crm-addon",
      variantId: "var-crm-ent",
      quantity: 5,
      taxId: "tax-gst-18",
      createdAt: nowMs,
    },
    {
      id: "tpl-line-3",
      templateId: "tpl-yearly-ent",
      productId: "prod-payroll",
      variantId: "var-pay-std",
      quantity: 1,
      taxId: "tax-gst-18",
      createdAt: nowMs,
    },
    {
      id: "tpl-line-4",
      templateId: "tpl-monthly-smb",
      productId: "prod-erp-core",
      variantId: "var-erp-std",
      quantity: 1,
      taxId: "tax-gst-18",
      createdAt: nowMs,
    },
    {
      id: "tpl-line-5",
      templateId: "tpl-monthly-smb",
      productId: "prod-helpdesk",
      variantId: "var-help-std",
      quantity: 1,
      taxId: "tax-gst-12",
      createdAt: nowMs,
    },
  ];

  const subscriptionsList: Array<typeof subscriptions.$inferInsert> = [];
  const subscriptionLinesList: Array<typeof subscriptionLines.$inferInsert> = [];

  const customerIds: string[] = [];
  for (let i = 1; i <= 250; i += 1) {
    customerIds.push(`user-customer-${i}`);
  }

  const primaryCustomerId = "user-customer-demo";

  interface SubConfig {
    id: string;
    subNumber: string;
    customerId: string;
    planId: string;
    status: SubscriptionStatus;
    startDate: string;
    endDate: string | null;
    nextBillingDate: string | null;
    discountId: string | null;
    templateId: string | null;
  }

  const configs: SubConfig[] = [];

  configs.push({
    id: "sub-demo-1",
    subNumber: "SUB-000001",
    customerId: primaryCustomerId,
    planId: "plan-monthly-std",
    status: SubscriptionStatus.Quotation,
    startDate: today,
    endDate: addDaysIso(today, 15),
    nextBillingDate: today,
    discountId: null,
    templateId: "tpl-monthly-smb",
  });

  configs.push({
    id: "sub-demo-2",
    subNumber: "SUB-000002",
    customerId: primaryCustomerId,
    planId: "plan-monthly-std",
    status: SubscriptionStatus.Active,
    startDate: addDaysIso(today, -60),
    endDate: null,
    nextBillingDate: addDaysIso(today, 20),
    discountId: "disc-early-bird",
    templateId: null,
  });

  configs.push({
    id: "sub-demo-3",
    subNumber: "SUB-000003",
    customerId: primaryCustomerId,
    planId: "plan-monthly-std",
    status: SubscriptionStatus.Active,
    startDate: addDaysIso(today, -30),
    endDate: null,
    nextBillingDate: today,
    discountId: null,
    templateId: null,
  });

  configs.push({
    id: "sub-demo-4",
    subNumber: "SUB-000004",
    customerId: primaryCustomerId,
    planId: "plan-monthly-std",
    status: SubscriptionStatus.Paused,
    startDate: addDaysIso(today, -90),
    endDate: null,
    nextBillingDate: null,
    discountId: null,
    templateId: null,
  });

  configs.push({
    id: "sub-demo-5",
    subNumber: "SUB-000005",
    customerId: primaryCustomerId,
    planId: "plan-monthly-std",
    status: SubscriptionStatus.Closed,
    startDate: addDaysIso(today, -365),
    endDate: addDaysIso(today, -30),
    nextBillingDate: null,
    discountId: null,
    templateId: null,
  });

  configs.push({
    id: "sub-demo-6",
    subNumber: "SUB-000006",
    customerId: primaryCustomerId,
    planId: "plan-monthly-std",
    status: SubscriptionStatus.Confirmed,
    startDate: addDaysIso(today, 5),
    endDate: null,
    nextBillingDate: addDaysIso(today, 5),
    discountId: null,
    templateId: null,
  });

  const remainingDueActive = 149;
  const remainingFutureActive = 3349;
  const remainingQuotation = 399;
  const remainingDraft = 300;
  const remainingConfirmed = 199;
  const remainingPaused = 299;
  const remainingClosed = 499;

  let globalSubIndex = 7;

  function pushSubs(
    count: number,
    status: SubscriptionStatus,
    computeDates: (idx: number) => {
      startDate: string;
      endDate: string | null;
      nextBillingDate: string | null;
      planId: string;
      discountId: string | null;
      templateId: string | null;
    },
  ): void {
    for (let c = 0; c < count; c += 1) {
      const customerId =
        customerIds[(globalSubIndex - 1) % customerIds.length] ??
        primaryCustomerId;
      const dates = computeDates(c);
      configs.push({
        id: `sub-${pad(globalSubIndex, 6)}`,
        subNumber: `SUB-${pad(globalSubIndex, 6)}`,
        customerId,
        planId: dates.planId,
        status,
        startDate: dates.startDate,
        endDate: dates.endDate,
        nextBillingDate: dates.nextBillingDate,
        discountId: dates.discountId,
        templateId: dates.templateId,
      });
      globalSubIndex += 1;
    }
  }

  pushSubs(remainingDueActive, SubscriptionStatus.Active, () => ({
    startDate: addDaysIso(today, -30),
    endDate: null,
    nextBillingDate: today,
    planId: "plan-monthly-std",
    discountId: null,
    templateId: null,
  }));

  pushSubs(remainingFutureActive, SubscriptionStatus.Active, (idx) => {
    const plansCycle = [
      "plan-monthly-std",
      "plan-yearly-ent",
      "plan-weekly-smb",
      "plan-daily-trial",
    ];
    const planId = plansCycle[idx % plansCycle.length] ?? "plan-monthly-std";
    const futureDays = (idx % 60) + 1;
    return {
      startDate: addDaysIso(today, -60),
      endDate: null,
      nextBillingDate: addDaysIso(today, futureDays),
      planId,
      discountId: idx % 10 === 0 ? "disc-volume-seat" : null,
      templateId: null,
    };
  });

  pushSubs(remainingQuotation, SubscriptionStatus.Quotation, () => ({
    startDate: today,
    endDate: addDaysIso(today, 30),
    nextBillingDate: today,
    planId: "plan-monthly-std",
    discountId: null,
    templateId: "tpl-monthly-smb",
  }));

  pushSubs(remainingDraft, SubscriptionStatus.Draft, () => ({
    startDate: today,
    endDate: null,
    nextBillingDate: today,
    planId: "plan-monthly-std",
    discountId: null,
    templateId: null,
  }));

  pushSubs(remainingConfirmed, SubscriptionStatus.Confirmed, () => ({
    startDate: addDaysIso(today, 5),
    endDate: null,
    nextBillingDate: addDaysIso(today, 5),
    planId: "plan-monthly-std",
    discountId: null,
    templateId: null,
  }));

  pushSubs(remainingPaused, SubscriptionStatus.Paused, () => ({
    startDate: addDaysIso(today, -90),
    endDate: null,
    nextBillingDate: null,
    planId: "plan-monthly-std",
    discountId: null,
    templateId: null,
  }));

  pushSubs(remainingClosed, SubscriptionStatus.Closed, () => ({
    startDate: addDaysIso(today, -365),
    endDate: addDaysIso(today, -30),
    nextBillingDate: null,
    planId: "plan-monthly-std",
    discountId: null,
    templateId: null,
  }));

  let lineCounter = 1;
  for (let i = 0; i < configs.length; i += 1) {
    const cfg = configs[i];
    if (!cfg) {
      continue;
    }

    subscriptionsList.push({
      id: cfg.id,
      subNumber: cfg.subNumber,
      customerId: cfg.customerId,
      planId: cfg.planId,
      status: cfg.status,
      startDate: cfg.startDate,
      endDate: cfg.endDate,
      nextBillingDate: cfg.nextBillingDate,
      discountId: cfg.discountId,
      paymentTermsDays: 30,
      templateId: cfg.templateId,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    });

    subscriptionLinesList.push({
      id: `subline-${pad(lineCounter, 7)}`,
      subscriptionId: cfg.id,
      productId: "prod-erp-core",
      variantId: i % 2 === 0 ? "var-erp-odoo" : "var-erp-std",
      quantity: 1,
      unitPricePaise: i % 2 === 0 ? 206000 : 150000,
      taxId: "tax-gst-18",
      createdAt: nowMs,
    });
    lineCounter += 1;

    if (i < 2400) {
      subscriptionLinesList.push({
        id: `subline-${pad(lineCounter, 7)}`,
        subscriptionId: cfg.id,
        productId: "prod-crm-addon",
        variantId: i % 2 === 0 ? "var-crm-ent" : "var-crm-std",
        quantity: 1,
        unitPricePaise: i % 2 === 0 ? 120000 : 80000,
        taxId: "tax-gst-18",
        createdAt: nowMs,
      });
      lineCounter += 1;
    }

    if (i < 400) {
      subscriptionLinesList.push({
        id: `subline-${pad(lineCounter, 7)}`,
        subscriptionId: cfg.id,
        productId: "prod-payroll",
        variantId: "var-pay-std",
        quantity: 1,
        unitPricePaise: 120000,
        taxId: "tax-gst-18",
        createdAt: nowMs,
      });
      lineCounter += 1;
    }
  }

  const invoicesList: Array<typeof invoices.$inferInsert> = [];
  const invoiceLinesList: Array<typeof invoiceLines.$inferInsert> = [];
  const paymentsList: Array<typeof payments.$inferInsert> = [];

  const invoiceTargetCount = 6000;
  const paidInvoiceCount = 3500;
  const confirmedCurrentCount = 1200;
  const confirmedOverdueCount = 800;
  const draftInvoiceCount = 300;

  let invoiceLineCounter = 1;
  let paymentCounter = 1;

  for (let invIdx = 0; invIdx < invoiceTargetCount; invIdx += 1) {
    const invoiceId = `inv-${pad(invIdx + 1, 6)}`;
    const subIdx = invIdx % configs.length;
    const sub = configs[subIdx];
    if (!sub) {
      continue;
    }

    const isSecondInvoiceForSub = invIdx >= configs.length;
    const periodStartOffset = isSecondInvoiceForSub ? -90 : -150;
    const periodStart = addDaysIso(today, periodStartOffset);
    const periodEnd = addDaysIso(periodStart, 29);

    let status: InvoiceStatus;
    let dueDate: string;
    let amountPaidPaise = 0;

    if (invIdx < paidInvoiceCount) {
      status = InvoiceStatus.Paid;
      dueDate = addDaysIso(periodStart, 30);
    } else if (invIdx < paidInvoiceCount + confirmedCurrentCount) {
      status = InvoiceStatus.Confirmed;
      dueDate = addDaysIso(today, 10 + (invIdx % 20));
    } else if (
      invIdx <
      paidInvoiceCount + confirmedCurrentCount + confirmedOverdueCount
    ) {
      status = InvoiceStatus.Confirmed;
      dueDate = addDaysIso(today, -1 - (invIdx % 30));
    } else if (
      invIdx <
      paidInvoiceCount +
        confirmedCurrentCount +
        confirmedOverdueCount +
        draftInvoiceCount
    ) {
      status = InvoiceStatus.Draft;
      dueDate = addDaysIso(today, 15);
    } else {
      status = InvoiceStatus.Cancelled;
      dueDate = addDaysIso(today, -15);
    }

    const hasTwoLines = invIdx < 3000;
    const line1UnitPaise = 150000;
    const line1TotalPaise = line1UnitPaise;

    invoiceLinesList.push({
      id: `invline-${pad(invoiceLineCounter, 7)}`,
      invoiceId,
      productId: "prod-erp-core",
      variantId: "var-erp-std",
      description: "Brightloop ERP Core - Standard",
      quantity: 1,
      unitPricePaise: line1UnitPaise,
      taxRateBasisPoints: 1800,
      lineTotalPaise: line1TotalPaise,
      createdAt: nowMs,
    });
    invoiceLineCounter += 1;

    let subtotalPaise = line1TotalPaise;

    if (hasTwoLines) {
      const line2UnitPaise = 80000;
      const line2TotalPaise = line2UnitPaise;
      invoiceLinesList.push({
        id: `invline-${pad(invoiceLineCounter, 7)}`,
        invoiceId,
        productId: "prod-crm-addon",
        variantId: "var-crm-std",
        description: "Brightloop CRM Add-on - Standard",
        quantity: 1,
        unitPricePaise: line2UnitPaise,
        taxRateBasisPoints: 1800,
        lineTotalPaise: line2TotalPaise,
        createdAt: nowMs,
      });
      invoiceLineCounter += 1;
      subtotalPaise += line2TotalPaise;
    }

    const discountPaise = 0;
    const taxPaise = Math.round((subtotalPaise * 1800) / 10000);
    const totalPaise = subtotalPaise - discountPaise + taxPaise;

    if (status === InvoiceStatus.Paid) {
      amountPaidPaise = totalPaise;
    } else if (
      status === InvoiceStatus.Confirmed &&
      invIdx >= paidInvoiceCount &&
      invIdx < paidInvoiceCount + 300
    ) {
      amountPaidPaise = Math.floor(totalPaise / 2);
    } else if (
      status === InvoiceStatus.Confirmed &&
      invIdx >= paidInvoiceCount + confirmedCurrentCount &&
      invIdx < paidInvoiceCount + confirmedCurrentCount + 200
    ) {
      amountPaidPaise = Math.floor(totalPaise / 3);
    }

    invoicesList.push({
      id: invoiceId,
      subscriptionId: sub.id,
      customerId: sub.customerId,
      status,
      periodStart,
      periodEnd,
      dueDate,
      subtotalPaise,
      discountPaise,
      taxPaise,
      totalPaise,
      amountPaidPaise,
      createdAt: nowMs,
      updatedAt: nowMs,
      archivedAt: null,
    });

    if (amountPaidPaise > 0) {
      const methods = [
        PaymentMethod.BankTransfer,
        PaymentMethod.Card,
        PaymentMethod.Upi,
        PaymentMethod.Cash,
      ];
      const method = methods[paymentCounter % methods.length] ?? PaymentMethod.BankTransfer;

      paymentsList.push({
        id: `pay-${pad(paymentCounter, 6)}`,
        invoiceId,
        customerId: sub.customerId,
        amountPaise: amountPaidPaise,
        method,
        reference: `TXN-${pad(paymentCounter, 7)}`,
        paymentDate: addDaysIso(periodStart, 5),
        recordedBy: "user-admin-1",
        createdAt: nowMs,
      });
      paymentCounter += 1;
    }
  }

  targetDb.transaction((tx) => {
    tx.delete(payments).run();
    tx.delete(invoiceLines).run();
    tx.delete(invoices).run();
    tx.delete(subscriptionLines).run();
    tx.delete(subscriptions).run();
    tx.delete(quotationTemplateLines).run();
    tx.delete(quotationTemplates).run();
    tx.delete(discounts).run();
    tx.delete(plans).run();
    tx.delete(productVariants).run();
    tx.delete(products).run();
    tx.delete(taxes).run();
    tx.delete(passwordResetTokens).run();
    tx.delete(users).run();

    for (let i = 0; i < usersList.length; i += CHUNK_SIZE) {
      tx.insert(users).values(usersList.slice(i, i + CHUNK_SIZE)).run();
    }

    for (let i = 0; i < productsList.length; i += CHUNK_SIZE) {
      tx.insert(products).values(productsList.slice(i, i + CHUNK_SIZE)).run();
    }

    for (let i = 0; i < variantsList.length; i += CHUNK_SIZE) {
      tx.insert(productVariants).values(variantsList.slice(i, i + CHUNK_SIZE)).run();
    }

    for (let i = 0; i < plansList.length; i += CHUNK_SIZE) {
      tx.insert(plans).values(plansList.slice(i, i + CHUNK_SIZE)).run();
    }

    for (let i = 0; i < taxesList.length; i += CHUNK_SIZE) {
      tx.insert(taxes).values(taxesList.slice(i, i + CHUNK_SIZE)).run();
    }

    for (let i = 0; i < discountsList.length; i += CHUNK_SIZE) {
      tx.insert(discounts).values(discountsList.slice(i, i + CHUNK_SIZE)).run();
    }

    for (let i = 0; i < quotationTemplatesList.length; i += CHUNK_SIZE) {
      tx.insert(quotationTemplates).values(quotationTemplatesList.slice(i, i + CHUNK_SIZE)).run();
    }

    for (let i = 0; i < quotationTemplateLinesList.length; i += CHUNK_SIZE) {
      tx.insert(quotationTemplateLines).values(quotationTemplateLinesList.slice(i, i + CHUNK_SIZE)).run();
    }

    for (let i = 0; i < subscriptionsList.length; i += CHUNK_SIZE) {
      tx.insert(subscriptions).values(subscriptionsList.slice(i, i + CHUNK_SIZE)).run();
    }

    for (let i = 0; i < subscriptionLinesList.length; i += CHUNK_SIZE) {
      tx.insert(subscriptionLines).values(subscriptionLinesList.slice(i, i + CHUNK_SIZE)).run();
    }

    for (let i = 0; i < invoicesList.length; i += CHUNK_SIZE) {
      tx.insert(invoices).values(invoicesList.slice(i, i + CHUNK_SIZE)).run();
    }

    for (let i = 0; i < invoiceLinesList.length; i += CHUNK_SIZE) {
      tx.insert(invoiceLines).values(invoiceLinesList.slice(i, i + CHUNK_SIZE)).run();
    }

    for (let i = 0; i < paymentsList.length; i += CHUNK_SIZE) {
      tx.insert(payments).values(paymentsList.slice(i, i + CHUNK_SIZE)).run();
    }
  });

  const elapsedMs = Math.round(performance.now() - startTime);

  return {
    usersCount: usersList.length,
    productsCount: productsList.length,
    variantsCount: variantsList.length,
    plansCount: plansList.length,
    taxesCount: taxesList.length,
    discountsCount: discountsList.length,
    templatesCount: quotationTemplatesList.length,
    templateLinesCount: quotationTemplateLinesList.length,
    subscriptionsCount: subscriptionsList.length,
    subscriptionLinesCount: subscriptionLinesList.length,
    invoicesCount: invoicesList.length,
    invoiceLinesCount: invoiceLinesList.length,
    paymentsCount: paymentsList.length,
    elapsedMs,
  };
}

export async function seed(): Promise<void> {
  const result = await seedDatabase(db);
  const divider = "==================================================";
  console.log(divider);
  console.log("Table                                    Row Count");
  console.log(divider);
  console.log(`users                                         ${result.usersCount}`);
  console.log(`products                                        ${result.productsCount}`);
  console.log(`product_variants                                ${result.variantsCount}`);
  console.log(`plans                                           ${result.plansCount}`);
  console.log(`taxes                                           ${result.taxesCount}`);
  console.log(`discounts                                       ${result.discountsCount}`);
  console.log(`quotation_templates                             ${result.templatesCount}`);
  console.log(`quotation_template_lines                        ${result.templateLinesCount}`);
  console.log(`subscriptions                                ${result.subscriptionsCount}`);
  console.log(`subscription_lines                           ${result.subscriptionLinesCount}`);
  console.log(`invoices                                     ${result.invoicesCount}`);
  console.log(`invoice_lines                                ${result.invoiceLinesCount}`);
  console.log(`payments                                     ${result.paymentsCount}`);
  console.log(divider);
  console.log(`Database seeded successfully in ${result.elapsedMs}ms`);
  console.log(divider);
}

if (import.meta.main) {
  await seed();
}
