import { useState, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Role, type BillingRunResult, type InvoiceSummary } from "@brightloop/shared";
import { dashboardApi } from "../../features/dashboard/dashboardApi.ts";
import { billingApi } from "../../features/billing/billingApi.ts";
import { useAuthStore } from "../../lib/useAuthStore.ts";
import {
  Button,
  Input,
  Modal,
  Badge,
  MoneyDisplay,
  DataTable,
  type DataTableColumn,
  PageSkeleton,
} from "../../components/index.ts";
import styles from "./DashboardPage.module.css";

export function DashboardPage(): ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === Role.Admin;

  const todayIso = new Date().toISOString().slice(0, 10);
  const [targetDate, setTargetDate] = useState(todayIso);
  const [runResult, setRunResult] = useState<BillingRunResult | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.getSummary(),
    refetchInterval: 30000,
  });

  const runBillingMutation = useMutation({
    mutationFn: (date: string) => billingApi.runBilling({ targetDate: date }),
    onSuccess: (res) => {
      setRunResult(res);
      setIsResultModalOpen(true);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !summary) {
    return (
      <div className={styles.page}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Finance Dashboard</h1>
          <p className={styles.subtitle}>Error loading dashboard metrics</p>
        </div>
      </div>
    );
  }

  // Calculate status breakdown proportions
  const statusMap = summary.totalSubscriptionsByStatus;
  const draftCount = statusMap["draft"] ?? 0;
  const quotationCount = statusMap["quotation"] ?? 0;
  const confirmedCount = statusMap["confirmed"] ?? 0;
  const activeCount = statusMap["active"] ?? 0;
  const pausedCount = statusMap["paused"] ?? 0;
  const closedCount = statusMap["closed"] ?? 0;
  const totalSubs =
    draftCount + quotationCount + confirmedCount + activeCount + pausedCount + closedCount || 1;

  const overdueColumns: DataTableColumn<InvoiceSummary>[] = [
    {
      key: "id",
      header: "Invoice #",
      render: (inv) => <span className="tabular-nums">{inv.id.slice(0, 8)}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (inv) => <span>{inv.customerName}</span>,
    },
    {
      key: "dueDate",
      header: "Due Date",
      render: (inv) => <span className="tabular-nums">{inv.dueDate}</span>,
    },
    {
      key: "total",
      header: "Total",
      render: (inv) => <MoneyDisplay paise={inv.totalPaise} isBold />,
    },
    {
      key: "balance",
      header: "Outstanding",
      render: (inv) => (
        <MoneyDisplay paise={inv.totalPaise - inv.amountPaidPaise} isBold />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: () => <Badge status="overdue">Overdue</Badge>,
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Finance & Operations Dashboard</h1>
          <p className={styles.subtitle}>
            Real-time ledger, subscription lifecycles, and billing automation
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Active Subscriptions</span>
          <div className={styles.kpiValue}>
            {summary.activeSubscriptionsCount.toLocaleString()}
          </div>
          <span className={styles.kpiSub}>Generating recurring revenue</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Revenue Collected</span>
          <div className={styles.kpiValue}>
            <MoneyDisplay paise={summary.totalRevenueCollectedPaise} />
          </div>
          <span className={styles.kpiSub}>Settled invoices to date</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Outstanding Balance</span>
          <div className={styles.kpiValue}>
            <MoneyDisplay paise={summary.totalOutstandingPaise} />
          </div>
          <span className={styles.kpiSub}>Pending accounts receivable</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Overdue Invoices</span>
          <div className={styles.kpiValue}>
            <MoneyDisplay paise={summary.overdueAmountPaise} />
          </div>
          <span className={styles.kpiSub}>
            {summary.overdueInvoicesCount} invoice(s) past due date
          </span>
        </div>
      </div>

      {/* Subscription Breakdown Bar */}
      <div className={styles.breakdownCard}>
        <div className={styles.breakdownHeader}>
          <span className={styles.breakdownTitle}>
            Subscription Status Distribution
          </span>
          <span className="tabular-nums" style={{ fontSize: "var(--text-xs)" }}>
            Total: {totalSubs.toLocaleString()}
          </span>
        </div>

        <div className={styles.barContainer}>
          <div
            className={`${styles.barSegment} ${styles.segmentDraft}`}
            style={{ width: `${(draftCount / totalSubs) * 100}%` }}
            title={`Draft: ${draftCount}`}
          />
          <div
            className={`${styles.barSegment} ${styles.segmentQuotation}`}
            style={{ width: `${(quotationCount / totalSubs) * 100}%` }}
            title={`Quotation: ${quotationCount}`}
          />
          <div
            className={`${styles.barSegment} ${styles.segmentConfirmed}`}
            style={{ width: `${(confirmedCount / totalSubs) * 100}%` }}
            title={`Confirmed: ${confirmedCount}`}
          />
          <div
            className={`${styles.barSegment} ${styles.segmentActive}`}
            style={{ width: `${(activeCount / totalSubs) * 100}%` }}
            title={`Active: ${activeCount}`}
          />
          <div
            className={`${styles.barSegment} ${styles.segmentPaused}`}
            style={{ width: `${(pausedCount / totalSubs) * 100}%` }}
            title={`Paused: ${pausedCount}`}
          />
          <div
            className={`${styles.barSegment} ${styles.segmentClosed}`}
            style={{ width: `${(closedCount / totalSubs) * 100}%` }}
            title={`Closed: ${closedCount}`}
          />
        </div>

        <div className={styles.legendGrid}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendColor} ${styles.segmentDraft}`} />
            <span>Draft</span>
            <span className={styles.legendCount}>{draftCount}</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendColor} ${styles.segmentQuotation}`} />
            <span>Quotation</span>
            <span className={styles.legendCount}>{quotationCount}</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendColor} ${styles.segmentConfirmed}`} />
            <span>Confirmed</span>
            <span className={styles.legendCount}>{confirmedCount}</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendColor} ${styles.segmentActive}`} />
            <span>Active</span>
            <span className={styles.legendCount}>{activeCount}</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendColor} ${styles.segmentPaused}`} />
            <span>Paused</span>
            <span className={styles.legendCount}>{pausedCount}</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendColor} ${styles.segmentClosed}`} />
            <span>Closed</span>
            <span className={styles.legendCount}>{closedCount}</span>
          </div>
        </div>
      </div>

      {/* Admin Billing Engine Control Panel */}
      {isAdmin && (
        <div className={styles.billingPanel}>
          <h2 className={styles.panelTitle}>Automated Billing Engine Control</h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            Execute the idempotent recurring billing runner up to target date. Dispatches
            invoices, applies discounts and taxes, increments discount usage, and advances
            periods.
          </p>
          <div className={styles.panelContent}>
            <div style={{ width: "14rem" }}>
              <Input
                label="Target Billing Date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <Button
              variant="primary"
              isLoading={runBillingMutation.isPending}
              onClick={() => runBillingMutation.mutate(targetDate)}
            >
              Run Billing Cycle
            </Button>
          </div>
        </div>
      )}

      {/* Recent Overdue Invoices */}
      <div className={styles.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className={styles.sectionTitle}>Overdue Invoices Requiring Attention</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigate("/invoices?overdueOnly=true")}
          >
            View All Invoices
          </Button>
        </div>

        <DataTable
          columns={overdueColumns}
          data={summary.recentOverdueInvoices}
          emptyTitle="Zero overdue invoices"
          emptyDescription="All current accounts receivables are within their valid payment terms."
          onRowClick={(inv) => void navigate(`/invoices/${inv.id}`)}
          getRowKey={(inv) => inv.id}
        />
      </div>

      {/* Billing Run Summary Modal */}
      {runResult && (
        <Modal
          isOpen={isResultModalOpen}
          onClose={() => setIsResultModalOpen(false)}
          title="Billing Execution Summary"
          footer={
            <Button variant="primary" onClick={() => setIsResultModalOpen(false)}>
              Done
            </Button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
              The billing runner completed for target date:{" "}
              <strong className="tabular-nums">{runResult.targetDate}</strong>
            </p>

            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryItemLabel}>Subscriptions Scanned</span>
                <span className={styles.summaryItemVal}>{runResult.processedCount}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryItemLabel}>Invoices Created</span>
                <span className={styles.summaryItemVal}>{runResult.invoicesCreated}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryItemLabel}>Auto-Closed</span>
                <span className={styles.summaryItemVal}>{runResult.subscriptionsClosed}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryItemLabel}>Skipped Idempotent</span>
                <span className={styles.summaryItemVal}>{runResult.skippedDuplicates}</span>
              </div>
            </div>

            {runResult.failures.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: "bold" }}>
                  Failures ({runResult.failures.length})
                </span>
                {runResult.failures.map((f, i) => (
                  <div key={i} className={styles.summaryItem}>
                    <span style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)" }}>
                      Sub: {f.subscriptionId}
                    </span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                      {f.reason}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default DashboardPage;
