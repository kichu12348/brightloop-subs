import { describe, expect, it } from "bun:test";
import { BillingPeriod } from "@brightloop/shared";
import {
  advanceBillingDate,
  addDaysIso,
  dailyStrategy,
  weeklyStrategy,
  monthlyStrategy,
  yearlyStrategy,
} from "./periodStrategies.ts";

describe("Period strategies", () => {
  describe("Daily", () => {
    it("advances regular day by one", () => {
      expect(dailyStrategy.advanceDate("2026-03-10")).toBe("2026-03-11");
    });

    it("rolls over month end", () => {
      expect(dailyStrategy.advanceDate("2026-01-31")).toBe("2026-02-01");
    });

    it("rolls over year end", () => {
      expect(dailyStrategy.advanceDate("2026-12-31")).toBe("2027-01-01");
    });

    it("handles leap year day properly", () => {
      expect(dailyStrategy.advanceDate("2024-02-28")).toBe("2024-02-29");
      expect(dailyStrategy.advanceDate("2024-02-29")).toBe("2024-03-01");
    });
  });

  describe("Weekly", () => {
    it("advances by exactly seven days", () => {
      expect(weeklyStrategy.advanceDate("2026-01-01")).toBe("2026-01-08");
    });

    it("rolls over month boundary", () => {
      expect(weeklyStrategy.advanceDate("2026-01-28")).toBe("2026-02-04");
    });

    it("rolls over year boundary", () => {
      expect(weeklyStrategy.advanceDate("2026-12-28")).toBe("2027-01-04");
    });
  });

  describe("Monthly", () => {
    it("advances standard month preserving day", () => {
      expect(monthlyStrategy.advanceDate("2026-04-15")).toBe("2026-05-15");
    });

    it("clamps January 31 to February 28 on non-leap years", () => {
      expect(monthlyStrategy.advanceDate("2026-01-31")).toBe("2026-02-28");
    });

    it("clamps January 30 to February 28 on non-leap years", () => {
      expect(monthlyStrategy.advanceDate("2026-01-30")).toBe("2026-02-28");
    });

    it("clamps January 31 to February 29 on leap years", () => {
      expect(monthlyStrategy.advanceDate("2024-01-31")).toBe("2024-02-29");
    });

    it("clamps 31-day months to 30-day months", () => {
      expect(monthlyStrategy.advanceDate("2026-03-31")).toBe("2026-04-30");
      expect(monthlyStrategy.advanceDate("2026-05-31")).toBe("2026-06-30");
      expect(monthlyStrategy.advanceDate("2026-08-31")).toBe("2026-09-30");
      expect(monthlyStrategy.advanceDate("2026-10-31")).toBe("2026-11-30");
    });

    it("advances December to January of next year", () => {
      expect(monthlyStrategy.advanceDate("2026-12-31")).toBe("2027-01-31");
    });
  });

  describe("Yearly", () => {
    it("advances standard year preserving month and day", () => {
      expect(yearlyStrategy.advanceDate("2025-06-15")).toBe("2026-06-15");
    });

    it("clamps February 29 on leap year to February 28 on following non-leap year", () => {
      expect(yearlyStrategy.advanceDate("2024-02-29")).toBe("2025-02-28");
    });

    it("advances February 28 across regular years", () => {
      expect(yearlyStrategy.advanceDate("2025-02-28")).toBe("2026-02-28");
    });
  });

  describe("addDaysIso", () => {
    it("returns same date when adding zero days", () => {
      expect(addDaysIso("2026-05-10", 0)).toBe("2026-05-10");
    });

    it("adds arbitrary positive days", () => {
      expect(addDaysIso("2026-01-01", 10)).toBe("2026-01-11");
    });

    it("subtracts days with negative numbers", () => {
      expect(addDaysIso("2026-01-05", -5)).toBe("2025-12-31");
    });

    it("throws on invalid ISO format", () => {
      expect(() => addDaysIso("invalid-date", 1)).toThrow("Invalid ISO date");
      expect(() => addDaysIso("2026-01", 1)).toThrow("Invalid ISO date");
    });
  });

  describe("advanceBillingDate lookup", () => {
    it("dispatches to correct strategies", () => {
      expect(advanceBillingDate("2026-01-01", BillingPeriod.Daily)).toBe("2026-01-02");
      expect(advanceBillingDate("2026-01-01", BillingPeriod.Weekly)).toBe("2026-01-08");
      expect(advanceBillingDate("2026-01-31", BillingPeriod.Monthly)).toBe("2026-02-28");
      expect(advanceBillingDate("2024-02-29", BillingPeriod.Yearly)).toBe("2025-02-28");
    });

    it("throws on unsupported billing period", () => {
      expect(() =>
        advanceBillingDate("2026-01-01", "hourly" as unknown as BillingPeriod),
      ).toThrow("Unsupported billing period: hourly");
    });
  });
});

