import type { ReactElement } from "react";
import styles from "./PageSkeleton.module.css";

export function PageSkeleton(): ReactElement {
  return (
    <div className={styles.container}>
      <div className={styles.header} />
      <div className={styles.grid}>
        <div className={styles.card} />
        <div className={styles.card} />
        <div className={styles.card} />
        <div className={styles.card} />
      </div>
      <div className={styles.table} />
    </div>
  );
}

