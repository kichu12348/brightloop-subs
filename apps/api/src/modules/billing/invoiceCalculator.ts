import { DiscountScope } from "@brightloop/shared";
import {
  applyBasisPoints,
  computeLineGrossPaise,
  computeUnitPricePaise,
} from "./pricing.ts";
import {
  type DiscountData,
  DISCOUNT_STRATEGIES,
  isDiscountEligible,
} from "./discountStrategies.ts";

export interface InvoiceLineTaxInput {
  readonly rateBasisPoints: number;
  readonly isActive: boolean;
}

export interface InvoiceLineInput {
  readonly productId: string;
  readonly variantId?: string | null;
  readonly description: string;
  readonly basePricePaise: number;
  readonly extraPricePaise?: number | null;
  readonly quantity: number;
  readonly tax?: InvoiceLineTaxInput | null;
}

export interface CalculateInvoiceInput {
  readonly billingDate: string;
  readonly lines: readonly InvoiceLineInput[];
  readonly discount?: DiscountData | null;
}

export interface CalculatedInvoiceLine {
  readonly productId: string;
  readonly variantId: string | null;
  readonly description: string;
  readonly unitPricePaise: number;
  readonly quantity: number;
  readonly grossPaise: number;
  readonly discountPaise: number;
  readonly taxablePaise: number;
  readonly taxRateBasisPoints: number;
  readonly taxPaise: number;
  readonly totalPaise: number;
}

export interface CalculatedInvoice {
  readonly lines: readonly CalculatedInvoiceLine[];
  readonly subtotalPaise: number;
  readonly discountTotalPaise: number;
  readonly taxTotalPaise: number;
  readonly totalAmountPaise: number;
  readonly discountApplied: boolean;
}

export function calculateInvoice(
  input: CalculateInvoiceInput,
): CalculatedInvoice {
  const intermediateLines = input.lines.map((line) => {
    const unitPricePaise = computeUnitPricePaise(
      line.basePricePaise,
      line.extraPricePaise ?? null,
    );
    const grossPaise = computeLineGrossPaise(unitPricePaise, line.quantity);
    return {
      line,
      unitPricePaise,
      grossPaise,
    };
  });

  let lineDiscounts: readonly number[] = intermediateLines.map(() => 0);

  if (
    input.discount &&
    isDiscountEligible(input.discount, {
      billingDate: input.billingDate,
      lines: input.lines,
    })
  ) {
    const discount = input.discount;
    const linesForDiscount = intermediateLines.map((item) => {
      const isEligible =
        discount.scope === DiscountScope.Subscription
          ? true
          : discount.productId === item.line.productId;

      return {
        productId: item.line.productId,
        grossPaise: item.grossPaise,
        isEligible,
      };
    });

    const strategy = DISCOUNT_STRATEGIES[discount.kind];
    if (!strategy) {
      throw new Error(`Unsupported discount kind: ${String(discount.kind)}`);
    }

    lineDiscounts = strategy.calculate(discount, linesForDiscount);
  }

  const calculatedLines: CalculatedInvoiceLine[] = intermediateLines.map(
    (item, index) => {
      const discountPaise = lineDiscounts[index] ?? 0;
      const taxablePaise = Math.max(0, item.grossPaise - discountPaise);

      const tax = item.line.tax;
      const isTaxActive = tax !== undefined && tax !== null && tax.isActive;
      const taxRateBasisPoints = isTaxActive ? tax.rateBasisPoints : 0;
      const taxPaise = isTaxActive
        ? applyBasisPoints(taxablePaise, taxRateBasisPoints)
        : 0;

      const totalPaise = taxablePaise + taxPaise;

      return {
        productId: item.line.productId,
        variantId: item.line.variantId ?? null,
        description: item.line.description,
        unitPricePaise: item.unitPricePaise,
        quantity: item.line.quantity,
        grossPaise: item.grossPaise,
        discountPaise,
        taxablePaise,
        taxRateBasisPoints,
        taxPaise,
        totalPaise,
      };
    },
  );

  let subtotalPaise = 0;
  let discountTotalPaise = 0;
  let taxTotalPaise = 0;
  let totalAmountPaise = 0;

  for (const line of calculatedLines) {
    subtotalPaise += line.grossPaise;
    discountTotalPaise += line.discountPaise;
    taxTotalPaise += line.taxPaise;
    totalAmountPaise += line.totalPaise;
  }

  return {
    lines: calculatedLines,
    subtotalPaise,
    discountTotalPaise,
    taxTotalPaise,
    totalAmountPaise,
    discountApplied: discountTotalPaise > 0,
  };
}

