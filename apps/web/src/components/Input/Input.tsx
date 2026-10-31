import type { InputHTMLAttributes, ReactElement, ReactNode } from "react";
import { cx } from "../../lib/cx.ts";
import styles from "./Input.module.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  icon?: ReactNode | undefined;
}

export function Input({
  label,
  error,
  helperText,
  icon,
  className,
  id,
  ...rest
}: InputProps): ReactElement {
  const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper}>
        <input
          id={inputId}
          className={cx(
            styles.input,
            error ? styles.hasError : undefined,
            className,
          )}
          {...rest}
        />
        {icon}
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
      {!error && helperText && <span className={styles.helperText}>{helperText}</span>}
    </div>
  );
}
