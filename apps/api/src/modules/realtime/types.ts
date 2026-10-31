import type { Role, ServerRealtimeEvent } from "@brightloop/shared";

export interface RealtimePublisher {
  publish(event: ServerRealtimeEvent): void;
}

export interface ClientConnection {
  id: string;
  userId: string;
  role: Role;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

