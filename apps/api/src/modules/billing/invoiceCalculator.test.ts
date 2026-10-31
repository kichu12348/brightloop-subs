import { describe, expect, it } from "bun:test";
import { DiscountKind, DiscountScope } from "@brightloop/shared";
import {
  applyBasisPoints,
  computeLineGrossPaise,
  computeUnitPricePaise,
} from "./pricing.ts";
import {
  type DiscountData,
  isDiscountEligible,
} from "./discountStrategies.ts";
import {
  calculateInvoice,
  type InvoiceLineInput,
} from "./invoiceCalculator.ts";

describe("Pricing Primitives", () => {
  it("applies basis points with integer half-up rounding", () => {
    expect(applyBasisPoints(10000, 1800)).toBe(1800);
    expect(applyBasisPoints(100, 50)).toBe(1);
    expect(applyBasisPoints(99, 50)).toBe(0);
    expect(applyBasisPoints(1000, 0)).toBe(0);
  });

  it("computes unit price with variant extra price add-on", () => {
    expect(computeUnitPricePaise(100000, 56000)).toBe(156000);
    expect(computeUnitPricePaise(100000, null)).toBe(100000);
    expect(computeUnitPricePaise(100000, undefined)).toBe(100000);
  });

  it("computes line gross paise correctly", () => {
    expect(computeLineGrossPaise(156000, 2)).toBe(312000);
    expect(computeLineGrossPaise(1000, 0)).toBe(0);
  });
});

describe("Discount Eligibility", () => {
  const baseDiscount: DiscountData = {
    id: "disc-1",
    code: "SAVE10",
    kind: DiscountKind.Percentage,
    value: 1000,
    scope: DiscountScope.Subscription,
    minQuantity: 2,
    minPurchasePaise: 5000,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    maxUses: 10,
    timesUsed: 0,
  };

  const sampleLines = [
    {
      productId: "prod-1",
      basePricePaise: 3000,
      quantity: 2,
    },
  ];

  it("is eligible under valid conditions", () => {
    expect(
      isDiscountEligible(baseDiscount, {
        billingDate: "2026-06-15",
        lines: sampleLines,
      }),
    ).toBe(true);
  });

  it("is ineligible when billingDate is before startDate", () => {
    expect(
      isDiscountEligible(baseDiscount, {
        billingDate: "2025-12-31",
        lines: sampleLines,
      }),
    ).toBe(false);
  });

  it("is ineligible when billingDate is after endDate", () => {
    expect(
      isDiscountEligible(baseDiscount, {
        billingDate: "2027-01-01",
        lines: sampleLines,
      }),
    ).toBe(false);
  });

  it("is ineligible when usage limit is reached", () => {
    const exhaustedDiscount: DiscountData = {
      ...baseDiscount,
      timesUsed: 10,
    };
    expect(
      isDiscountEligible(exhaustedDiscount, {
        billingDate: "2026-06-15",
        lines: sampleLines,
      }),
    ).toBe(false);
  });

  it("is ineligible when total quantity is below minimum", () => {
    const lowQtyLines = [
      {
        productId: "prod-1",
        basePricePaise: 6000,
        quantity: 1,
      },
    ];
    expect(
      isDiscountEligible(baseDiscount, {
        billingDate: "2026-06-15",
        lines: lowQtyLines,
      }),
    ).toBe(false);
  });

  it("is ineligible when gross amount is below minPurchasePaise", () => {
    const lowGrossLines = [
      {
        productId: "prod-1",
        basePricePaise: 2000,
        quantity: 2,
      },
    ];
    expect(
      isDiscountEligible(baseDiscount, {
        billingDate: "2026-06-15",
        lines: lowGrossLines,
      }),
    ).toBe(false);
  });

  it("evaluates product scoped discounts against matching products only", () => {
    const productDiscount: DiscountData = {
      ...baseDiscount,
      scope: DiscountScope.Product,
      productId: "prod-target",
      minQuantity: 2,
      minPurchasePaise: 5000,
    };

    const mixedLines = [
      {
        productId: "prod-other",
        basePricePaise: 10000,
        quantity: 5,
      },
      {
        productId: "prod-target",
        basePricePaise: 3000,
        quantity: 2,
      },
    ];

    expect(
      isDiscountEligible(productDiscount, {
        billingDate: "2026-06-15",
        lines: mixedLines,
      }),
    ).toBe(true);

    const nonMatchingLines = [
      {
        productId: "prod-other",
        basePricePaise: 10000,
        quantity: 5,
      },
    ];

    expect(
      isDiscountEligible(productDiscount, {
        billingDate: "2026-06-15",
        lines: nonMatchingLines,
      }),
    ).toBe(false);
  });
});

