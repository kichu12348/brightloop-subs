import { useState, type ReactElement } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SubscriptionStatus,
  type SubscriptionStatusType,
} from "@brightloop/shared";
import { subscriptionsApi } from "../../features/subscriptions/subscriptionsApi.ts";
import {
  Button,
  Badge,
  StatusStepper,
  MoneyDisplay,
  DataTable,
  type DataTableColumn,
  PageSkeleton,
} from "../../components/index.ts";
import styles from "./SubscriptionsPage.module.css";

export function SubscriptionDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const subId = id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [transitionError, setTransitionError] = useState<string | null>(null);

  const { data: sub, isLoading, error } = useQuery({
    queryKey: ["subscriptions", subId],
    queryFn: () => subscriptionsApi.getById(subId),
    enabled: Boolean(subId),
  });

  const transitionMutation = useMutation({
    mutationFn: (targetStatus: SubscriptionStatusType) =>
      subscriptionsApi.transition(subId, { status: targetStatus }),
    onSuccess: () => {
      setTransitionError(null);
      void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => {
      setTransitionError(err.message || "State transition rejected by server");
    },
  });

  if (isLoading || !sub) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>Subscription Not Found</h1>
          <Button onClick={() => void navigate("/subscriptions")}>Back to List</Button>
        </div>
      </div>
    );
  }

  // Plan lifecycle permission evaluations
  const plan = sub.plan;
  const canPause = plan.canPause;
  const canCloseEarly = plan.canCloseEarly;
  const canRenew = plan.canRenew;

  const lineColumns: DataTableColumn<(typeof sub.lines)[0]>[] = [
    {
      key: "product",
      header: "Product / Service",
      render: (line) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: "bold" }}>{line.productName ?? line.productId}</span>
          {line.variantName && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
              Variant: {line.variantName}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "qty",
      header: "Quantity",
      render: (line) => <span className="tabular-nums">{line.quantity}</span>,
    },
    {
      key: "unitPrice",
      header: "Unit Price",
      render: (line) => <MoneyDisplay paise={line.unitPricePaise} />,
    },
    {
      key: "total",
      header: "Total",
      render: (line) => (
        <MoneyDisplay paise={line.unitPricePaise * line.quantity} isBold />
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <h1 className={styles.title}>Subscription {sub.subNumber}</h1>
            <Badge status={sub.status}>{sub.status}</Badge>
          </div>
          <p className={styles.subtitle}>ID: {sub.id}</p>
        </div>
        <Button variant="outline" onClick={() => void navigate("/subscriptions")}>
          ← Back to Subscriptions
        </Button>
      </div>

      {/* State Machine Visualizer */}
      <div className={styles.card}>
        <StatusStepper type="subscription" currentStatus={sub.status} />
      </div>

      {transitionError && (
        <div
          style={{
            padding: "var(--space-3)",
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px dashed var(--color-border-strong)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
          }}
        >
          <strong>State Transition Error:</strong> {transitionError}
        </div>
      )}

      {/* Main Details Grid */}
      <div className={styles.detailGrid}>
        {/* Left Column: Lines and Lifecycle Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Line Items</h2>
            <DataTable
              columns={lineColumns}
              data={sub.lines}
              emptyTitle="No product lines"
              emptyDescription="This subscription currently has no configured items."
              getRowKey={(l) => l.id}
            />
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Billing & Recurrence Parameters</h2>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Plan Name</span>
                <span className={styles.infoValue}>{plan.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Base Plan Price</span>
                <span className={styles.infoValue}>
                  <MoneyDisplay paise={plan.pricePaise} isBold /> / {plan.billingPeriod}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Start Date</span>
                <span className="tabular-nums">{sub.startDate}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Next Scheduled Billing Date</span>
                <span className="tabular-nums">{sub.nextBillingDate ?? "N/A"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>End Date</span>
                <span className="tabular-nums">{sub.endDate ?? "Open-ended (No expiry)"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Payment Terms</span>
                <span className="tabular-nums">{sub.paymentTermsDays} Days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer Info & Lifecycle Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {/* Lifecycle Action Panel */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Lifecycle Actions</h2>
            <div className={styles.actionsCard}>
              {sub.status === SubscriptionStatus.Draft && (
                <Button
                  variant="primary"
                  isLoading={transitionMutation.isPending}
                  onClick={() => transitionMutation.mutate(SubscriptionStatus.Quotation)}
                >
                  Generate Quotation
                </Button>
              )}

              {sub.status === SubscriptionStatus.Quotation && (
                <>
                  <Button
                    variant="primary"
                    isLoading={transitionMutation.isPending}
                    onClick={() => transitionMutation.mutate(SubscriptionStatus.Confirmed)}
                  >
                    Confirm Quotation
                  </Button>
                  <Button
                    variant="outline"
                    isLoading={transitionMutation.isPending}
                    onClick={() => transitionMutation.mutate(SubscriptionStatus.Closed)}
                  >
                    Close
                  </Button>
                </>
              )}

              {sub.status === SubscriptionStatus.Confirmed && (
                <>
                  <Button
                    variant="primary"
                    isLoading={transitionMutation.isPending}
                    onClick={() => transitionMutation.mutate(SubscriptionStatus.Active)}
                  >
                    Activate Subscription
                  </Button>
                  <Button
                    variant="outline"
                    isLoading={transitionMutation.isPending}
                    onClick={() => transitionMutation.mutate(SubscriptionStatus.Closed)}
                  >
                    Close
                  </Button>
                </>
              )}

              {sub.status === SubscriptionStatus.Active && (
                <>
                  <Button
                    variant="secondary"
                    disabled={!canPause}
                    title={!canPause ? "Plan rules disallow pausing" : "Pause subscription"}
                    isLoading={transitionMutation.isPending}
                    onClick={() => transitionMutation.mutate(SubscriptionStatus.Paused)}
                  >
                    Pause Subscription {!canPause && "(Disabled by Plan)"}
                  </Button>

                  <Button
                    variant="outline"
                    disabled={!canCloseEarly}
                    title={
                      !canCloseEarly
                        ? "Plan rules disallow early closure before end date"
                        : "Close subscription"
                    }
                    isLoading={transitionMutation.isPending}
                    onClick={() => transitionMutation.mutate(SubscriptionStatus.Closed)}
                  >
                    Close Early {!canCloseEarly && "(Disabled by Plan)"}
                  </Button>
                </>
              )}

              {sub.status === SubscriptionStatus.Paused && (
                <>
                  <Button
                    variant="primary"
                    isLoading={transitionMutation.isPending}
                    onClick={() => transitionMutation.mutate(SubscriptionStatus.Active)}
                  >
                    Resume Subscription
                  </Button>
                  <Button
                    variant="outline"
                    isLoading={transitionMutation.isPending}
                    onClick={() => transitionMutation.mutate(SubscriptionStatus.Closed)}
                  >
                    Close Subscription
                  </Button>
                </>
              )}

              {sub.status === SubscriptionStatus.Closed && (
                <Button
                  variant="primary"
                  disabled={!canRenew}
                  title={!canRenew ? "Plan rules disallow renewals" : "Renew subscription"}
                  isLoading={transitionMutation.isPending}
                  onClick={() => transitionMutation.mutate(SubscriptionStatus.Active)}
                >
                  Renew Subscription {!canRenew && "(Disabled by Plan)"}
                </Button>
              )}
            </div>

            <div style={{ marginTop: "var(--space-2)" }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                Plan Lifecycle Rules:
              </span>
              <div className={styles.rulePillList}>
                <span className={`${styles.rulePill} ${plan.canPause ? styles.rulePillEnabled : ""}`}>
                  Pause: {plan.canPause ? "Allowed" : "No"}
                </span>
                <span className={`${styles.rulePill} ${plan.canCloseEarly ? styles.rulePillEnabled : ""}`}>
                  Early Close: {plan.canCloseEarly ? "Allowed" : "No"}
                </span>
                <span className={`${styles.rulePill} ${plan.canRenew ? styles.rulePillEnabled : ""}`}>
                  Renew: {plan.canRenew ? "Allowed" : "No"}
                </span>
                <span className={`${styles.rulePill} ${plan.autoCloseOnEnd ? styles.rulePillEnabled : ""}`}>
                  Auto-Close: {plan.autoCloseOnEnd ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Profile Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Customer Details</h2>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>{sub.customer.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{sub.customer.email}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Customer ID</span>
                <span className="tabular-nums" style={{ fontSize: "var(--text-xs)" }}>
                  {sub.customerId}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionDetailPage;
