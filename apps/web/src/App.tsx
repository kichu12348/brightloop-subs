import type { ReactElement } from "react";
import styles from "./App.module.css";

export function App(): ReactElement {
  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Brightloop Subscriptions</h1>
        <p className={styles.subtitle}>Subscription management platform</p>
      </div>
    </main>
  );
}
