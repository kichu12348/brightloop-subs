import type { BillingRunResult, RunBillingBody } from "@brightloop/shared";
import { apiRequest } from "../../lib/apiClient.ts";

export const billingApi = {
  runBilling: (body: RunBillingBody = {}): Promise<BillingRunResult> =>
    apiRequest<BillingRunResult>("/api/billing/run", {
      method: "POST",
      body,
    }),
};

