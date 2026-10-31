import type { DashboardSummary } from "@brightloop/shared";
import { apiRequest } from "../../lib/apiClient.ts";

export const dashboardApi = {
  getSummary: (): Promise<DashboardSummary> =>
    apiRequest<DashboardSummary>("/api/dashboard/summary", {
      method: "GET",
    }),
};

