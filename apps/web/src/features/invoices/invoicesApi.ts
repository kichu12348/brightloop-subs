import type {
  InvoiceListQuery,
  InvoiceSummary,
  InvoiceDetail,
  TransitionInvoiceBody,
  RecordPaymentBody,
  PaymentDetail,
  PaginatedResponse,
} from "@brightloop/shared";
import { apiRequest } from "../../lib/apiClient.ts";

function toQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  const str = query.toString();
  return str ? `?${str}` : "";
}

export const invoicesApi = {
  list: (query: InvoiceListQuery = {}): Promise<PaginatedResponse<InvoiceSummary>> =>
    apiRequest<PaginatedResponse<InvoiceSummary>>(
      `/api/invoices${toQueryString(query as Record<string, unknown>)}`,
      { method: "GET" },
    ),

  getById: (id: string): Promise<InvoiceDetail> =>
    apiRequest<InvoiceDetail>(`/api/invoices/${encodeURIComponent(id)}`, {
      method: "GET",
    }),

  transition: (
    id: string,
    body: TransitionInvoiceBody,
  ): Promise<InvoiceDetail> =>
    apiRequest<InvoiceDetail>(
      `/api/invoices/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        body,
      },
    ),

  recordPayment: (
    id: string,
    body: RecordPaymentBody,
  ): Promise<PaymentDetail> =>
    apiRequest<PaymentDetail>(
      `/api/invoices/${encodeURIComponent(id)}/payments`,
      {
        method: "POST",
        body,
      },
    ),
};

