import type { ReactElement, SelectHTMLAttributes } from "react";
import { cx } from "../../lib/cx.ts";
import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean | undefined;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string | undefined;
  error?: string | undefined;
  options?: SelectOption[] | undefined;
}

export function Select({
  label,
  error,
  options,
  children,
  className,
  id,
  ...rest
}: SelectProps): ReactElement {
  const selectId = id ?? (label ? `select-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.selectWrapper}>
        <select
          id={selectId}
          className={cx(
            styles.select,
            error ? styles.hasError : undefined,
            className,
          )}
          {...rest}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}
