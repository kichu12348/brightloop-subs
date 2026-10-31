import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { type InvoiceSummary, type InvoiceQueryStatus } from "@brightloop/shared";
import { invoicesApi } from "../../features/invoices/invoicesApi.ts";
import {
  Select,
  Badge,
  DataTable,
  Pagination,
  MoneyDisplay,
  type DataTableColumn,
  PageSkeleton,
} from "../../components/index.ts";
import styles from "./InvoicesPage.module.css";

export function InvoicesPage(): ReactElement {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialOverdue = searchParams.get("overdueOnly") === "true";
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [overdueOnly, setOverdueOnly] = useState(initialOverdue);

  const { data, isLoading, error } = useQuery({
    queryKey: ["invoices", { page, pageSize, status: statusFilter, overdueOnly }],
    queryFn: () =>
      invoicesApi.list({
        page,
        pageSize,
        ...(statusFilter ? { status: statusFilter as InvoiceQueryStatus } : {}),
        ...(overdueOnly ? { overdueOnly: true } : {}),
      }),
  });

  const columns: DataTableColumn<InvoiceSummary>[] = [
    {
      key: "id",
      header: "Invoice #",
      render: (inv) => (
        <span className="tabular-nums" style={{ fontWeight: "bold" }}>
          {inv.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (inv) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span>{inv.customerName}</span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            {inv.customerEmail}
          </span>
        </div>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (inv) => (
        <span className="tabular-nums" style={{ fontSize: "var(--text-xs)" }}>
          {inv.periodStart} to {inv.periodEnd}
        </span>
      ),
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
      key: "paid",
      header: "Paid",
      render: (inv) => (
        <span className="tabular-nums">
          <MoneyDisplay paise={inv.amountPaidPaise} isSubtle />
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (inv) => <Badge status={inv.status}>{inv.status}</Badge>,
    },
  ];

  if (isLoading && !data) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Invoices & Payments Workspace</h1>
          <p className={styles.subtitle}>
            Accounts receivable ledger, status workflows, and payment allocations
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className={styles.filters}>
        <div className={styles.statusFilter}>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>

        <label className={styles.toggleContainer}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={overdueOnly}
            onChange={(e) => {
              const checked = e.target.checked;
              setOverdueOnly(checked);
              setSearchParams(checked ? { overdueOnly: "true" } : {});
              setPage(1);
            }}
          />
          <span>Overdue Only</span>
        </label>
      </div>

      {/* Invoices Table */}
      <div>
        <DataTable
          columns={columns}
          data={data?.items}
          isLoading={isLoading}
          error={error instanceof Error ? error.message : null}
          emptyTitle="No invoices found"
          emptyDescription="No invoices matching the selected status or filters."
          onRowClick={(inv) => void navigate(`/invoices/${inv.id}`)}
          getRowKey={(inv) => inv.id}
        />

        {data && data.total > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}

export default InvoicesPage;
