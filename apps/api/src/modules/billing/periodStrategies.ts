import { BillingPeriod } from "@brightloop/shared";

export interface BillingPeriodStrategy {
  advanceDate(isoDate: string): string;
}

function parseIsoDate(isoDate: string): {
  year: number;
  month: number;
  day: number;
} {
  const parts = isoDate.split("-");
  const yearStr = parts[0];
  const monthStr = parts[1];
  const dayStr = parts[2];

  if (yearStr === undefined || monthStr === undefined || dayStr === undefined) {
    throw new Error(`Invalid ISO date format: ${isoDate}`);
  }

  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new Error(`Invalid ISO date values: ${isoDate}`);
  }

  return { year, month, day };
}

function formatIsoDate(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDaysIso(isoDate: string, days: number): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

export const dailyStrategy: BillingPeriodStrategy = {
  advanceDate(isoDate: string): string {
    return addDaysIso(isoDate, 1);
  },
};

export const weeklyStrategy: BillingPeriodStrategy = {
  advanceDate(isoDate: string): string {
    return addDaysIso(isoDate, 7);
  },
};

export const monthlyStrategy: BillingPeriodStrategy = {
  advanceDate(isoDate: string): string {
    const { year, month, day } = parseIsoDate(isoDate);
    const targetYear = month === 12 ? year + 1 : year;
    const targetMonth = month === 12 ? 1 : month + 1;
    const maxDays = getDaysInMonth(targetYear, targetMonth);
    const targetDay = Math.min(day, maxDays);
    return formatIsoDate(targetYear, targetMonth, targetDay);
  },
};

export const yearlyStrategy: BillingPeriodStrategy = {
  advanceDate(isoDate: string): string {
    const { year, month, day } = parseIsoDate(isoDate);
    const targetYear = year + 1;
    const maxDays = getDaysInMonth(targetYear, month);
    const targetDay = Math.min(day, maxDays);
    return formatIsoDate(targetYear, month, targetDay);
  },
};

export const PERIOD_STRATEGIES: Record<BillingPeriod, BillingPeriodStrategy> = {
  [BillingPeriod.Daily]: dailyStrategy,
  [BillingPeriod.Weekly]: weeklyStrategy,
  [BillingPeriod.Monthly]: monthlyStrategy,
  [BillingPeriod.Yearly]: yearlyStrategy,
};

export function advanceBillingDate(
  isoDate: string,
  period: BillingPeriod,
): string {
  const strategy = PERIOD_STRATEGIES[period];
  if (!strategy) {
    throw new Error(`Unsupported billing period: ${String(period)}`);
  }
  return strategy.advanceDate(isoDate);
}

