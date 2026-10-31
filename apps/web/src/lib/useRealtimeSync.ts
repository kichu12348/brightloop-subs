import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RealtimeEventType } from "@brightloop/shared";
import { useAuthStore } from "./useAuthStore.ts";
import { useUiStore } from "./useUiStore.ts";

interface IncomingWsMessage {
  type: string;
  payload: Record<string, unknown>;
  timestamp?: number;
}

function formatEventSummary(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case RealtimeEventType.Connected:
      return "Connected to real-time sync stream";
    case RealtimeEventType.SubscriptionCreated:
      return `New subscription created: ${String(payload["subNumber"] ?? payload["id"] ?? "")}`;
    case RealtimeEventType.SubscriptionStatusChanged:
      return `Subscription changed from ${String(payload["fromStatus"] ?? "")} to ${String(payload["toStatus"] ?? "")}`;
    case RealtimeEventType.InvoiceCreated: {
      const paise = typeof payload["totalPaise"] === "number" ? payload["totalPaise"] : 0;
      const formatted = `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
      return `New invoice generated: ${formatted}`;
    }
    case RealtimeEventType.InvoiceStatusChanged:
      return `Invoice status updated to ${String(payload["toStatus"] ?? "")}`;
    case RealtimeEventType.PaymentRecorded: {
      const paise = typeof payload["amountPaise"] === "number" ? payload["amountPaise"] : 0;
      const formatted = `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
      return `Payment of ${formatted} recorded (${String(payload["method"] ?? "")})`;
    }
    case RealtimeEventType.BillingRunCompleted:
      return `Billing cycle completed: ${String(payload["invoicesCreated"] ?? 0)} invoice(s) generated`;
    default:
      return `Event: ${type}`;
  }
}

export function useRealtimeSync(): void {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setWsConnected = useUiStore((s) => s.setWsConnected);
  const addLiveEvent = useUiStore((s) => s.addLiveEvent);
  const pushToast = useUiStore((s) => s.pushToast);
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setWsConnected(false);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    let isUnmounted = false;

    function connect(): void {
      if (isUnmounted || !token) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/ws?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = (): void => {
        if (isUnmounted) return;
        setWsConnected(true);
      };

      ws.onmessage = (event: MessageEvent): void => {
        if (isUnmounted) return;
        try {
          const raw = String(event.data);
          const data = JSON.parse(raw) as IncomingWsMessage;
          const { type, payload } = data;
          const timestamp = data.timestamp ?? Date.now();
          const summary = formatEventSummary(type, payload ?? {});

          addLiveEvent({
            type,
            timestamp,
            payload: payload ?? {},
            summary,
          });

          if (type !== RealtimeEventType.Connected) {
            pushToast({
              title: "Real-Time Update",
              message: summary,
              kind: "info",
            });
          }

          if (
            type === RealtimeEventType.SubscriptionCreated ||
            type === RealtimeEventType.SubscriptionStatusChanged
          ) {
            void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          } else if (
            type === RealtimeEventType.InvoiceCreated ||
            type === RealtimeEventType.InvoiceStatusChanged ||
            type === RealtimeEventType.PaymentRecorded
          ) {
            void queryClient.invalidateQueries({ queryKey: ["invoices"] });
            void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          } else if (type === RealtimeEventType.BillingRunCompleted) {
            void queryClient.invalidateQueries({ queryKey: ["invoices"] });
            void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          }
        } catch {
          // Ignore parse errors from unknown frames
        }
      };

      ws.onclose = (): void => {
        if (isUnmounted) return;
        setWsConnected(false);
        // Schedule reconnect
        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (): void => {
        ws.close();
      };
    }

    connect();

    return (): void => {
      isUnmounted = true;
      setWsConnected(false);
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, token, queryClient, setWsConnected, addLiveEvent, pushToast]);
}

