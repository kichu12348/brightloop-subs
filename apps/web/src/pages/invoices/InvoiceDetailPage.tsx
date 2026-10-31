import { useState, type ReactElement } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuPrinter, LuCreditCard } from "react-icons/lu";
import { InvoiceStatus, type PaymentDetail } from "@brightloop/shared";
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
import styles from "./InvoicesPage.module.css";

export function InvoiceDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const invoiceId = id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: inv, isLoading, error } = useQuery({
    queryKey: ["invoices", invoiceId],
    queryFn: () => invoicesApi.getById(invoiceId),
    enabled: Boolean(invoiceId),
  });

  const transitionMutation = useMutation({
    mutationFn: (targetStatus: "confirmed" | "cancelled") =>
      invoicesApi.transition(invoiceId, { status: targetStatus }),
    onSuccess: () => {
      setErrorMessage(null);
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to update invoice status");
    },
  });

  if (isLoading || !inv) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>Invoice Not Found</h1>
          <Button onClick={() => void navigate("/invoices")}>Back to Invoices</Button>
        </div>
      </div>
    );
  }

  const outstandingPaise = Math.max(0, inv.totalPaise - inv.amountPaidPaise);
  const isOverdue =
    inv.status === InvoiceStatus.Confirmed &&
    inv.dueDate < new Date().toISOString().slice(0, 10);

  const lineColumns: DataTableColumn<(typeof inv.lines)[0]>[] = [
    {
      key: "desc",
      header: "Description / Product",
      render: (line) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: "bold" }}>{line.productName ?? line.description}</span>
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
      key: "taxRate",
      header: "Tax Rate",
      render: (line) => (
        <span className="tabular-nums">{(line.taxRateBasisPoints / 100).toFixed(1)}%</span>
      ),
    },
    {
      key: "lineTotal",
      header: "Amount",
      render: (line) => <MoneyDisplay paise={line.lineTotalPaise} isBold />,
    },
  ];

  const paymentColumns: DataTableColumn<PaymentDetail>[] = [
    {
      key: "date",
      header: "Date",
      render: (p) => <span className="tabular-nums">{p.paymentDate ?? "—"}</span>,
    },
    {
      key: "method",
      header: "Method",
      render: (p) => <span style={{ textTransform: "capitalize" }}>{p.method}</span>,
    },
    {
      key: "ref",
      header: "Reference",
      render: (p) => (
        <span className="tabular-nums" style={{ fontSize: "var(--text-xs)" }}>
          {p.reference ?? "N/A"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount Paid",
      render: (p) => <MoneyDisplay paise={p.amountPaise} isBold />,
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <h1 className={styles.title}>Invoice {inv.id.slice(0, 8)}</h1>
            <Badge status={isOverdue ? "overdue" : inv.status}>
              {isOverdue ? "OVERDUE" : inv.status}
            </Badge>
          </div>
          <p className={styles.subtitle}>ID: {inv.id}</p>
        </div>

        <div className={styles.noPrint} style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button
            variant="outline"
            icon={<LuPrinter size={16} />}
            onClick={() => window.print()}
          >
            Print / PDF
          </Button>

          {inv.status === InvoiceStatus.Confirmed && outstandingPaise > 0 && (
            <Button
              variant="primary"
              icon={<LuCreditCard size={16} />}
              onClick={() => setIsPaymentModalOpen(true)}
            >
              Record Payment
            </Button>
          )}

          <Button variant="secondary" onClick={() => void navigate("/invoices")}>
            Back to Invoices
          </Button>
        </div>
      </div>

      {/* Status Stepper */}
      <div className={`${styles.card} ${styles.noPrint}`}>
        <StatusStepper type="invoice" currentStatus={inv.status} />
      </div>

      {errorMessage && (
        <div
          style={{
            padding: "var(--space-3)",
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px dashed var(--color-border-strong)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Main Grid */}
      <div className={styles.detailGrid}>
        {/* Left Column: Lines, Totals, Payments */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Invoice Line Items</h2>
            <DataTable
              columns={lineColumns}
              data={inv.lines}
              getRowKey={(l) => l.id}
            />

            {/* Financial Summary */}
            <div className={styles.totalsTable}>
              <div className={styles.totalRow}>
                <span className={styles.infoLabel}>Subtotal</span>
                <MoneyDisplay paise={inv.subtotalPaise} />
              </div>
              {inv.discountPaise > 0 && (
                <div className={styles.totalRow}>
                  <span className={styles.infoLabel}>Discount Applied</span>
                  <span>-<MoneyDisplay paise={inv.discountPaise} /></span>
                </div>
              )}
              <div className={styles.totalRow}>
                <span className={styles.infoLabel}>Tax Total</span>
                <MoneyDisplay paise={inv.taxPaise} />
              </div>
              <div className={styles.grandTotalRow}>
                <span>Invoice Total</span>
                <MoneyDisplay paise={inv.totalPaise} isBold />
              </div>
              <div className={styles.totalRow}>
                <span className={styles.infoLabel}>Amount Settled</span>
                <MoneyDisplay paise={inv.amountPaidPaise} />
              </div>
              <div className={styles.totalRow} style={{ fontWeight: "bold" }}>
                <span>Remaining Balance</span>
                <MoneyDisplay paise={outstandingPaise} isBold />
              </div>
            </div>
          </div>

          {/* Payment Allocations */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Payment Transactions</h2>
            <DataTable
              columns={paymentColumns}
              data={inv.payments}
              emptyTitle="No payments recorded"
              emptyDescription="No payments have been posted towards this invoice yet."
              getRowKey={(p) => p.id}
            />
          </div>
        </div>

        {/* Right Column: Customer Info & Status Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {/* Actions Card (Draft -> Confirm or Cancel) */}
          <div className={`${styles.card} ${styles.noPrint}`}>
            <h2 className={styles.cardTitle}>Invoice Actions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {inv.status === InvoiceStatus.Draft && (
                <>
                  <Button
                    variant="primary"
                    isLoading={transitionMutation.isPending}
                    onClick={() => transitionMutation.mutate(InvoiceStatus.Confirmed)}
                  >
                    Confirm Invoice
                  </Button>
                  <Button
                    variant="outline"
                    isLoading={transitionMutation.isPending}
                    onClick={() => transitionMutation.mutate(InvoiceStatus.Cancelled)}
                  >
                    Cancel Invoice
                  </Button>
                </>
              )}

              {inv.status === InvoiceStatus.Confirmed && (
                <>
                  <Button
                    variant="primary"
                    icon={<LuCreditCard size={16} />}
                    onClick={() => setIsPaymentModalOpen(true)}
                  >
                    Record Payment
                  </Button>
                  {inv.amountPaidPaise === 0 && (
                    <Button
                      variant="outline"
                      isLoading={transitionMutation.isPending}
                      onClick={() => transitionMutation.mutate(InvoiceStatus.Cancelled)}
                    >
                      Cancel Invoice
                    </Button>
                  )}
                </>
              )}

              {inv.status === InvoiceStatus.Paid && (
                <div style={{ textAlign: "center", padding: "var(--space-3)" }}>
                  <Badge status="paid">Invoice Fully Paid</Badge>
                </div>
              )}

              {inv.status === InvoiceStatus.Cancelled && (
                <div style={{ textAlign: "center", padding: "var(--space-3)" }}>
                  <Badge status="cancelled">Invoice Cancelled</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Period and Subscription */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Billing Schedule</h2>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Period Coverage</span>
                <span className="tabular-nums">
                  {inv.periodStart} to {inv.periodEnd}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Due Date</span>
                <span className="tabular-nums" style={{ fontWeight: isOverdue ? "bold" : "normal" }}>
                  {inv.dueDate} {isOverdue && "(Overdue)"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Subscription</span>
                <Link
                  to={`/subscriptions/${inv.subscriptionId}`}
                  style={{ textDecoration: "underline", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}
                >
                  View Subscription
                </Link>
              </div>
            </div>
          </div>

          {/* Customer Profile */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Bill To</h2>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>{inv.customer.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{inv.customer.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoiceId={inv.id}
        totalPaise={inv.totalPaise}
        amountPaidPaise={inv.amountPaidPaise}
      />
    </div>
  );
}

export default InvoiceDetailPage;
