import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { cx } from "../../lib/cx.ts";
import styles from "./Button.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  isLoading?: boolean | undefined;
  icon?: ReactNode | undefined;
  children?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  isLoading = false,
  icon,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps): ReactElement {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={cx(
        styles.base,
        styles[variant],
        styles[size],
        className,
      )}
      {...rest}
    >
      {isLoading ? <span className={styles.spinner} /> : icon}
      {children}
    </button>
  );
}
