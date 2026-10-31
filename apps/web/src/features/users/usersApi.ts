import type {
  CreateStaffBody,
  UserSummary,
  UsersQuery,
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

export const usersApi = {
  list: (query: UsersQuery = {}): Promise<PaginatedResponse<UserSummary>> =>
    apiRequest<PaginatedResponse<UserSummary>>(
      `/api/users${toQueryString(query as Record<string, unknown>)}`,
      { method: "GET" },
    ),

  createStaff: (body: CreateStaffBody): Promise<UserSummary> =>
    apiRequest<UserSummary>("/api/users/staff", {
      method: "POST",
      body,
    }),
};

