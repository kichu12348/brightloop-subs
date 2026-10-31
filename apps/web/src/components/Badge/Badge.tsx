import type { ReactElement, ReactNode } from "react";
import { LuCircleAlert } from "react-icons/lu";
import { cx } from "../../lib/cx.ts";
import styles from "./Badge.module.css";

export type BadgeVariant = "solid" | "outlined" | "muted" | "alert";

export interface BadgeProps {
  variant?: BadgeVariant | undefined;
  status?: string | undefined;
  icon?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
}

function resolveVariant(status?: string, fallbackVariant: BadgeVariant = "muted"): BadgeVariant {
  if (!status) return fallbackVariant;
  const s = status.toLowerCase();
  if (s === "active" || s === "paid") return "solid";
  if (s === "confirmed" || s === "quotation") return "outlined";
  if (s === "draft" || s === "closed" || s === "cancelled") return "muted";
  if (s === "paused" || s === "overdue") return "alert";
  return fallbackVariant;
}

export function Badge({
  variant,
  status,
  icon,
  children,
  className,
}: BadgeProps): ReactElement {
  const resolved = variant ?? resolveVariant(status);
  const showDefaultAlertIcon = resolved === "alert" && !icon;

  return (
    <span className={cx(styles.badge, styles[resolved], className)}>
      {showDefaultAlertIcon && <LuCircleAlert size={10} />}
      {icon}
      {children}
    </span>
  );
}
