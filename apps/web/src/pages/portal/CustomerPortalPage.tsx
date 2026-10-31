import { useState, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SubscriptionStatus,
  InvoiceStatus,
  type InvoiceSummary,
  type SubscriptionStatusType,
} from "@brightloop/shared";
import { subscriptionsApi } from "../../features/subscriptions/subscriptionsApi.ts";
import { invoicesApi } from "../../features/invoices/invoicesApi.ts";
import { RecordPaymentModal } from "../../features/invoices/RecordPaymentModal.tsx";
import {
  Button,
  Badge,
  StatusStepper,
  MoneyDisplay,
  DataTable,
  type DataTableColumn,
  PageSkeleton,
} from "../../components/index.ts";
import styles from "./CustomerPortalPage.module.css";

export function CustomerPortalPage(): ReactElement {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"subscriptions" | "invoices">("subscriptions");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummary | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subsQuery = useQuery({
    queryKey: ["subscriptions", "customer-portal"],
    queryFn: () => subscriptionsApi.list({ pageSize: 50 }),
  });

  const invoicesQuery = useQuery({
    queryKey: ["invoices", "customer-portal"],
    queryFn: () => invoicesApi.list({ pageSize: 50 }),
  });

  const subTransitionMutation = useMutation({
    mutationFn: ({ subId, targetStatus }: { subId: string; targetStatus: SubscriptionStatusType }) =>
      subscriptionsApi.transition(subId, { status: targetStatus }),
    onSuccess: () => {
      setErrorMessage(null);
      void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Action not allowed by subscription policy");
    },
  });

  if (subsQuery.isLoading || invoicesQuery.isLoading) {
    return <PageSkeleton />;
  }

  const invoiceCols: DataTableColumn<InvoiceSummary>[] = [
    {
      key: "id",
      header: "Invoice #",
      render: (inv) => <span className="tabular-nums" style={{ fontWeight: "bold" }}>{inv.id.slice(0, 8)}</span>,
    },
    {
      key: "period",
      header: "Billing Period",
      render: (inv) => <span className="tabular-nums">{inv.periodStart} - {inv.periodEnd}</span>,
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
      key: "status",
      header: "Status",
      render: (inv) => <Badge status={inv.status}>{inv.status}</Badge>,
    },
    {
      key: "action",
      header: "Action",
      render: (inv) => {
        const balance = inv.totalPaise - inv.amountPaidPaise;
        if (inv.status === InvoiceStatus.Confirmed && balance > 0) {
          return (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setSelectedInvoice(inv);
                setIsPayModalOpen(true);
              }}
            >
              Pay Now
            </Button>
          );
        }
        return (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(`/invoices/${inv.id}`, "_blank")}
          >
            Receipt
          </Button>
        );
      },
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Customer Self-Service Portal</h1>
        <p className={styles.subtitle}>
          Review your subscriptions, manage service lifecycle rules, and settle outstanding balances
        </p>
      </div>

      {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}

      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "subscriptions" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("subscriptions")}
        >
          My Subscriptions ({subsQuery.data?.total ?? 0})
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "invoices" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("invoices")}
        >
          My Invoices & Payments ({invoicesQuery.data?.total ?? 0})
        </button>
      </div>

      {/* Subscriptions Tab */}
      {activeTab === "subscriptions" && (
        <div className={styles.cardsList}>
          {subsQuery.data?.items.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)" }}>
              You do not have any active subscriptions.
            </p>
          ) : (
            subsQuery.data?.items.map((sub) => (
              <div key={sub.id} className={styles.subCard}>
                <div className={styles.subHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "bold" }}>
                      Subscription {sub.subNumber}
                    </h2>
                    <Badge status={sub.status}>{sub.status}</Badge>
                  </div>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                    Plan: <strong>{sub.planName}</strong>
                  </span>
                </div>

                <StatusStepper type="subscription" currentStatus={sub.status} />

                <div className={styles.subMeta}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Start Date</span>
                    <span className="tabular-nums">{sub.startDate}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Next Billing Date</span>
                    <span className="tabular-nums">{sub.nextBillingDate ?? "N/A"}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>End Date</span>
                    <span className="tabular-nums">{sub.endDate ?? "Continuous"}</span>
                  </div>
                </div>

                {/* Self-Service Lifecycle Controls */}
                <div className={styles.lifecycleActions}>
                  {sub.status === SubscriptionStatus.Active && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        isLoading={subTransitionMutation.isPending}
                        onClick={() =>
                          subTransitionMutation.mutate({
                            subId: sub.id,
                            targetStatus: SubscriptionStatus.Paused,
                          })
                        }
                      >
                        Pause Subscription
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={subTransitionMutation.isPending}
                        onClick={() =>
                          subTransitionMutation.mutate({
                            subId: sub.id,
                            targetStatus: SubscriptionStatus.Closed,
                          })
                        }
                      >
                        Cancel Early
                      </Button>
                    </>
                  )}

                  {sub.status === SubscriptionStatus.Paused && (
                    <Button
                      size="sm"
                      variant="primary"
                      isLoading={subTransitionMutation.isPending}
                      onClick={() =>
                        subTransitionMutation.mutate({
                          subId: sub.id,
                          targetStatus: SubscriptionStatus.Active,
                        })
                      }
                    >
                      Resume Subscription
                    </Button>
                  )}

                  {sub.status === SubscriptionStatus.Closed && (
                    <Button
                      size="sm"
                      variant="primary"
                      isLoading={subTransitionMutation.isPending}
                      onClick={() =>
                        subTransitionMutation.mutate({
                          subId: sub.id,
                          targetStatus: SubscriptionStatus.Active,
                        })
                      }
                    >
                      Renew Subscription
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
        <DataTable
          columns={invoiceCols}
          data={invoicesQuery.data?.items}
          emptyTitle="No invoices found"
          emptyDescription="You have no generated invoices."
          getRowKey={(inv) => inv.id}
        />
      )}

      {selectedInvoice && (
        <RecordPaymentModal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          invoiceId={selectedInvoice.id}
          totalPaise={selectedInvoice.totalPaise}
          amountPaidPaise={selectedInvoice.amountPaidPaise}
        />
      )}
    </div>
  );
}

export default CustomerPortalPage;