describe("Invoice Calculator", () => {
  it("applies variant extra price correctly to line calculations", () => {
    const lines: readonly InvoiceLineInput[] = [
      {
        productId: "prod-odoo",
        variantId: "var-premium",
        description: "Odoo Enterprise Subscription",
        basePricePaise: 100000,
        extraPricePaise: 56000,
        quantity: 1,
      },
    ];

    const result = calculateInvoice({
      billingDate: "2026-06-15",
      lines,
    });

    const line = result.lines[0];
    expect(line).toBeDefined();
    if (line !== undefined) {
      expect(line.unitPricePaise).toBe(156000);
      expect(line.grossPaise).toBe(156000);
      expect(line.totalPaise).toBe(156000);
    }
    expect(result.subtotalPaise).toBe(156000);
    expect(result.totalAmountPaise).toBe(156000);
  });

  it("calculates percentage discount on subscription scope", () => {
    const lines: readonly InvoiceLineInput[] = [
      {
        productId: "p1",
        description: "Item 1",
        basePricePaise: 5000,
        quantity: 1,
      },
      {
        productId: "p2",
        description: "Item 2",
        basePricePaise: 5000,
        quantity: 1,
      },
    ];

    const discount: DiscountData = {
      id: "d1",
      code: "TENOFF",
      kind: DiscountKind.Percentage,
      value: 1000,
      scope: DiscountScope.Subscription,
      timesUsed: 0,
    };

    const result = calculateInvoice({
      billingDate: "2026-06-15",
      lines,
      discount,
    });

    expect(result.subtotalPaise).toBe(10000);
    expect(result.discountTotalPaise).toBe(1000);
    expect(result.totalAmountPaise).toBe(9000);
    expect(result.discountApplied).toBe(true);

    const line0 = result.lines[0];
    const line1 = result.lines[1];
    expect(line0?.discountPaise).toBe(500);
    expect(line1?.discountPaise).toBe(500);
  });

  it("calculates percentage discount restricted to product scope", () => {
    const lines: readonly InvoiceLineInput[] = [
      {
        productId: "p1",
        description: "Item 1",
        basePricePaise: 10000,
        quantity: 1,
      },
      {
        productId: "p2",
        description: "Item 2",
        basePricePaise: 10000,
        quantity: 1,
      },
    ];

    const discount: DiscountData = {
      id: "d1",
      code: "P1ONLY",
      kind: DiscountKind.Percentage,
      value: 2000,
      scope: DiscountScope.Product,
      productId: "p1",
      timesUsed: 0,
    };

    const result = calculateInvoice({
      billingDate: "2026-06-15",
      lines,
      discount,
    });

    expect(result.subtotalPaise).toBe(20000);
    expect(result.discountTotalPaise).toBe(2000);
    expect(result.totalAmountPaise).toBe(18000);

    const line0 = result.lines[0];
    const line1 = result.lines[1];
    expect(line0?.discountPaise).toBe(2000);
    expect(line1?.discountPaise).toBe(0);
  });

  it("allocates fixed discount across 3 equal lines with zero lost paise", () => {
    const lines: readonly InvoiceLineInput[] = [
      {
        productId: "p1",
        description: "Line 1",
        basePricePaise: 1000,
        quantity: 1,
      },
      {
        productId: "p2",
        description: "Line 2",
        basePricePaise: 1000,
        quantity: 1,
      },
      {
        productId: "p3",
        description: "Line 3",
        basePricePaise: 1000,
        quantity: 1,
      },
    ];

    const discount: DiscountData = {
      id: "d-fixed",
      code: "FIXED1000",
      kind: DiscountKind.Fixed,
      value: 1000,
      scope: DiscountScope.Subscription,
      timesUsed: 0,
    };

    const result = calculateInvoice({
      billingDate: "2026-06-15",
      lines,
      discount,
    });

    const l0 = result.lines[0];
    const l1 = result.lines[1];
    const l2 = result.lines[2];

    expect(l0?.discountPaise).toBe(333);
    expect(l1?.discountPaise).toBe(333);
    expect(l2?.discountPaise).toBe(334);

    expect(result.discountTotalPaise).toBe(1000);
    expect(result.totalAmountPaise).toBe(2000);
    expect(result.discountApplied).toBe(true);
  });

  it("allocates fixed discount across unequal lines preserving exact remainder", () => {
    const lines: readonly InvoiceLineInput[] = [
      {
        productId: "p1",
        description: "Line 1",
        basePricePaise: 5000,
        quantity: 1,
      },
      {
        productId: "p2",
        description: "Line 2",
        basePricePaise: 3000,
        quantity: 1,
      },
      {
        productId: "p3",
        description: "Line 3",
        basePricePaise: 2000,
        quantity: 1,
      },
    ];

    const discount: DiscountData = {
      id: "d-fixed-unequal",
      code: "FIXED1001",
      kind: DiscountKind.Fixed,
      value: 1001,
      scope: DiscountScope.Subscription,
      timesUsed: 0,
    };

    const result = calculateInvoice({
      billingDate: "2026-06-15",
      lines,
      discount,
    });

    const l0 = result.lines[0];
    const l1 = result.lines[1];
    const l2 = result.lines[2];

    expect(l0?.discountPaise).toBe(500);
    expect(l1?.discountPaise).toBe(300);
    expect(l2?.discountPaise).toBe(201);
    expect(result.discountTotalPaise).toBe(1001);
    expect(result.totalAmountPaise).toBe(8999);
  });

  it("caps fixed discount to pool gross when discount exceeds subtotal", () => {
    const lines: readonly InvoiceLineInput[] = [
      {
        productId: "p1",
        description: "Small Item",
        basePricePaise: 400,
        quantity: 1,
      },
    ];

    const discount: DiscountData = {
      id: "d-huge",
      code: "HUGE",
      kind: DiscountKind.Fixed,
      value: 10000,
      scope: DiscountScope.Subscription,
      timesUsed: 0,
    };

    const result = calculateInvoice({
      billingDate: "2026-06-15",
      lines,
      discount,
    });

    expect(result.discountTotalPaise).toBe(400);
    expect(result.totalAmountPaise).toBe(0);
  });

  it("enforces invariant order: calculates tax on (gross - discount), never on gross", () => {
    const lines: readonly InvoiceLineInput[] = [
      {
        productId: "p1",
        description: "Service with 18% GST",
        basePricePaise: 10000,
        quantity: 1,
        tax: {
          rateBasisPoints: 1800,
          isActive: true,
        },
      },
    ];

    const discount: DiscountData = {
      id: "d-fixed-tax",
      code: "DISC2000",
      kind: DiscountKind.Fixed,
      value: 2000,
      scope: DiscountScope.Subscription,
      timesUsed: 0,
    };

    const result = calculateInvoice({
      billingDate: "2026-06-15",
      lines,
      discount,
    });

    const line = result.lines[0];
    expect(line).toBeDefined();
    if (line !== undefined) {
      expect(line.grossPaise).toBe(10000);
      expect(line.discountPaise).toBe(2000);
      expect(line.taxablePaise).toBe(8000);
      expect(line.taxPaise).toBe(1440);
      expect(line.totalPaise).toBe(9440);
    }

    expect(result.subtotalPaise).toBe(10000);
    expect(result.discountTotalPaise).toBe(2000);
    expect(result.taxTotalPaise).toBe(1440);
    expect(result.totalAmountPaise).toBe(9440);
  });

  it("handles inactive tax by applying zero tax", () => {
    const lines: readonly InvoiceLineInput[] = [
      {
        productId: "p1",
        description: "Tax Inactive Item",
        basePricePaise: 10000,
        quantity: 1,
        tax: {
          rateBasisPoints: 1800,
          isActive: false,
        },
      },
    ];

    const result = calculateInvoice({
      billingDate: "2026-06-15",
      lines,
    });

    const line = result.lines[0];
    expect(line?.taxPaise).toBe(0);
    expect(result.taxTotalPaise).toBe(0);
    expect(result.totalAmountPaise).toBe(10000);
  });
});

