import type { ReactElement } from "react";
import { LuCheck } from "react-icons/lu";
import { cx } from "../../lib/cx.ts";
import styles from "./StatusStepper.module.css";

export interface StatusStepperProps {
  type: "subscription" | "invoice";
  currentStatus: string;
}

const SUBSCRIPTION_STEPS = ["draft", "quotation", "confirmed", "active", "closed"];
const INVOICE_STEPS = ["draft", "confirmed", "paid"];

export function StatusStepper({
  type,
  currentStatus,
}: StatusStepperProps): ReactElement {
  const steps = type === "subscription" ? SUBSCRIPTION_STEPS : INVOICE_STEPS;
  const currentNormalized = currentStatus.toLowerCase();
  const isSpecialState =
    currentNormalized === "paused" || currentNormalized === "cancelled";

  // Find step index
  let currentIndex = steps.indexOf(currentNormalized);
  if (currentNormalized === "paused") {
    // Paused is a state of Active
    currentIndex = steps.indexOf("active");
  }

  return (
    <div className={styles.container}>
      <ol className={styles.stepList}>
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isAlert = isCurrent && isSpecialState;
          const isLast = idx === steps.length - 1;

          const displayLabel = isAlert
            ? `${step} (${currentNormalized})`
            : step;

          return (
            <li
              key={step}
              className={cx(
                styles.stepItem,
                isCompleted ? styles.isCompleted : undefined,
                isCurrent ? styles.isCurrent : undefined,
                isAlert ? styles.isAlert : undefined,
              )}
            >
              <div className={styles.badge}>
                {isCompleted ? <LuCheck size={12} /> : idx + 1}
              </div>
              <span className={styles.label}>{displayLabel}</span>
              {!isLast && <div className={styles.line} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

