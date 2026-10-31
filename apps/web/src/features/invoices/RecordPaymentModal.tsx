import { useState, type ReactElement } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PaymentMethod, type RecordPaymentBody, type PaymentMethodType } from "@brightloop/shared";
import { invoicesApi } from "./invoicesApi.ts";
import { Modal, Button, Input, Select, MoneyDisplay } from "../../components/index.ts";

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  totalPaise: number;
  amountPaidPaise: number;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  invoiceId,
  totalPaise,
  amountPaidPaise,
}: RecordPaymentModalProps): ReactElement {
  const queryClient = useQueryClient();
  const balancePaise = Math.max(0, totalPaise - amountPaidPaise);
  const initialRupees = (balancePaise / 100).toFixed(2);
  const today = new Date().toISOString().slice(0, 10);

  const [rupeesInput, setRupeesInput] = useState(initialRupees);
  const [method, setMethod] = useState<PaymentMethodType>(PaymentMethod.Card);
  const [paymentDate, setPaymentDate] = useState(today);
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const paymentMutation = useMutation({
    mutationFn: (body: RecordPaymentBody) =>
      invoicesApi.recordPayment(invoiceId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      onClose();
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Payment recording failed");
    },
  });

  function handleSubmit(): void {
    setErrorMessage(null);
    const amountVal = parseFloat(rupeesInput);
    if (isNaN(amountVal) || amountVal <= 0) {
      setErrorMessage("Please enter a valid payment amount greater than zero.");
      return;
    }

    const paise = Math.round(amountVal * 100);

    const payload: RecordPaymentBody = {
      amountPaise: paise,
      method,
      ...(paymentDate ? { paymentDate } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };

    paymentMutation.mutate(payload);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      footer={
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={paymentMutation.isPending}
            onClick={handleSubmit}
          >
            Confirm Payment
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {errorMessage && (
          <div
            style={{
              padding: "var(--space-2)",
              backgroundColor: "var(--color-surface-elevated)",
              border: "1px dashed var(--color-border-strong)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-xs)",
            }}
          >
            {errorMessage}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "var(--space-3)",
            backgroundColor: "var(--color-surface-elevated)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            Current Unpaid Balance:
          </span>
          <MoneyDisplay paise={balancePaise} isBold />
        </div>

        <Input
          label="Payment Amount (₹)"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={rupeesInput}
          onChange={(e) => setRupeesInput(e.target.value)}
        />

        <Select
          label="Payment Method"
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethodType)}
        >
          <option value={PaymentMethod.Card}>Credit / Debit Card</option>
          <option value={PaymentMethod.BankTransfer}>Bank Transfer / NEFT</option>
          <option value={PaymentMethod.Upi}>UPI / QR</option>
          <option value={PaymentMethod.Cash}>Cash</option>
        </Select>

        <Input
          label="Payment Date"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />

        <Input
          label="Reference / Note"
          type="text"
          placeholder="e.g., Transaction ID or cheque number"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  );
}
