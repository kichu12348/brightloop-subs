export function applyBasisPoints(
  amountPaise: number,
  basisPoints: number,
): number {
  return Math.floor((amountPaise * basisPoints + 5000) / 10000);
}

export function computeUnitPricePaise(
  baseSalesPricePaise: number,
  variantExtraPricePaise: number | null | undefined,
): number {
  return baseSalesPricePaise + (variantExtraPricePaise ?? 0);
}

export function computeLineGrossPaise(
  unitPricePaise: number,
  quantity: number,
): number {
  return unitPricePaise * quantity;
}

