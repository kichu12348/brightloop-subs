import {
  type InvoiceListQuery,
  type RecordPaymentBody,
  type PaginatedResponse,
  ErrorCode,
  Role,
  InvoiceStatus,
  RealtimeEventType,
} from "@brightloop/shared";
import { AppError } from "../../errors/appError.ts";
import type { Clock } from "../../lib/clock.ts";
import {
  validateInvoiceTransition,
  validatePaymentAllocation,
} from "../subscriptions/lifecyclePolicy.ts";
import type {
  InvoicesRepository,
  InvoiceDetailRecord,
  InvoiceSummaryRecord,
  PaymentRecord,
} from "./repository.ts";
import type { RealtimePublisher } from "../realtime/index.ts";

export interface InvoicesServiceDependencies {
  repository: InvoicesRepository;
  clock: Clock;
  realtime?: RealtimePublisher;
}

export interface InvoicesService {
  getInvoiceById(
    id: string,
    callerRole: Role,
    callerId: string,
  ): Promise<InvoiceDetailRecord>;
  listInvoices(
    query: InvoiceListQuery,
    callerRole: Role,
    callerId: string,
  ): Promise<PaginatedResponse<InvoiceSummaryRecord>>;
  transitionInvoice(
    id: string,
    toStatus: InvoiceStatus,
  ): Promise<InvoiceDetailRecord>;
  recordPayment(
    invoiceId: string,
    body: RecordPaymentBody,
    callerRole: Role,
    callerId: string,
  ): Promise<PaymentRecord>;
}

function normalizeInvoiceStatus(
  status: string | undefined,
): InvoiceStatus | undefined {
  if (!status) {
    return undefined;
  }
  switch (status.toLowerCase()) {
    case InvoiceStatus.Draft:
      return InvoiceStatus.Draft;
    case InvoiceStatus.Confirmed:
      return InvoiceStatus.Confirmed;
    case InvoiceStatus.Paid:
      return InvoiceStatus.Paid;
    case InvoiceStatus.Cancelled:
      return InvoiceStatus.Cancelled;
    default:
      return undefined;
  }
}

export function createInvoicesService(
  deps: InvoicesServiceDependencies,
): InvoicesService {
  return {
    async getInvoiceById(
      id: string,
      callerRole: Role,
      callerId: string,
    ): Promise<InvoiceDetailRecord> {
      const invoice = await deps.repository.findInvoiceById(id);
      if (!invoice) {
        throw new AppError(ErrorCode.NotFound, "Invoice not found", 404);
      }

      if (callerRole === Role.Customer && invoice.customerId !== callerId) {
        throw new AppError(ErrorCode.NotFound, "Invoice not found", 404);
      }

      return invoice;
    },

    async listInvoices(
      query: InvoiceListQuery,
      callerRole: Role,
      callerId: string,
    ): Promise<PaginatedResponse<InvoiceSummaryRecord>> {
      const page = query.page ?? 1;
      const pageSize = Math.min(query.pageSize ?? 20, 100);
      const offset = (page - 1) * pageSize;

      const effectiveCustomerId =
        callerRole === Role.Customer ? callerId : query.customerId;

      const { items, total } = await deps.repository.listInvoices({
        customerId: effectiveCustomerId,
        status: normalizeInvoiceStatus(query.status),
        overdueOnly: query.overdueOnly,
        todayIso: deps.clock.todayIso(),
        limit: pageSize,
        offset,
      });

      return {
        items,
        total,
        page,
        pageSize,
      };
    },

    async transitionInvoice(
      id: string,
      toStatus: InvoiceStatus,
    ): Promise<InvoiceDetailRecord> {
      if (toStatus === InvoiceStatus.Paid) {
        throw new AppError(
          ErrorCode.InvalidTransition,
          "Invoices cannot be manually transitioned to Paid",
          400,
        );
      }

      const invoice = await deps.repository.findInvoiceById(id);
      if (!invoice) {
        throw new AppError(ErrorCode.NotFound, "Invoice not found", 404);
      }

      const fromStatus = invoice.status;
      validateInvoiceTransition(fromStatus, toStatus);

      const now = deps.clock.nowMs();
      await deps.repository.updateInvoiceStatus(id, toStatus, now);

      const updated = await deps.repository.findInvoiceById(id);
      if (!updated) {
        throw new AppError(ErrorCode.NotFound, "Invoice not found", 404);
      }

      deps.realtime?.publish({
        type: RealtimeEventType.InvoiceStatusChanged,
        timestampMs: now,
        customerId: updated.customerId,
        payload: {
          id: updated.id,
          customerId: updated.customerId,
          fromStatus,
          toStatus: updated.status,
        },
      });

      return updated;
    },

    async recordPayment(
      invoiceId: string,
      body: RecordPaymentBody,
      callerRole: Role,
      callerId: string,
    ): Promise<PaymentRecord> {
      const invoice = await deps.repository.findInvoiceById(invoiceId);
      if (!invoice) {
        throw new AppError(ErrorCode.NotFound, "Invoice not found", 404);
      }

      if (callerRole === Role.Customer && invoice.customerId !== callerId) {
        throw new AppError(ErrorCode.NotFound, "Invoice not found", 404);
      }

      if (invoice.status !== InvoiceStatus.Confirmed) {
        throw new AppError(
          ErrorCode.Conflict,
          "Payments can only be recorded on confirmed invoices",
          409,
        );
      }

      const allocation = validatePaymentAllocation(
        invoice.totalPaise,
        invoice.amountPaidPaise,
        body.amountPaise,
      );

      const now = deps.clock.nowMs();
      const paymentId = crypto.randomUUID();

      const payment = await deps.repository.recordPayment(
        {
          id: paymentId,
          invoiceId,
          customerId: invoice.customerId,
          amountPaise: body.amountPaise,
          method: body.method,
          reference: body.note ?? null,
          paymentDate: body.paymentDate ?? deps.clock.todayIso(),
          recordedBy: callerId,
          createdAt: now,
        },
        allocation.newPaidPaise,
        allocation.shouldMarkPaid,
        now,
      );

      deps.realtime?.publish({
        type: RealtimeEventType.PaymentRecorded,
        timestampMs: now,
        customerId: invoice.customerId,
        payload: {
          id: payment.id,
          invoiceId: payment.invoiceId,
          customerId: payment.customerId,
          amountPaise: payment.amountPaise,
          method: payment.method,
        },
      });

      if (allocation.shouldMarkPaid) {
        deps.realtime?.publish({
          type: RealtimeEventType.InvoiceStatusChanged,
          timestampMs: now,
          customerId: invoice.customerId,
          payload: {
            id: invoice.id,
            customerId: invoice.customerId,
            fromStatus: invoice.status,
            toStatus: InvoiceStatus.Paid,
          },
        });
      }

      return payment;
    },
  };
}

