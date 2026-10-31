import { Type, type Static } from "@sinclair/typebox";
import { BillingPeriod } from "../enums.ts";

export const CreatePlanBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    pricePaise: Type.Integer({ minimum: 0 }),
    billingPeriod: Type.Union([
      Type.Literal(BillingPeriod.Daily),
      Type.Literal(BillingPeriod.Weekly),
      Type.Literal(BillingPeriod.Monthly),
      Type.Literal(BillingPeriod.Yearly),
    ]),
    minQuantity: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
    availableFrom: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    availableTo: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    autoCloseOnEnd: Type.Optional(Type.Boolean({ default: false })),
    canCloseEarly: Type.Optional(Type.Boolean({ default: false })),
    canPause: Type.Optional(Type.Boolean({ default: false })),
    canRenew: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);
export type CreatePlanBody = Static<typeof CreatePlanBodySchema>;

export const UpdatePlanBodySchema = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1 })),
    pricePaise: Type.Optional(Type.Integer({ minimum: 0 })),
    billingPeriod: Type.Optional(
      Type.Union([
        Type.Literal(BillingPeriod.Daily),
        Type.Literal(BillingPeriod.Weekly),
        Type.Literal(BillingPeriod.Monthly),
        Type.Literal(BillingPeriod.Yearly),
      ]),
    ),
    minQuantity: Type.Optional(Type.Integer({ minimum: 1 })),
    availableFrom: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    availableTo: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    autoCloseOnEnd: Type.Optional(Type.Boolean()),
    canCloseEarly: Type.Optional(Type.Boolean()),
    canPause: Type.Optional(Type.Boolean()),
    canRenew: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);
export type UpdatePlanBody = Static<typeof UpdatePlanBodySchema>;

export const PlanSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    pricePaise: Type.Integer(),
    billingPeriod: Type.Union([
      Type.Literal(BillingPeriod.Daily),
      Type.Literal(BillingPeriod.Weekly),
      Type.Literal(BillingPeriod.Monthly),
      Type.Literal(BillingPeriod.Yearly),
    ]),
    minQuantity: Type.Integer(),
    availableFrom: Type.Union([Type.String(), Type.Null()]),
    availableTo: Type.Union([Type.String(), Type.Null()]),
    autoCloseOnEnd: Type.Boolean(),
    canCloseEarly: Type.Boolean(),
    canPause: Type.Boolean(),
    canRenew: Type.Boolean(),
    createdAt: Type.Integer(),
    updatedAt: Type.Integer(),
    archivedAt: Type.Union([Type.Integer(), Type.Null()]),
  },
  { additionalProperties: false },
);
export type Plan = Static<typeof PlanSchema>;

