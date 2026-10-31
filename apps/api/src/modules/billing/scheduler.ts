import { Cron } from "croner";
import type { BillingService } from "./service.ts";

export interface BillingScheduler {
  stop(): void;
}

export function startBillingScheduler(
  billingService: BillingService,
  cronPattern = "0 0 * * *",
): BillingScheduler {
  const job = new Cron(cronPattern, { protect: true }, async () => {
    await billingService.runBilling();
  });

  return {
    stop(): void {
      job.stop();
    },
  };
}

