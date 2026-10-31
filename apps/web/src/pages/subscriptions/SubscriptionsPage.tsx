import { useState, useEffect, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  type SubscriptionSummary,
  type SubscriptionQueryStatus,
} from "@brightloop/shared";
import { subscriptionsApi } from "../../features/subscriptions/subscriptionsApi.ts";
import { CreateSubscriptionModal } from "../../features/subscriptions/CreateSubscriptionModal.tsx";
import {
  Button,
  Input,
  Select,
  Badge,
  DataTable,
  Pagination,
  type DataTableColumn,
  PageSkeleton,
} from "../../components/index.ts";
import styles from "./SubscriptionsPage.module.css";

export function SubscriptionsPage(): ReactElement {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return (): void => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["subscriptions", { page, pageSize, search: debouncedSearch, status: statusFilter }],
    queryFn: () =>
      subscriptionsApi.list({
        page,
        pageSize,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusFilter ? { status: statusFilter as SubscriptionQueryStatus } : {}),
      }),
  });

  const columns: DataTableColumn<SubscriptionSummary>[] = [
    {
      key: "subNumber",
      header: "Sub #",
      render: (sub) => (
        <span className="tabular-nums" style={{ fontWeight: "bold" }}>
          {sub.subNumber}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (sub) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span>{sub.customerName}</span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            {sub.customerEmail}
          </span>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      render: (sub) => <span>{sub.planName}</span>,
    },
    {
      key: "startDate",
      header: "Start Date",
      render: (sub) => <span className="tabular-nums">{sub.startDate}</span>,
    },
    {
      key: "nextBillingDate",
      header: "Next Billing",
      render: (sub) => (
        <span className="tabular-nums">
          {sub.nextBillingDate ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (sub) => <Badge status={sub.status}>{sub.status}</Badge>,
    },
  ];

  if (isLoading && !data) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Subscriptions Workspace</h1>
          <p className={styles.subtitle}>
            Manage recurring customer agreements, lifecycle progression, and quotation templates
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          + New Subscription
        </Button>
      </div>

      {/* Filters Bar */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Input
            placeholder="Search by customer name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

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
            <option value="quotation">Quotation</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </Select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className={styles.tableContainer}>
        <DataTable
          columns={columns}
          data={data?.items}
          isLoading={isLoading}
          error={error instanceof Error ? error.message : null}
          emptyTitle="No subscriptions found"
          emptyDescription="Try adjusting your search criteria or create a new subscription."
          onRowClick={(sub) => void navigate(`/subscriptions/${sub.id}`)}
          getRowKey={(sub) => sub.id}
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

      <CreateSubscriptionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(id) => void navigate(`/subscriptions/${id}`)}
      />
    </div>
  );
}

export default SubscriptionsPage;
