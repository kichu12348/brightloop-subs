import { Type, type Static } from "@sinclair/typebox";
import { InvoiceStatus, PaymentMethod } from "../enums.ts";

export const InvoiceStatusSchema = Type.Union([
  Type.Literal(InvoiceStatus.Draft),
  Type.Literal(InvoiceStatus.Confirmed),
  Type.Literal(InvoiceStatus.Paid),
  Type.Literal(InvoiceStatus.Cancelled),
]);
export type InvoiceStatusType = Static<typeof InvoiceStatusSchema>;

export const InvoiceQueryStatusSchema = Type.Union([
  Type.Literal(InvoiceStatus.Draft),
  Type.Literal(InvoiceStatus.Confirmed),
  Type.Literal(InvoiceStatus.Paid),
  Type.Literal(InvoiceStatus.Cancelled),
  Type.Literal("Draft"),
  Type.Literal("Confirmed"),
  Type.Literal("Paid"),
  Type.Literal("Cancelled"),
]);
export type InvoiceQueryStatus = Static<typeof InvoiceQueryStatusSchema>;

export const PaymentMethodSchema = Type.Union([
  Type.Literal(PaymentMethod.BankTransfer),
  Type.Literal(PaymentMethod.Card),
  Type.Literal(PaymentMethod.Upi),
  Type.Literal(PaymentMethod.Cash),
]);
export type PaymentMethodType = Static<typeof PaymentMethodSchema>;

export const InvoiceLineDetailSchema = Type.Object(
  {
    id: Type.String(),
    invoiceId: Type.String(),
    productId: Type.String(),
    productName: Type.Optional(Type.String()),
    variantId: Type.Union([Type.String(), Type.Null()]),
    variantName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    description: Type.String(),
    quantity: Type.Integer(),
    unitPricePaise: Type.Integer(),
    taxRateBasisPoints: Type.Integer(),
    lineTotalPaise: Type.Integer(),
    createdAt: Type.Integer(),
  },
  { additionalProperties: false },
);
export type InvoiceLineDetail = Static<typeof InvoiceLineDetailSchema>;

export const PaymentDetailSchema = Type.Object(
  {
    id: Type.String(),
    invoiceId: Type.String(),
    customerId: Type.String(),
    amountPaise: Type.Integer(),
    method: PaymentMethodSchema,
    reference: Type.Union([Type.String(), Type.Null()]),
    paymentDate: Type.Union([Type.String(), Type.Null()]),
    recordedBy: Type.String(),
    createdAt: Type.Integer(),
  },
  { additionalProperties: false },
);
export type PaymentDetail = Static<typeof PaymentDetailSchema>;

export const InvoiceSummarySchema = Type.Object(
  {
    id: Type.String(),
    subscriptionId: Type.String(),
    customerId: Type.String(),
    customerName: Type.String(),
    customerEmail: Type.String(),
    status: InvoiceStatusSchema,
    periodStart: Type.String(),
    periodEnd: Type.String(),
    dueDate: Type.String(),
    subtotalPaise: Type.Integer(),
    discountPaise: Type.Integer(),
    taxPaise: Type.Integer(),
    totalPaise: Type.Integer(),
    amountPaidPaise: Type.Integer(),
    createdAt: Type.Integer(),
    updatedAt: Type.Integer(),
    archivedAt: Type.Union([Type.Integer(), Type.Null()]),
  },
  { additionalProperties: false },
);
export type InvoiceSummary = Static<typeof InvoiceSummarySchema>;

export const InvoiceDetailSchema = Type.Object(
  {
    id: Type.String(),
    subscriptionId: Type.String(),
    customerId: Type.String(),
    customer: Type.Object(
      {
        id: Type.String(),
        name: Type.String(),
        email: Type.String(),
      },
      { additionalProperties: false },
    ),
    status: InvoiceStatusSchema,
    periodStart: Type.String(),
    periodEnd: Type.String(),
    dueDate: Type.String(),
    subtotalPaise: Type.Integer(),
    discountPaise: Type.Integer(),
    taxPaise: Type.Integer(),
    totalPaise: Type.Integer(),
    amountPaidPaise: Type.Integer(),
    lines: Type.Array(InvoiceLineDetailSchema),
    payments: Type.Array(PaymentDetailSchema),
    createdAt: Type.Integer(),
    updatedAt: Type.Integer(),
    archivedAt: Type.Union([Type.Integer(), Type.Null()]),
  },
  { additionalProperties: false },
);
export type InvoiceDetail = Static<typeof InvoiceDetailSchema>;

export const TransitionInvoiceBodySchema = Type.Object(
  {
    status: Type.Union([
      Type.Literal(InvoiceStatus.Confirmed),
      Type.Literal(InvoiceStatus.Cancelled),
    ]),
  },
  { additionalProperties: false },
);
export type TransitionInvoiceBody = Static<
  typeof TransitionInvoiceBodySchema
>;

export const RecordPaymentBodySchema = Type.Object(
  {
    amountPaise: Type.Integer({ minimum: 1 }),
    method: PaymentMethodSchema,
    paymentDate: Type.Optional(Type.String()),
    note: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  },
  { additionalProperties: false },
);
export type RecordPaymentBody = Static<typeof RecordPaymentBodySchema>;

export const InvoiceListQuerySchema = Type.Object(
  {
    page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
    pageSize: Type.Optional(
      Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
    ),
    status: Type.Optional(InvoiceQueryStatusSchema),
    customerId: Type.Optional(Type.String()),
    overdueOnly: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);
export type InvoiceListQuery = Static<typeof InvoiceListQuerySchema>;

