import type {
  SubscriptionListQuery,
  SubscriptionSummary,
  SubscriptionDetail,
  CreateSubscriptionBody,
  TransitionSubscriptionBody,
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

export const subscriptionsApi = {
  list: (query: SubscriptionListQuery = {}): Promise<PaginatedResponse<SubscriptionSummary>> =>
    apiRequest<PaginatedResponse<SubscriptionSummary>>(
      `/api/subscriptions${toQueryString(query as Record<string, unknown>)}`,
      { method: "GET" },
    ),

  getById: (id: string): Promise<SubscriptionDetail> =>
    apiRequest<SubscriptionDetail>(`/api/subscriptions/${encodeURIComponent(id)}`, {
      method: "GET",
    }),

  create: (body: CreateSubscriptionBody): Promise<SubscriptionDetail> =>
    apiRequest<SubscriptionDetail>("/api/subscriptions", {
      method: "POST",
      body,
    }),

  transition: (
    id: string,
    body: TransitionSubscriptionBody,
  ): Promise<SubscriptionDetail> =>
    apiRequest<SubscriptionDetail>(
      `/api/subscriptions/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        body,
      },
    ),
};

