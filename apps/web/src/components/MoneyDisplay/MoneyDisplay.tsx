import type { ReactElement } from "react";
import { cx } from "../../lib/cx.ts";
import styles from "./MoneyDisplay.module.css";

export interface MoneyDisplayProps {
  paise: number;
  currency?: string | undefined;
  isBold?: boolean | undefined;
  isSubtle?: boolean | undefined;
  className?: string | undefined;
}

export function formatMoney(paise: number, currency: string = "₹"): string {
  const rupees = paise / 100;
  const formatted = Math.abs(rupees).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return rupees < 0 ? `-${currency}${formatted}` : `${currency}${formatted}`;
}

export function MoneyDisplay({
  paise,
  currency = "₹",
  isBold = false,
  isSubtle = false,
  className,
}: MoneyDisplayProps): ReactElement {
  return (
    <span
      className={cx(
        styles.amount,
        isBold ? styles.bold : undefined,
        isSubtle ? styles.subtle : undefined,
        className,
      )}
    >
      {formatMoney(paise, currency)}
    </span>
  );
}
