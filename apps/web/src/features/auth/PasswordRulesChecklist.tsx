import type { ReactElement } from "react";
import { LuCheck, LuCircle } from "react-icons/lu";
import { cx } from "../../lib/cx.ts";
import styles from "./PasswordRulesChecklist.module.css";

export interface PasswordRulesChecklistProps {
  password: string;
}

export function validatePasswordCriteria(password: string): {
  hasLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasSpecial: boolean;
  isValid: boolean;
} {
  const hasLength = password.length >= 9;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isValid = hasLength && hasUpper && hasLower && hasSpecial;

  return { hasLength, hasUpper, hasLower, hasSpecial, isValid };
}

export function PasswordRulesChecklist({
  password,
}: PasswordRulesChecklistProps): ReactElement {
  const { hasLength, hasUpper, hasLower, hasSpecial } = validatePasswordCriteria(password);

  const rules = [
    { label: "More than 8 characters (at least 9)", valid: hasLength },
    { label: "At least one uppercase letter (A-Z)", valid: hasUpper },
    { label: "At least one lowercase letter (a-z)", valid: hasLower },
    { label: "At least one special character (!@#$%...)", valid: hasSpecial },
  ];

  return (
    <ul className={styles.list}>
      {rules.map((rule) => (
        <li
          key={rule.label}
          className={cx(styles.item, rule.valid ? styles.itemValid : undefined)}
        >
          <span className={styles.indicator}>
            {rule.valid ? <LuCheck size={12} /> : <LuCircle size={10} />}
          </span>
          <span>{rule.label}</span>
        </li>
      ))}
    </ul>
  );
}

