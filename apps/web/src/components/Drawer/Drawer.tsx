import { useEffect, type ReactElement, type ReactNode } from "react";
import { LuX } from "react-icons/lu";
import { cx } from "../../lib/cx.ts";
import styles from "./Drawer.module.css";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right" | undefined;
  children: ReactNode;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  side = "left",
  children,
}: DrawerProps): ReactElement | null {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return (): void => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={cx(styles.drawer, side === "right" ? styles.right : styles.left)}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close drawer"
          >
            <LuX size={16} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </>
  );
}
