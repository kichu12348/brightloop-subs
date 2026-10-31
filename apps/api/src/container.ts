import { db, type AppDatabase } from "./db/client.ts";
import { systemClock, type Clock } from "./lib/clock.ts";

export interface AppDependencies {
  db: AppDatabase;
  clock: Clock;
}

export function createContainer(
  overrides: Partial<AppDependencies> = {},
): AppDependencies {
  return {
    db: overrides.db ?? db,
    clock: overrides.clock ?? systemClock,
  };
}

