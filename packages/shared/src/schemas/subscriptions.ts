import { Type, type Static } from "@sinclair/typebox";
import { SubscriptionStatus } from "../enums.ts";

export const SubscriptionStatusSchema = Type.Union([
  Type.Literal(SubscriptionStatus.Draft),
  Type.Literal(SubscriptionStatus.Quotation),
  Type.Literal(SubscriptionStatus.Confirmed),
  Type.Literal(SubscriptionStatus.Active),
  Type.Literal(SubscriptionStatus.Paused),
  Type.Literal(SubscriptionStatus.Closed),
]);
export type SubscriptionStatusType = Static<typeof SubscriptionStatusSchema>;

export const SubscriptionLineInputSchema = Type.Object(
  {
    productId: Type.String({ minLength: 1 }),
    variantId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    quantity: Type.Integer({ minimum: 1, default: 1 }),
    taxId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  },
  { additionalProperties: false },
);
export type SubscriptionLineInput = Static<typeof SubscriptionLineInputSchema>;

export const SubscriptionLineSchema = Type.Object(
  {
    id: Type.String(),
    subscriptionId: Type.String(),
    productId: Type.String(),
    productName: Type.Optional(Type.String()),
    variantId: Type.Union([Type.String(), Type.Null()]),
    variantName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    quantity: Type.Integer(),
    unitPricePaise: Type.Integer(),
    taxId: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.Integer(),
  },
  { additionalProperties: false },
);
export type SubscriptionLine = Static<typeof SubscriptionLineSchema>;

export const CreateSubscriptionBodySchema = Type.Object(
  {
    customerId: Type.String({ minLength: 1 }),
    planId: Type.Optional(Type.String({ minLength: 1 })),
    templateId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    discountId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    startDate: Type.String({ minLength: 1 }),
    expiryDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    paymentTermsDays: Type.Optional(Type.Integer({ minimum: 0, default: 30 })),
    lines: Type.Optional(Type.Array(SubscriptionLineInputSchema)),
  },
  { additionalProperties: false },
);
export type CreateSubscriptionBody = Static<typeof CreateSubscriptionBodySchema>;

export const TransitionSubscriptionBodySchema = Type.Object(
  {
    status: SubscriptionStatusSchema,
  },
  { additionalProperties: false },
);
export type TransitionSubscriptionBody = Static<
  typeof TransitionSubscriptionBodySchema
>;

export const SubscriptionSummarySchema = Type.Object(
  {
    id: Type.String(),
    subNumber: Type.String(),
    customerId: Type.String(),
    customerName: Type.String(),
    customerEmail: Type.String(),
    planId: Type.String(),
    planName: Type.String(),
    status: SubscriptionStatusSchema,
    startDate: Type.String(),
    endDate: Type.Union([Type.String(), Type.Null()]),
    nextBillingDate: Type.Union([Type.String(), Type.Null()]),
    discountId: Type.Union([Type.String(), Type.Null()]),
    paymentTermsDays: Type.Integer(),
    createdAt: Type.Integer(),
    updatedAt: Type.Integer(),
    archivedAt: Type.Union([Type.Integer(), Type.Null()]),
  },
  { additionalProperties: false },
);
export type SubscriptionSummary = Static<typeof SubscriptionSummarySchema>;

export const SubscriptionDetailSchema = Type.Object(
  {
    id: Type.String(),
    subNumber: Type.String(),
    customerId: Type.String(),
    customer: Type.Object(
      {
        id: Type.String(),
        name: Type.String(),
        email: Type.String(),
      },
      { additionalProperties: false },
    ),
    planId: Type.String(),
    plan: Type.Object(
      {
        id: Type.String(),
        name: Type.String(),
        pricePaise: Type.Integer(),
        billingPeriod: Type.String(),
        minQuantity: Type.Integer(),
        autoCloseOnEnd: Type.Boolean(),
        canCloseEarly: Type.Boolean(),
        canPause: Type.Boolean(),
        canRenew: Type.Boolean(),
      },
      { additionalProperties: false },
    ),
    status: SubscriptionStatusSchema,
    startDate: Type.String(),
    endDate: Type.Union([Type.String(), Type.Null()]),
    nextBillingDate: Type.Union([Type.String(), Type.Null()]),
    discountId: Type.Union([Type.String(), Type.Null()]),
    paymentTermsDays: Type.Integer(),
    lines: Type.Array(SubscriptionLineSchema),
    createdAt: Type.Integer(),
    updatedAt: Type.Integer(),
    archivedAt: Type.Union([Type.Integer(), Type.Null()]),
  },
  { additionalProperties: false },
);
export type SubscriptionDetail = Static<typeof SubscriptionDetailSchema>;

export const SubscriptionListQuerySchema = Type.Object(
  {
    page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
    pageSize: Type.Optional(
      Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
    ),
    status: Type.Optional(SubscriptionStatusSchema),
    customerId: Type.Optional(Type.String()),
    search: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);
export type SubscriptionListQuery = Static<typeof SubscriptionListQuerySchema>;

