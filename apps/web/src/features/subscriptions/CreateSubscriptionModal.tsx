import { useState, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type CreateSubscriptionBody,
  type SubscriptionLineInput,
} from "@brightloop/shared";
import { subscriptionsApi } from "./subscriptionsApi.ts";
import { catalogApi } from "../catalog/catalogApi.ts";
import { usersApi } from "../users/usersApi.ts";
import {
  Modal,
  Button,
  Input,
  Select,
} from "../../components/index.ts";

export interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (subId: string) => void;
}

export function CreateSubscriptionModal({
  isOpen,
  onClose,
  onCreated,
}: CreateSubscriptionModalProps): ReactElement {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [mode, setMode] = useState<"template" | "custom">("template");
  const [customerId, setCustomerId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [discountId, setDiscountId] = useState("");
  const [lines, setLines] = useState<SubscriptionLineInput[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Customers
  const { data: customersData } = useQuery({
    queryKey: ["users", "customers"],
    queryFn: () => usersApi.list({ role: "customer", pageSize: 100 }),
    enabled: isOpen,
  });

  // Load Plans
  const { data: plansData } = useQuery({
    queryKey: ["catalog", "plans"],
    queryFn: () => catalogApi.listPlans(),
    enabled: isOpen,
  });

  // Load Templates
  const { data: templatesData } = useQuery({
    queryKey: ["catalog", "templates"],
    queryFn: () => catalogApi.listTemplates(),
    enabled: isOpen,
  });

  // Load Products
  const { data: productsData } = useQuery({
    queryKey: ["catalog", "products"],
    queryFn: () => catalogApi.listProducts(),
    enabled: isOpen,
  });

  // Load Discounts
  const { data: discountsData } = useQuery({
    queryKey: ["catalog", "discounts"],
    queryFn: () => catalogApi.listDiscounts(),
    enabled: isOpen,
  });

  // Load Taxes
  const { data: taxesData } = useQuery({
    queryKey: ["catalog", "taxes"],
    queryFn: () => catalogApi.listTaxes(),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: (body: CreateSubscriptionBody) => subscriptionsApi.create(body),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onCreated(res.id);
      onClose();
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to create subscription");
    },
  });

  function handleTemplateSelect(tId: string): void {
    setTemplateId(tId);
    const tmpl = templatesData?.items.find((t) => t.id === tId);
    if (tmpl) {
      if (tmpl.planId) setPlanId(tmpl.planId);
      if (tmpl.lines && tmpl.lines.length > 0) {
        setLines(
          tmpl.lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            quantity: l.quantity,
            taxId: l.taxId,
          })),
        );
      }
    }
  }

  function handleAddLine(): void {
    const firstProd = productsData?.items[0];
    if (firstProd) {
      setLines([
        ...lines,
        {
          productId: firstProd.id,
          variantId: null,
          quantity: 1,
          taxId: null,
        },
      ]);
    }
  }

  function handleRemoveLine(index: number): void {
    setLines(lines.filter((_, i) => i !== index));
  }

  function handleSubmit(): void {
    setErrorMessage(null);
    if (!customerId) {
      setErrorMessage("Please select a customer");
      return;
    }

    const payload: CreateSubscriptionBody = {
      customerId,
      startDate,
      ...(planId ? { planId } : {}),
      ...(mode === "template" && templateId ? { templateId } : {}),
      ...(discountId ? { discountId } : {}),
      ...(lines.length > 0 ? { lines } : {}),
    };

    createMutation.mutate(payload);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Subscription"
      size="lg"
      footer={
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={createMutation.isPending}
            onClick={handleSubmit}
          >
            Create Subscription
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {errorMessage && (
          <div
            style={{
              padding: "var(--space-2)",
              border: "1px dashed var(--color-border-strong)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-xs)",
            }}
          >
            {errorMessage}
          </div>
        )}

        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button
            size="sm"
            variant={mode === "template" ? "primary" : "outline"}
            onClick={() => setMode("template")}
          >
            From Quotation Template
          </Button>
          <Button
            size="sm"
            variant={mode === "custom" ? "primary" : "outline"}
            onClick={() => setMode("custom")}
          >
            Custom Subscription
          </Button>
        </div>

        <Select
          label="Customer"
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">-- Select Customer --</option>
          {customersData?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.email})
            </option>
          ))}
        </Select>

        {mode === "template" && (
          <Select
            label="Quotation Template"
            value={templateId}
            onChange={(e) => handleTemplateSelect(e.target.value)}
          >
            <option value="">-- Select Quotation Template --</option>
            {templatesData?.items.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (Valid {t.validityDays} days)
              </option>
            ))}
          </Select>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
          <Select
            label="Recurring Plan"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            <option value="">-- Select Plan --</option>
            {plansData?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.billingPeriod}) - ₹{(p.pricePaise / 100).toFixed(2)}
              </option>
            ))}
          </Select>

          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <Select
          label="Discount Coupon (Optional)"
          value={discountId}
          onChange={(e) => setDiscountId(e.target.value)}
        >
          <option value="">-- None --</option>
          {discountsData?.items.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.kind === "percentage" ? `${d.value / 100}%` : `₹${d.value / 100}`})
            </option>
          ))}
        </Select>

        {/* Product Lines Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: "bold", textTransform: "uppercase" }}>
              Subscription Lines ({lines.length})
            </span>
            <Button size="sm" variant="outline" onClick={handleAddLine}>
              + Add Product Line
            </Button>
          </div>

          {lines.map((line, idx) => {
            const product = productsData?.items.find((p) => p.id === line.productId);
            const variants = product?.variants ?? [];

            return (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 1fr 1fr auto",
                  gap: "var(--space-2)",
                  alignItems: "flex-end",
                  padding: "var(--space-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-surface)",
                }}
              >
                <Select
                  label="Product"
                  value={line.productId}
                  onChange={(e) => {
                    const newProdId = e.target.value;
                    setLines(
                      lines.map((l, i) =>
                        i === idx ? { ...l, productId: newProdId, variantId: null } : l,
                      ),
                    );
                  }}
                >
                  {productsData?.items.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Variant"
                  value={line.variantId ?? ""}
                  onChange={(e) => {
                    const vId = e.target.value || null;
                    setLines(
                      lines.map((l, i) => (i === idx ? { ...l, variantId: vId } : l)),
                    );
                  }}
                >
                  <option value="">Standard (No add-on)</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.attributeName}: {v.attributeValue} (+₹{(v.extraPricePaise / 100).toFixed(2)})
                    </option>
                  ))}
                </Select>

                <Input
                  label="Qty"
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => {
                    const qty = parseInt(e.target.value, 10) || 1;
                    setLines(lines.map((l, i) => (i === idx ? { ...l, quantity: qty } : l)));
                  }}
                />

                <Select
                  label="Tax"
                  value={line.taxId ?? ""}
                  onChange={(e) => {
                    const tId = e.target.value || null;
                    setLines(lines.map((l, i) => (i === idx ? { ...l, taxId: tId } : l)));
                  }}
                >
                  <option value="">No Tax</option>
                  {taxesData?.items.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.rateBps / 100}%)
                    </option>
                  ))}
                </Select>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveLine(idx)}
                  title="Remove"
                >
                  ✕
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
