import { useEffect, type ReactElement, type ReactNode } from "react";
import { LuX } from "react-icons/lu";
import { cx } from "../../lib/cx.ts";
import styles from "./Modal.module.css";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: "md" | "lg" | undefined;
  children: ReactNode;
  footer?: ReactNode | undefined;
}

export function Modal({
  isOpen,
  onClose,
  title,
  size = "md",
  children,
  footer,
}: ModalProps): ReactElement | null {
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
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={cx(styles.modal, size === "lg" ? styles.lg : undefined)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            <LuX size={16} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
