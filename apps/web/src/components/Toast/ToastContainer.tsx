import type { ReactElement } from "react";
import { LuInfo, LuCircleCheck, LuTriangleAlert, LuX } from "react-icons/lu";
import { useUiStore, type ToastItem } from "../../lib/useUiStore.ts";
import styles from "./Toast.module.css";

function getToastIcon(kind?: ToastItem["kind"]): ReactElement {
  if (kind === "success") return <LuCircleCheck size={16} />;
  if (kind === "warning" || kind === "error") return <LuTriangleAlert size={16} />;
  return <LuInfo size={16} />;
}

export function ToastContainer(): ReactElement {
  const toasts = useUiStore((s) => s.toasts);
  const dismissToast = useUiStore((s) => s.dismissToast);

  if (toasts.length === 0) {
    return <div className={styles.container} />;
  }

  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={styles.toast} role="alert">
          {getToastIcon(t.kind)}
          <div className={styles.content}>
            <span className={styles.title}>{t.title}</span>
            {t.message && <p className={styles.message}>{t.message}</p>}
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss toast"
          >
            <LuX size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
