import type { DashboardSummary } from "@brightloop/shared";
import type { Clock } from "../../lib/clock.ts";
import type { DashboardRepository } from "./repository.ts";

export interface DashboardServiceDependencies {
  repository: DashboardRepository;
  clock: Clock;
}

export interface DashboardService {
  getSummary(): Promise<DashboardSummary>;
}

export function createDashboardService(
  deps: DashboardServiceDependencies,
): DashboardService {
  return {
    async getSummary(): Promise<DashboardSummary> {
      const today = deps.clock.todayIso();
      return deps.repository.getSummary(today);
    },
  };
}

