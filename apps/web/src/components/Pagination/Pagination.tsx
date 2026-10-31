import type { ReactElement } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import styles from "./Pagination.module.css";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationProps): ReactElement {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className={styles.container}>
      <div className={styles.counter}>
        Showing {startItem}-{endItem} of {total}
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <LuChevronLeft size={14} />
        </button>
        <span className={styles.pageIndicator}>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className={styles.button}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <LuChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

