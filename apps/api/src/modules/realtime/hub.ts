import { Role, type ServerRealtimeEvent } from "@brightloop/shared";
import type { ClientConnection, RealtimePublisher } from "./types.ts";

export interface RealtimeHub extends RealtimePublisher {
  register(conn: ClientConnection): () => void;
  getConnectionCount(): number;
}

export function createRealtimeHub(): RealtimeHub {
  const connections = new Map<string, ClientConnection>();

  return {
    register(conn: ClientConnection): () => void {
      connections.set(conn.id, conn);
      return () => {
        connections.delete(conn.id);
      };
    },

    getConnectionCount(): number {
      return connections.size;
    },

    publish(event: ServerRealtimeEvent): void {
      const data = JSON.stringify(event);

      for (const conn of connections.values()) {
        if (conn.role === Role.Admin || conn.role === Role.Staff) {
          try {
            conn.send(data);
          } catch {
            // Socket may have disconnected
          }
        } else if (conn.role === Role.Customer) {
          if (
            event.customerId !== undefined &&
            event.customerId === conn.userId
          ) {
            try {
              conn.send(data);
            } catch {
              // Socket may have disconnected
            }
          }
        }
      }
    },
  };
}

