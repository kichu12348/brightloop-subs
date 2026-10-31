import {
  DiscountKind,
  DiscountScope,
} from "@brightloop/shared";
import {
  applyBasisPoints,
  computeLineGrossPaise,
  computeUnitPricePaise,
} from "./pricing.ts";

export interface DiscountData {
  readonly id: string;
  readonly code: string;
  readonly kind: DiscountKind;
  readonly value: number;
  readonly scope: DiscountScope;
  readonly productId?: string | null;
  readonly minQuantity?: number | null;
  readonly minPurchasePaise?: number | null;
  readonly startDate?: string | null;
  readonly endDate?: string | null;
  readonly maxUses?: number | null;
  readonly timesUsed: number;
}

export interface PricingLineInput {
  readonly productId: string;
  readonly basePricePaise: number;
  readonly extraPricePaise?: number | null;
  readonly quantity: number;
}

export interface LineForDiscount {
  readonly productId: string;
  readonly grossPaise: number;
  readonly isEligible: boolean;
}

export interface DiscountStrategy {
  calculate(
    discount: DiscountData,
    lines: readonly LineForDiscount[],
  ): readonly number[];
}

export const percentageDiscountStrategy: DiscountStrategy = {
  calculate(
    discount: DiscountData,
    lines: readonly LineForDiscount[],
  ): readonly number[] {
    return lines.map((line) => {
      if (!line.isEligible || line.grossPaise <= 0 || discount.value <= 0) {
        return 0;
      }
      const rawDiscount = applyBasisPoints(line.grossPaise, discount.value);
      return Math.min(rawDiscount, line.grossPaise);
    });
  },
};

export const fixedDiscountStrategy: DiscountStrategy = {
  calculate(
    discount: DiscountData,
    lines: readonly LineForDiscount[],
  ): readonly number[] {
    const discounts: number[] = new Array<number>(lines.length).fill(0);
    if (discount.value <= 0) {
      return discounts;
    }

    const eligibleIndices: number[] = [];
    let eligiblePoolGrossPaise = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line !== undefined && line.isEligible && line.grossPaise > 0) {
        eligibleIndices.push(i);
        eligiblePoolGrossPaise += line.grossPaise;
      }
    }

    if (eligibleIndices.length === 0 || eligiblePoolGrossPaise <= 0) {
      return discounts;
    }

    const totalDiscount = Math.min(discount.value, eligiblePoolGrossPaise);
    let allocatedTotal = 0;

    for (let i = 0; i < eligibleIndices.length - 1; i++) {
      const lineIndex = eligibleIndices[i];
      if (lineIndex === undefined) {
        continue;
      }
      const line = lines[lineIndex];
      if (line === undefined) {
        continue;
      }

      const share = Math.floor(
        (totalDiscount * line.grossPaise) / eligiblePoolGrossPaise,
      );
      discounts[lineIndex] = share;
      allocatedTotal += share;
    }

    const lastEligibleIndex = eligibleIndices[eligibleIndices.length - 1];
    if (lastEligibleIndex !== undefined) {
      discounts[lastEligibleIndex] = totalDiscount - allocatedTotal;
    }

    return discounts;
  },
};

export const DISCOUNT_STRATEGIES: Record<DiscountKind, DiscountStrategy> = {
  [DiscountKind.Percentage]: percentageDiscountStrategy,
  [DiscountKind.Fixed]: fixedDiscountStrategy,
};

export function isDiscountEligible(
  discount: DiscountData,
  context: {
    readonly billingDate: string;
    readonly lines: readonly PricingLineInput[];
  },
): boolean {
  if (
    discount.startDate !== null &&
    discount.startDate !== undefined &&
    context.billingDate < discount.startDate
  ) {
    return false;
  }

  if (
    discount.endDate !== null &&
    discount.endDate !== undefined &&
    context.billingDate > discount.endDate
  ) {
    return false;
  }

  if (
    discount.maxUses !== null &&
    discount.maxUses !== undefined &&
    discount.timesUsed >= discount.maxUses
  ) {
    return false;
  }

  const minQty = discount.minQuantity ?? 0;
  const minPurchase = discount.minPurchasePaise ?? 0;

  switch (discount.scope) {
    case DiscountScope.Subscription: {
      if (context.lines.length === 0) {
        return false;
      }
      let totalQuantity = 0;
      let totalGrossPaise = 0;
      for (const line of context.lines) {
        totalQuantity += line.quantity;
        const unit = computeUnitPricePaise(
          line.basePricePaise,
          line.extraPricePaise ?? null,
        );
        totalGrossPaise += computeLineGrossPaise(unit, line.quantity);
      }
      return totalQuantity >= minQty && totalGrossPaise >= minPurchase;
    }
    case DiscountScope.Product: {
      if (!discount.productId) {
        return false;
      }
      const matchingLines = context.lines.filter(
        (l) => l.productId === discount.productId,
      );
      if (matchingLines.length === 0) {
        return false;
      }
      let totalQuantity = 0;
      let totalGrossPaise = 0;
      for (const line of matchingLines) {
        totalQuantity += line.quantity;
        const unit = computeUnitPricePaise(
          line.basePricePaise,
          line.extraPricePaise ?? null,
        );
        totalGrossPaise += computeLineGrossPaise(unit, line.quantity);
      }
      return totalQuantity >= minQty && totalGrossPaise >= minPurchase;
    }
    default: {
      const exhaustiveCheck: never = discount.scope;
      throw new Error(`Unhandled discount scope: ${String(exhaustiveCheck)}`);
    }
  }
}

