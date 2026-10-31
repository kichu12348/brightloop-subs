import type { FastifyInstance } from "fastify";
import {
  RealtimeEventType,
  Role,
  type ServerRealtimeEvent,
} from "@brightloop/shared";
import type { RealtimeHub } from "./hub.ts";
import type { ClientConnection } from "./types.ts";
import type { TokenPayload } from "../../app.ts";
import type { Clock } from "../../lib/clock.ts";

export interface RealtimeRoutesOptions {
  hub: RealtimeHub;
  clock?: Clock;
}

export async function realtimeRoutes(
  app: FastifyInstance,
  options: RealtimeRoutesOptions,
): Promise<void> {
  app.get(
    "/api/ws",
    {
      websocket: true,
    },
    (socket, request) => {
      const queryRecord =
        typeof request.query === "object" && request.query !== null
          ? (request.query as Record<string, unknown>)
          : null;
      const rawToken = queryRecord?.["token"];
      const token = typeof rawToken === "string" ? rawToken : undefined;

      if (!token) {
        socket.close(1008, "Token required");
        return;
      }

      let user: TokenPayload;
      try {
        user = app.jwt.verify<TokenPayload>(token);
      } catch {
        socket.close(1008, "Invalid or expired token");
        return;
      }

      const connectionId = crypto.randomUUID();
      const conn: ClientConnection = {
        id: connectionId,
        userId: user.id,
        role: user.role,
        send(data: string): void {
          if (socket.readyState === socket.OPEN) {
            socket.send(data);
          }
        },
        close(code?: number, reason?: string): void {
          socket.close(code, reason);
        },
      };

      const unregister = options.hub.register(conn);

      const nowMs = options.clock?.nowMs() ?? Date.now();
      const connectedEvent: ServerRealtimeEvent =
        user.role === Role.Customer
          ? {
              type: RealtimeEventType.Connected,
              timestampMs: nowMs,
              customerId: user.id,
              payload: {
                userId: user.id,
                role: user.role,
              },
            }
          : {
              type: RealtimeEventType.Connected,
              timestampMs: nowMs,
              payload: {
                userId: user.id,
                role: user.role,
              },
            };

      conn.send(JSON.stringify(connectedEvent));

      socket.on("close", () => {
        unregister();
      });

      socket.on("error", () => {
        unregister();
      });
    },
  );
}

