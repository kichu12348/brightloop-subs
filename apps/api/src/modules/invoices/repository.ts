import { eq, and, isNull, count, desc, lt } from "drizzle-orm";
import type { AppDatabase } from "../../db/client.ts";
import {
  invoices,
  invoiceLines,
  payments,
  users,
  products,
  productVariants,
} from "../../db/schema.ts";
import {
  type InvoiceStatus,
  InvoiceStatus as InvStatus,
  type PaymentMethod,
  PaymentMethod as PayMethod,
} from "@brightloop/shared";

export interface InvoiceLineRecord {
  id: string;
  invoiceId: string;
  productId: string;
  productName?: string;
  variantId: string | null;
  variantName?: string | null;
  description: string;
  quantity: number;
  unitPricePaise: number;
  taxRateBasisPoints: number;
  lineTotalPaise: number;
  createdAt: number;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  customerId: string;
  amountPaise: number;
  method: PaymentMethod;
  reference: string | null;
  paymentDate: string | null;
  recordedBy: string;
  createdAt: number;
}

export interface InvoiceSummaryRecord {
  id: string;
  subscriptionId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: InvoiceStatus;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  amountPaidPaise: number;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export interface InvoiceDetailRecord {
  id: string;
  subscriptionId: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  status: InvoiceStatus;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  amountPaidPaise: number;
  lines: InvoiceLineRecord[];
  payments: PaymentRecord[];
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export interface ListInvoicesFilter {
  customerId?: string | undefined;
  status?: InvoiceStatus | undefined;
  overdueOnly?: boolean | undefined;
  todayIso?: string | undefined;
  limit: number;
  offset: number;
}

export interface InvoicesRepository {
  findInvoiceById(id: string): Promise<InvoiceDetailRecord | null>;
  listInvoices(
    filter: ListInvoicesFilter,
  ): Promise<{ items: InvoiceSummaryRecord[]; total: number }>;
  updateInvoiceStatus(
    id: string,
    status: InvoiceStatus,
    updatedAt: number,
  ): Promise<boolean>;
  recordPayment(
    paymentData: {
      id: string;
      invoiceId: string;
      customerId: string;
      amountPaise: number;
      method: PaymentMethod;
      reference: string | null;
      paymentDate: string | null;
      recordedBy: string;
      createdAt: number;
    },
    newPaidPaise: number,
    markPaid: boolean,
    nowMs: number,
  ): Promise<PaymentRecord>;
}

function parseInvoiceStatus(value: string): InvoiceStatus {
  switch (value) {
    case InvStatus.Draft:
    case InvStatus.Confirmed:
    case InvStatus.Paid:
    case InvStatus.Cancelled:
      return value;
    default:
      throw new Error(`Invalid invoice status: ${value}`);
  }
}

function parsePaymentMethod(value: string): PaymentMethod {
  switch (value) {
    case PayMethod.BankTransfer:
    case PayMethod.Card:
    case PayMethod.Upi:
    case PayMethod.Cash:
      return value;
    default:
      throw new Error(`Invalid payment method: ${value}`);
  }
}

export function createSqliteInvoicesRepository(
  database: AppDatabase,
): InvoicesRepository {
  return {
    async findInvoiceById(id: string): Promise<InvoiceDetailRecord | null> {
      const invRow = database
        .select({
          inv: invoices,
          cust: users,
        })
        .from(invoices)
        .innerJoin(users, eq(invoices.customerId, users.id))
        .where(
          and(
            eq(invoices.id, id),
            isNull(invoices.archivedAt),
          ),
        )
        .get();

      if (!invRow) {
        return null;
      }

      const lineRows = database
        .select({
          line: invoiceLines,
          prod: products,
          variant: productVariants,
        })
        .from(invoiceLines)
        .innerJoin(products, eq(invoiceLines.productId, products.id))
        .leftJoin(
          productVariants,
          eq(invoiceLines.variantId, productVariants.id),
        )
        .where(eq(invoiceLines.invoiceId, id))
        .all();

      const lines: InvoiceLineRecord[] = lineRows.map((r) => ({
        id: r.line.id,
        invoiceId: r.line.invoiceId,
        productId: r.line.productId,
        productName: r.prod.name,
        variantId: r.line.variantId,
        variantName: r.variant
          ? `${r.variant.attributeName}: ${r.variant.attributeValue}`
          : null,
        description: r.line.description,
        quantity: r.line.quantity,
        unitPricePaise: r.line.unitPricePaise,
        taxRateBasisPoints: r.line.taxRateBasisPoints,
        lineTotalPaise: r.line.lineTotalPaise,
        createdAt: r.line.createdAt,
      }));

      const paymentRows = database
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, id))
        .orderBy(desc(payments.createdAt))
        .all();

      const payRecords: PaymentRecord[] = paymentRows.map((p) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        customerId: p.customerId,
        amountPaise: p.amountPaise,
        method: parsePaymentMethod(p.method),
        reference: p.reference,
        paymentDate: p.paymentDate,
        recordedBy: p.recordedBy,
        createdAt: p.createdAt,
      }));

