import type { ReactElement, ReactNode } from "react";
import { LuInbox, LuTriangleAlert } from "react-icons/lu";
import { cx } from "../../lib/cx.ts";
import styles from "./DataTable.module.css";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  width?: string | undefined;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data?: T[] | undefined;
  isLoading?: boolean | undefined;
  error?: string | null | undefined;
  emptyTitle?: string | undefined;
  emptyDescription?: string | undefined;
  onRowClick?: ((item: T) => void) | undefined;
  getRowKey?: ((item: T) => string) | undefined;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  error = null,
  emptyTitle = "No records found",
  emptyDescription = "There are no entries matching your current filters.",
  onRowClick,
  getRowKey,
}: DataTableProps<T>): ReactElement {
  if (error) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.stateContainer}>
          <LuTriangleAlert size={32} />
          <h3 className={styles.stateTitle}>Failed to load records</h3>
          <p className={styles.stateDescription}>{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={styles.headerCell} style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, rIdx) => (
              <tr key={rIdx} className={styles.skeletonRow}>
                {columns.map((col) => (
                  <td key={col.key} className={styles.skeletonCell}>
                    <div className={styles.skeletonBar} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.stateContainer}>
          <LuInbox size={32} />
          <h3 className={styles.stateTitle}>{emptyTitle}</h3>
          <p className={styles.stateDescription}>{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Desktop Table View */}
      <div className={cx(styles.tableScroll, styles.desktopTable)}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={styles.headerCell} style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => {
              const key = getRowKey ? getRowKey(item) : String(idx);
              const isClickable = Boolean(onRowClick);

              return (
                <tr
                  key={key}
                  className={cx(styles.row, isClickable ? styles.clickableRow : undefined)}
                  onClick={onRowClick ? (): void => onRowClick(item) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={styles.cell}>
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Stack (< 40rem) */}
      <div className={styles.mobileCards}>
        {data.map((item, idx) => {
          const key = getRowKey ? getRowKey(item) : String(idx);
          return (
            <div
              key={key}
              className={styles.mobileCard}
              onClick={onRowClick ? (): void => onRowClick(item) : undefined}
            >
              {columns.map((col) => (
                <div key={col.key} className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>{col.header}</span>
                  <div>{col.render(item)}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
