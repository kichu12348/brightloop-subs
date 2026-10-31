import { useState, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Role,
  ProductType,
  BillingPeriod,
  DiscountKind,
  DiscountScope,
  type ProductDetail,
  type Plan,
  type Tax,
  type Discount,
  type QuotationTemplateDetail,
  type UserSummary,
} from "@brightloop/shared";
import { catalogApi } from "../../features/catalog/catalogApi.ts";
import { usersApi } from "../../features/users/usersApi.ts";
import { useAuthStore } from "../../lib/useAuthStore.ts";
import {
  Button,
  Badge,
  DataTable,
  Modal,
  Input,
  Select,
  MoneyDisplay,
  type DataTableColumn,
} from "../../components/index.ts";
import {
  PasswordRulesChecklist,
  validatePasswordCriteria,
} from "../../features/auth/PasswordRulesChecklist.tsx";
import styles from "./CatalogPage.module.css";

type CatalogTab = "products" | "plans" | "templates" | "taxes" | "discounts" | "staff";

export function CatalogPage(): ReactElement {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === Role.Admin;

  const [activeTab, setActiveTab] = useState<CatalogTab>("products");
  const [modalType, setModalType] = useState<CatalogTab | null>(null);

  // Queries
  const productsQuery = useQuery({
    queryKey: ["catalog", "products"],
    queryFn: () => catalogApi.listProducts(),
    enabled: activeTab === "products",
  });

  const plansQuery = useQuery({
    queryKey: ["catalog", "plans"],
    queryFn: () => catalogApi.listPlans(),
    enabled: activeTab === "plans",
  });

  const templatesQuery = useQuery({
    queryKey: ["catalog", "templates"],
    queryFn: () => catalogApi.listTemplates(),
    enabled: activeTab === "templates",
  });

  const taxesQuery = useQuery({
    queryKey: ["catalog", "taxes"],
    queryFn: () => catalogApi.listTaxes(),
    enabled: activeTab === "taxes",
  });

  const discountsQuery = useQuery({
    queryKey: ["catalog", "discounts"],
    queryFn: () => catalogApi.listDiscounts(),
    enabled: activeTab === "discounts",
  });

  const staffQuery = useQuery({
    queryKey: ["users", "staff"],
    queryFn: () => usersApi.list({ role: "staff", pageSize: 100 }),
    enabled: activeTab === "staff",
  });

  // Modal Form States
  const [prodName, setProdName] = useState("");
  const [prodType, setProdType] = useState<ProductType>(ProductType.Service);
  const [prodPrice, setProdPrice] = useState("");
  const [prodVariantAttr, setProdVariantAttr] = useState("");
  const [prodVariantVal, setProdVariantVal] = useState("");
  const [prodVariantExtra, setProdVariantExtra] = useState("");

  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planPeriod, setPlanPeriod] = useState<BillingPeriod>(BillingPeriod.Monthly);
  const [planCanPause, setPlanCanPause] = useState(true);
  const [planCanCloseEarly, setPlanCanCloseEarly] = useState(true);
  const [planCanRenew, setPlanCanRenew] = useState(true);
  const [planAutoClose, setPlanAutoClose] = useState(false);

  const [taxName, setTaxName] = useState("");
  const [taxRateBps, setTaxRateBps] = useState("1800");

  const [discName, setDiscName] = useState("");
  const [discKind, setDiscKind] = useState<DiscountKind>(DiscountKind.Percentage);
  const [discVal, setDiscVal] = useState("1000"); // 10% or ₹10
  const [discMaxUses, setDiscMaxUses] = useState("50");

  const [tmplName, setTmplName] = useState("");
  const [tmplValidityDays, setTmplValidityDays] = useState("30");

  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: () => {
      const extraPaise = Math.round((parseFloat(prodVariantExtra) || 0) * 100);
      const variants =
        prodVariantAttr && prodVariantVal
          ? [
              {
                attributeName: prodVariantAttr,
                attributeValue: prodVariantVal,
                extraPricePaise: extraPaise,
              },
            ]
          : [];
      return catalogApi.createProduct({
        name: prodName,
        type: prodType,
        salesPricePaise: Math.round(parseFloat(prodPrice) * 100),
        costPricePaise: 0,
        variants,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalog", "products"] });
      setModalType(null);
    },
    onError: (err: Error) => setModalError(err.message),
  });

  const createPlanMutation = useMutation({
    mutationFn: () =>
      catalogApi.createPlan({
        name: planName,
        pricePaise: Math.round(parseFloat(planPrice) * 100),
        billingPeriod: planPeriod,
        canPause: planCanPause,
        canCloseEarly: planCanCloseEarly,
        canRenew: planCanRenew,
        autoCloseOnEnd: planAutoClose,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalog", "plans"] });
      setModalType(null);
    },
    onError: (err: Error) => setModalError(err.message),
  });

  const createTaxMutation = useMutation({
    mutationFn: () =>
      catalogApi.createTax({
        name: taxName,
        rateBps: parseInt(taxRateBps, 10),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalog", "taxes"] });
      setModalType(null);
    },
    onError: (err: Error) => setModalError(err.message),
  });

  const createDiscountMutation = useMutation({
    mutationFn: () =>
      catalogApi.createDiscount({
        name: discName,
        kind: discKind,
        value: parseInt(discVal, 10),
        scope: DiscountScope.Subscription,
        ...(discMaxUses ? { maxUses: parseInt(discMaxUses, 10) } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalog", "discounts"] });
      setModalType(null);
    },
    onError: (err: Error) => setModalError(err.message),
  });

  const createTemplateMutation = useMutation({
    mutationFn: () =>
      catalogApi.createTemplate({
        name: tmplName,
        validityDays: parseInt(tmplValidityDays, 10) || 30,
        lines: [],
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalog", "templates"] });
      setModalType(null);
    },
    onError: (err: Error) => setModalError(err.message),
  });

  const createStaffMutation = useMutation({
    mutationFn: () =>
      usersApi.createStaff({
        name: staffName,
        email: staffEmail,
        password: staffPassword,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users", "staff"] });
      setModalType(null);
    },
    onError: (err: Error) => setModalError(err.message),
  });

  // Columns for Tables
  const productCols: DataTableColumn<ProductDetail>[] = [
    { key: "name", header: "Product Name", render: (p) => <span style={{ fontWeight: "bold" }}>{p.name}</span> },
    { key: "type", header: "Type", render: (p) => <Badge variant="muted">{p.type}</Badge> },
    { key: "price", header: "Price", render: (p) => <MoneyDisplay paise={p.salesPricePaise} isBold /> },
    {
      key: "variants",
      header: "Configured Variants",
      render: (p) => (
        <span>
          {p.variants.length > 0
            ? p.variants.map((v) => `${v.attributeName}: ${v.attributeValue} (+₹${(v.extraPricePaise / 100).toFixed(2)})`).join(", ")
            : "—"}
        </span>
      ),
    },
  ];

  const planCols: DataTableColumn<Plan>[] = [
    { key: "name", header: "Plan Name", render: (p) => <span style={{ fontWeight: "bold" }}>{p.name}</span> },
    { key: "period", header: "Period", render: (p) => <span style={{ textTransform: "capitalize" }}>{p.billingPeriod}</span> },
    { key: "price", header: "Base Price", render: (p) => <MoneyDisplay paise={p.pricePaise} isBold /> },
    {
      key: "rules",
      header: "Lifecycle Rules",
      render: (p) => (
        <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
          {p.canPause && <Badge variant="muted">Pause</Badge>}
          {p.canCloseEarly && <Badge variant="muted">Early Close</Badge>}
          {p.canRenew && <Badge variant="muted">Renew</Badge>}
          {p.autoCloseOnEnd && <Badge variant="alert">Auto Close</Badge>}
        </div>
      ),
    },
  ];

  const tmplCols: DataTableColumn<QuotationTemplateDetail>[] = [
    { key: "name", header: "Template Name", render: (t) => <span style={{ fontWeight: "bold" }}>{t.name}</span> },
    { key: "validity", header: "Validity", render: (t) => <span className="tabular-nums">{t.validityDays} days</span> },
    { key: "lines", header: "Configured Items", render: (t) => <span>{t.lines.length} line(s)</span> },
  ];

  const taxCols: DataTableColumn<Tax>[] = [
    { key: "name", header: "Tax Name", render: (t) => <span style={{ fontWeight: "bold" }}>{t.name}</span> },
    { key: "rate", header: "Rate (%)", render: (t) => <span className="tabular-nums">{(t.rateBps / 100).toFixed(2)}% ({t.rateBps} bps)</span> },
    { key: "status", header: "Status", render: (t) => <Badge status={t.isActive ? "active" : "closed"}>{t.isActive ? "Active" : "Inactive"}</Badge> },
  ];

  const discCols: DataTableColumn<Discount>[] = [
    { key: "name", header: "Discount Name", render: (d) => <span style={{ fontWeight: "bold" }}>{d.name}</span> },
    {
      key: "value",
      header: "Benefit",
      render: (d) => (
        <span>
          {d.kind === "percentage" ? `${(d.value / 100).toFixed(1)}%` : <MoneyDisplay paise={d.value} />}
        </span>
      ),
    },
    { key: "scope", header: "Scope", render: (d) => <span style={{ textTransform: "capitalize" }}>{d.scope}</span> },
    {
      key: "usage",
      header: "Usage / Quota",
      render: (d) => {
        const max = d.maxUses ?? 100;
        const used = d.timesUsed;
        const pct = Math.min(100, Math.round((used / max) * 100));
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <div className={styles.usageBar}>
              <div className={styles.usageFill} style={{ width: `${pct}%` }} />
            </div>
            <span className="tabular-nums" style={{ fontSize: "var(--text-xs)" }}>
              {used} / {d.maxUses ?? "∞"}
            </span>
          </div>
        );
      },
    },
  ];

  const staffCols: DataTableColumn<UserSummary>[] = [
    { key: "name", header: "Staff Member", render: (s) => <span style={{ fontWeight: "bold" }}>{s.name}</span> },
    { key: "email", header: "Email Address", render: (s) => <span>{s.email}</span> },
    { key: "role", header: "Role", render: (s) => <Badge status={s.role}>{s.role}</Badge> },
  ];

  const isStaffValid = validatePasswordCriteria(staffPassword).isValid;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Catalog & Configuration</h1>
          <p className={styles.subtitle}>
            Product catalogs, lifecycle policies, taxation, discounts, and organization staff
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={() => { setModalError(null); setModalType(activeTab); }}>
            + Add {activeTab.slice(0, -1)}
          </Button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "products" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("products")}
        >
          Products & Variants
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "plans" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("plans")}
        >
          Subscription Plans
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "templates" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("templates")}
        >
          Quotation Templates
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "taxes" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("taxes")}
        >
          Taxes
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "discounts" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("discounts")}
        >
          Discounts & Promotions
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "staff" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("staff")}
        >
          Staff Directory
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "products" && (
        <DataTable
          columns={productCols}
          data={productsQuery.data?.items}
          isLoading={productsQuery.isLoading}
          getRowKey={(p) => p.id}
        />
      )}

      {activeTab === "plans" && (
        <DataTable
          columns={planCols}
          data={plansQuery.data?.items}
          isLoading={plansQuery.isLoading}
          getRowKey={(p) => p.id}
        />
      )}

      {activeTab === "templates" && (
        <DataTable
          columns={tmplCols}
          data={templatesQuery.data?.items}
          isLoading={templatesQuery.isLoading}
          getRowKey={(t) => t.id}
        />
      )}

      {activeTab === "taxes" && (
        <DataTable
          columns={taxCols}
          data={taxesQuery.data?.items}
          isLoading={taxesQuery.isLoading}
          getRowKey={(t) => t.id}
        />
      )}

      {activeTab === "discounts" && (
        <DataTable
          columns={discCols}
          data={discountsQuery.data?.items}
          isLoading={discountsQuery.isLoading}
          getRowKey={(d) => d.id}
        />
      )}

      {activeTab === "staff" && (
        <DataTable
          columns={staffCols}
          data={staffQuery.data?.items}
          isLoading={staffQuery.isLoading}
          getRowKey={(s) => s.id}
        />
      )}

      {/* Creation Modals (Admin Only) */}
      {modalType === "products" && (
        <Modal
          isOpen={true}
          onClose={() => setModalType(null)}
          title="Create Product"
          footer={
            <Button
              variant="primary"
              isLoading={createProductMutation.isPending}
              onClick={() => createProductMutation.mutate()}
            >
              Save Product
            </Button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {modalError && <div className={styles.errorBanner}>{modalError}</div>}
            <Input label="Name" required value={prodName} onChange={(e) => setProdName(e.target.value)} />
            <Select label="Type" value={prodType} onChange={(e) => setProdType(e.target.value as ProductType)}>
              <option value={ProductType.Service}>Service</option>
              <option value={ProductType.Consumable}>Consumable</option>
              <option value={ProductType.Subscription}>Subscription</option>
            </Select>
            <Input label="Sales Price (₹)" type="number" required value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} />
            <h3 style={{ fontSize: "var(--text-xs)", fontWeight: "bold", textTransform: "uppercase" }}>Optional Variant</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
              <Input label="Attribute" placeholder="e.g. Brand" value={prodVariantAttr} onChange={(e) => setProdVariantAttr(e.target.value)} />
              <Input label="Value" placeholder="e.g. Odoo" value={prodVariantVal} onChange={(e) => setProdVariantVal(e.target.value)} />
              <Input label="Extra (₹)" placeholder="560.00" value={prodVariantExtra} onChange={(e) => setProdVariantExtra(e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {modalType === "plans" && (
        <Modal
          isOpen={true}
          onClose={() => setModalType(null)}
          title="Create Plan"
          footer={
            <Button
              variant="primary"
              isLoading={createPlanMutation.isPending}
              onClick={() => createPlanMutation.mutate()}
            >
              Save Plan
            </Button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {modalError && <div className={styles.errorBanner}>{modalError}</div>}
            <Input label="Plan Name" required value={planName} onChange={(e) => setPlanName(e.target.value)} />
            <Input label="Price (₹)" type="number" required value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} />
            <Select label="Billing Period" value={planPeriod} onChange={(e) => setPlanPeriod(e.target.value as BillingPeriod)}>
              <option value={BillingPeriod.Daily}>Daily</option>
              <option value={BillingPeriod.Weekly}>Weekly</option>
              <option value={BillingPeriod.Monthly}>Monthly</option>
              <option value={BillingPeriod.Yearly}>Yearly</option>
            </Select>
            <h3 style={{ fontSize: "var(--text-xs)", fontWeight: "bold", textTransform: "uppercase" }}>Lifecycle Rules</h3>
            <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--text-sm)" }}>
              <input type="checkbox" checked={planCanPause} onChange={(e) => setPlanCanPause(e.target.checked)} />
              <span>Allow Pausing (Customer/Staff)</span>
            </label>
            <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--text-sm)" }}>
              <input type="checkbox" checked={planCanCloseEarly} onChange={(e) => setPlanCanCloseEarly(e.target.checked)} />
              <span>Allow Early Close before expiry</span>
            </label>
            <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--text-sm)" }}>
              <input type="checkbox" checked={planCanRenew} onChange={(e) => setPlanCanRenew(e.target.checked)} />
              <span>Allow Renewal from Closed</span>
            </label>
            <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--text-sm)" }}>
              <input type="checkbox" checked={planAutoClose} onChange={(e) => setPlanAutoClose(e.target.checked)} />
              <span>Auto-Close on Expiry Date</span>
            </label>
          </div>
        </Modal>
      )}

      {modalType === "taxes" && (
        <Modal
          isOpen={true}
          onClose={() => setModalType(null)}
          title="Create Tax"
          footer={
            <Button
              variant="primary"
              isLoading={createTaxMutation.isPending}
              onClick={() => createTaxMutation.mutate()}
            >
              Save Tax
            </Button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {modalError && <div className={styles.errorBanner}>{modalError}</div>}
            <Input label="Tax Name" required placeholder="GST 18%" value={taxName} onChange={(e) => setTaxName(e.target.value)} />
            <Input label="Rate Basis Points (100 bps = 1%)" type="number" required placeholder="1800" value={taxRateBps} onChange={(e) => setTaxRateBps(e.target.value)} />
          </div>
        </Modal>
      )}

      {modalType === "discounts" && (
        <Modal
          isOpen={true}
          onClose={() => setModalType(null)}
          title="Create Discount"
          footer={
            <Button
              variant="primary"
              isLoading={createDiscountMutation.isPending}
              onClick={() => createDiscountMutation.mutate()}
            >
              Save Discount
            </Button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {modalError && <div className={styles.errorBanner}>{modalError}</div>}
            <Input label="Discount Name" required placeholder="SUMMER10" value={discName} onChange={(e) => setDiscName(e.target.value)} />
            <Select label="Kind" value={discKind} onChange={(e) => setDiscKind(e.target.value as DiscountKind)}>
              <option value={DiscountKind.Percentage}>Percentage (bps, 1000 = 10%)</option>
              <option value={DiscountKind.Fixed}>Fixed Amount (paise)</option>
            </Select>
            <Input label="Value (Basis points or Paise)" type="number" required value={discVal} onChange={(e) => setDiscVal(e.target.value)} />
            <Input label="Max Uses (Quota)" type="number" value={discMaxUses} onChange={(e) => setDiscMaxUses(e.target.value)} />
          </div>
        </Modal>
      )}

      {modalType === "templates" && (
        <Modal
          isOpen={true}
          onClose={() => setModalType(null)}
          title="Create Quotation Template"
          footer={
            <Button
              variant="primary"
              isLoading={createTemplateMutation.isPending}
              onClick={() => createTemplateMutation.mutate()}
            >
              Save Template
            </Button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {modalError && <div className={styles.errorBanner}>{modalError}</div>}
            <Input label="Template Name" required placeholder="Standard SaaS Starter" value={tmplName} onChange={(e) => setTmplName(e.target.value)} />
            <Input label="Validity (Days)" type="number" value={tmplValidityDays} onChange={(e) => setTmplValidityDays(e.target.value)} />
          </div>
        </Modal>
      )}

      {modalType === "staff" && (
        <Modal
          isOpen={true}
          onClose={() => setModalType(null)}
          title="Invite Staff Member"
          footer={
            <Button
              variant="primary"
              disabled={!isStaffValid || !staffName || !staffEmail}
              isLoading={createStaffMutation.isPending}
              onClick={() => createStaffMutation.mutate()}
            >
              Create Staff Account
            </Button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {modalError && <div className={styles.errorBanner}>{modalError}</div>}
            <Input label="Staff Name" required value={staffName} onChange={(e) => setStaffName(e.target.value)} />
            <Input label="Email Address" type="email" required value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} />
            <Input label="Temporary Password" type="password" required value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} />
            <PasswordRulesChecklist password={staffPassword} />
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CatalogPage;
