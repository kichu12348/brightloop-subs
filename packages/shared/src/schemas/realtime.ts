import { Type, type Static } from "@sinclair/typebox";
import { RealtimeEventType } from "../enums.ts";

export const WsQuerySchema = Type.Object(
  {
    token: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);
export type WsQuery = Static<typeof WsQuerySchema>;

export const ConnectedEventPayloadSchema = Type.Object(
  {
    userId: Type.String(),
    role: Type.String(),
  },
  { additionalProperties: false },
);
export type ConnectedEventPayload = Static<typeof ConnectedEventPayloadSchema>;

export const SubscriptionCreatedEventPayloadSchema = Type.Object(
  {
    id: Type.String(),
    subNumber: Type.String(),
    customerId: Type.String(),
    status: Type.String(),
  },
  { additionalProperties: false },
);
export type SubscriptionCreatedEventPayload = Static<
  typeof SubscriptionCreatedEventPayloadSchema
>;

export const SubscriptionStatusChangedEventPayloadSchema = Type.Object(
  {
    id: Type.String(),
    customerId: Type.String(),
    fromStatus: Type.String(),
    toStatus: Type.String(),
  },
  { additionalProperties: false },
);
export type SubscriptionStatusChangedEventPayload = Static<
  typeof SubscriptionStatusChangedEventPayloadSchema
>;

export const InvoiceCreatedEventPayloadSchema = Type.Object(
  {
    id: Type.String(),
    subscriptionId: Type.String(),
    customerId: Type.String(),
    totalPaise: Type.Integer(),
    periodStart: Type.String(),
    periodEnd: Type.String(),
  },
  { additionalProperties: false },
);
export type InvoiceCreatedEventPayload = Static<
  typeof InvoiceCreatedEventPayloadSchema
>;

export const InvoiceStatusChangedEventPayloadSchema = Type.Object(
  {
    id: Type.String(),
    customerId: Type.String(),
    fromStatus: Type.String(),
    toStatus: Type.String(),
  },
  { additionalProperties: false },
);
export type InvoiceStatusChangedEventPayload = Static<
  typeof InvoiceStatusChangedEventPayloadSchema
>;

export const PaymentRecordedEventPayloadSchema = Type.Object(
  {
    id: Type.String(),
    invoiceId: Type.String(),
    customerId: Type.String(),
    amountPaise: Type.Integer(),
    method: Type.String(),
  },
  { additionalProperties: false },
);
export type PaymentRecordedEventPayload = Static<
  typeof PaymentRecordedEventPayloadSchema
>;

export const BillingRunCompletedEventPayloadSchema = Type.Object(
  {
    invoicesCreated: Type.Integer(),
    subscriptionsClosed: Type.Integer(),
    targetDate: Type.String(),
  },
  { additionalProperties: false },
);
export type BillingRunCompletedEventPayload = Static<
  typeof BillingRunCompletedEventPayloadSchema
>;

export const ConnectedEventSchema = Type.Object(
  {
    type: Type.Literal(RealtimeEventType.Connected),
    timestampMs: Type.Integer(),
    customerId: Type.Optional(Type.String()),
    payload: ConnectedEventPayloadSchema,
  },
  { additionalProperties: false },
);
export type ConnectedEvent = Static<typeof ConnectedEventSchema>;

export const SubscriptionCreatedEventSchema = Type.Object(
  {
    type: Type.Literal(RealtimeEventType.SubscriptionCreated),
    timestampMs: Type.Integer(),
    customerId: Type.Optional(Type.String()),
    payload: SubscriptionCreatedEventPayloadSchema,
  },
  { additionalProperties: false },
);
export type SubscriptionCreatedEvent = Static<
  typeof SubscriptionCreatedEventSchema
>;

export const SubscriptionStatusChangedEventSchema = Type.Object(
  {
    type: Type.Literal(RealtimeEventType.SubscriptionStatusChanged),
    timestampMs: Type.Integer(),
    customerId: Type.Optional(Type.String()),
    payload: SubscriptionStatusChangedEventPayloadSchema,
  },
  { additionalProperties: false },
);
export type SubscriptionStatusChangedEvent = Static<
  typeof SubscriptionStatusChangedEventSchema
>;

export const InvoiceCreatedEventSchema = Type.Object(
  {
    type: Type.Literal(RealtimeEventType.InvoiceCreated),
    timestampMs: Type.Integer(),
    customerId: Type.Optional(Type.String()),
    payload: InvoiceCreatedEventPayloadSchema,
  },
  { additionalProperties: false },
);
export type InvoiceCreatedEvent = Static<typeof InvoiceCreatedEventSchema>;

export const InvoiceStatusChangedEventSchema = Type.Object(
  {
    type: Type.Literal(RealtimeEventType.InvoiceStatusChanged),
    timestampMs: Type.Integer(),
    customerId: Type.Optional(Type.String()),
    payload: InvoiceStatusChangedEventPayloadSchema,
  },
  { additionalProperties: false },
);
export type InvoiceStatusChangedEvent = Static<
  typeof InvoiceStatusChangedEventSchema
>;

export const PaymentRecordedEventSchema = Type.Object(
  {
    type: Type.Literal(RealtimeEventType.PaymentRecorded),
    timestampMs: Type.Integer(),
    customerId: Type.Optional(Type.String()),
    payload: PaymentRecordedEventPayloadSchema,
  },
  { additionalProperties: false },
);
export type PaymentRecordedEvent = Static<typeof PaymentRecordedEventSchema>;

export const BillingRunCompletedEventSchema = Type.Object(
  {
    type: Type.Literal(RealtimeEventType.BillingRunCompleted),
    timestampMs: Type.Integer(),
    customerId: Type.Optional(Type.String()),
    payload: BillingRunCompletedEventPayloadSchema,
  },
  { additionalProperties: false },
);
export type BillingRunCompletedEvent = Static<
  typeof BillingRunCompletedEventSchema
>;

export const ServerRealtimeEventSchema = Type.Union([
  ConnectedEventSchema,
  SubscriptionCreatedEventSchema,
  SubscriptionStatusChangedEventSchema,
  InvoiceCreatedEventSchema,
  InvoiceStatusChangedEventSchema,
  PaymentRecordedEventSchema,
  BillingRunCompletedEventSchema,
]);
export type ServerRealtimeEvent = Static<typeof ServerRealtimeEventSchema>;

