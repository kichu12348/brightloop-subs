import { Type, type Static } from "@sinclair/typebox";
import { DiscountKind, DiscountScope } from "../enums.ts";

export const CreateDiscountBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    kind: Type.Union([
      Type.Literal(DiscountKind.Fixed),
      Type.Literal(DiscountKind.Percentage),
    ]),
    value: Type.Integer({ minimum: 0 }),
    scope: Type.Union([
      Type.Literal(DiscountScope.Product),
      Type.Literal(DiscountScope.Subscription),
    ]),
    productId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    minQuantity: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
    minPurchasePaise: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
    startDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    endDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    maxUses: Type.Optional(
      Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
    ),
  },
  { additionalProperties: false },
);
export type CreateDiscountBody = Static<typeof CreateDiscountBodySchema>;

export const UpdateDiscountBodySchema = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1 })),
    kind: Type.Optional(
      Type.Union([
        Type.Literal(DiscountKind.Fixed),
        Type.Literal(DiscountKind.Percentage),
      ]),
    ),
    value: Type.Optional(Type.Integer({ minimum: 0 })),
    scope: Type.Optional(
      Type.Union([
        Type.Literal(DiscountScope.Product),
        Type.Literal(DiscountScope.Subscription),
      ]),
    ),
    productId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    minQuantity: Type.Optional(Type.Integer({ minimum: 0 })),
    minPurchasePaise: Type.Optional(Type.Integer({ minimum: 0 })),
    startDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    endDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    maxUses: Type.Optional(
      Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
    ),
  },
  { additionalProperties: false },
);
export type UpdateDiscountBody = Static<typeof UpdateDiscountBodySchema>;

export const DiscountSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    kind: Type.Union([
      Type.Literal(DiscountKind.Fixed),
      Type.Literal(DiscountKind.Percentage),
    ]),
    value: Type.Integer(),
    scope: Type.Union([
      Type.Literal(DiscountScope.Product),
      Type.Literal(DiscountScope.Subscription),
    ]),
    productId: Type.Union([Type.String(), Type.Null()]),
    minQuantity: Type.Integer(),
    minPurchasePaise: Type.Integer(),
    startDate: Type.Union([Type.String(), Type.Null()]),
    endDate: Type.Union([Type.String(), Type.Null()]),
    maxUses: Type.Union([Type.Integer(), Type.Null()]),
    timesUsed: Type.Integer(),
    createdAt: Type.Integer(),
    updatedAt: Type.Integer(),
    archivedAt: Type.Union([Type.Integer(), Type.Null()]),
  },
  { additionalProperties: false },
);
export type Discount = Static<typeof DiscountSchema>;