      return {
        id: invRow.inv.id,
        subscriptionId: invRow.inv.subscriptionId,
        customerId: invRow.inv.customerId,
        customer: {
          id: invRow.cust.id,
          name: invRow.cust.name,
          email: invRow.cust.email,
        },
        status: parseInvoiceStatus(invRow.inv.status),
        periodStart: invRow.inv.periodStart,
        periodEnd: invRow.inv.periodEnd,
        dueDate: invRow.inv.dueDate,
        subtotalPaise: invRow.inv.subtotalPaise,
        discountPaise: invRow.inv.discountPaise,
        taxPaise: invRow.inv.taxPaise,
        totalPaise: invRow.inv.totalPaise,
        amountPaidPaise: invRow.inv.amountPaidPaise,
        lines,
        payments: payRecords,
        createdAt: invRow.inv.createdAt,
        updatedAt: invRow.inv.updatedAt,
        archivedAt: invRow.inv.archivedAt,
      };
    },

    async listInvoices(
      filter: ListInvoicesFilter,
    ): Promise<{ items: InvoiceSummaryRecord[]; total: number }> {
      const conditions = [isNull(invoices.archivedAt)];

      if (filter.customerId) {
        conditions.push(eq(invoices.customerId, filter.customerId));
      }

      if (filter.status) {
        conditions.push(eq(invoices.status, filter.status));
      }

      if (filter.overdueOnly && filter.todayIso) {
        conditions.push(eq(invoices.status, InvStatus.Confirmed));
        conditions.push(lt(invoices.dueDate, filter.todayIso));
      }

      const whereClause = and(...conditions);

      const totalResult = database
        .select({ total: count() })
        .from(invoices)
        .where(whereClause)
        .get();

      const total = totalResult?.total ?? 0;

      const rows = database
        .select({
          inv: invoices,
          cust: users,
        })
        .from(invoices)
        .innerJoin(users, eq(invoices.customerId, users.id))
        .where(whereClause)
        .orderBy(desc(invoices.createdAt))
        .limit(filter.limit)
        .offset(filter.offset)
        .all();

      const items: InvoiceSummaryRecord[] = rows.map((r) => ({
        id: r.inv.id,
        subscriptionId: r.inv.subscriptionId,
        customerId: r.inv.customerId,
        customerName: r.cust.name,
        customerEmail: r.cust.email,
        status: parseInvoiceStatus(r.inv.status),
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

      return { items, total };
    },

    async updateInvoiceStatus(
      id: string,
      status: InvoiceStatus,
      updatedAt: number,
    ): Promise<boolean> {
      const updated = database
        .update(invoices)
        .set({
          status,
          updatedAt,
        })
        .where(
          and(
            eq(invoices.id, id),
            isNull(invoices.archivedAt),
          ),
        )
        .returning()
        .get();

      return Boolean(updated);
    },

    async recordPayment(
      paymentData: {
        id: string;
        invoiceId: string;
        customerId: string;
        amountPaise: number;
        method: PaymentMethod;
        reference: string | null;
        paymentDate: string | null;
        recordedBy: string;
        createdAt: number;
      },
      newPaidPaise: number,
      markPaid: boolean,
      nowMs: number,
    ): Promise<PaymentRecord> {
      database.transaction((tx) => {
        tx.insert(payments)
          .values({
            id: paymentData.id,
            invoiceId: paymentData.invoiceId,
            customerId: paymentData.customerId,
            amountPaise: paymentData.amountPaise,
            method: paymentData.method,
            reference: paymentData.reference,
            paymentDate: paymentData.paymentDate,
            recordedBy: paymentData.recordedBy,
            createdAt: paymentData.createdAt,
          })
          .run();

        const updateData: Record<string, unknown> = {
          amountPaidPaise: newPaidPaise,
          updatedAt: nowMs,
        };

        if (markPaid) {
          updateData["status"] = InvStatus.Paid;
        }

        tx.update(invoices)
          .set(updateData)
          .where(eq(invoices.id, paymentData.invoiceId))
          .run();
      });

      return {
        id: paymentData.id,
        invoiceId: paymentData.invoiceId,
        customerId: paymentData.customerId,
        amountPaise: paymentData.amountPaise,
        method: paymentData.method,
        reference: paymentData.reference,
        paymentDate: paymentData.paymentDate,
        recordedBy: paymentData.recordedBy,
        createdAt: paymentData.createdAt,
      };
    },
  };
}
