import { Type, type Static } from "@sinclair/typebox";
import { ProductType } from "../enums.ts";

export const ProductVariantInputSchema = Type.Object(
  {
    attributeName: Type.String({ minLength: 1 }),
    attributeValue: Type.String({ minLength: 1 }),
    extraPricePaise: Type.Integer({ default: 0 }),
  },
  { additionalProperties: false },
);
export type ProductVariantInput = Static<typeof ProductVariantInputSchema>;

export const ProductVariantSchema = Type.Object(
  {
    id: Type.String(),
    productId: Type.String(),
    attributeName: Type.String(),
    attributeValue: Type.String(),
    extraPricePaise: Type.Integer(),
    createdAt: Type.Integer(),
    updatedAt: Type.Integer(),
    archivedAt: Type.Union([Type.Integer(), Type.Null()]),
  },
  { additionalProperties: false },
);
export type ProductVariant = Static<typeof ProductVariantSchema>;

export const CreateProductBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    type: Type.Union([
      Type.Literal(ProductType.Service),
      Type.Literal(ProductType.Consumable),
      Type.Literal(ProductType.Subscription),
    ]),
    salesPricePaise: Type.Integer({ minimum: 0 }),
    costPricePaise: Type.Integer({ minimum: 0, default: 0 }),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    variants: Type.Array(ProductVariantInputSchema, { default: [] }),
  },
  { additionalProperties: false },
);
export type CreateProductBody = Static<typeof CreateProductBodySchema>;

export const UpdateProductBodySchema = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1 })),
    type: Type.Optional(
      Type.Union([
        Type.Literal(ProductType.Service),
        Type.Literal(ProductType.Consumable),
        Type.Literal(ProductType.Subscription),
      ]),
    ),
    salesPricePaise: Type.Optional(Type.Integer({ minimum: 0 })),
    costPricePaise: Type.Optional(Type.Integer({ minimum: 0 })),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    variants: Type.Optional(Type.Array(ProductVariantInputSchema)),
  },
  { additionalProperties: false },
);
export type UpdateProductBody = Static<typeof UpdateProductBodySchema>;

export const ProductDetailSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    type: Type.Union([
      Type.Literal(ProductType.Service),
      Type.Literal(ProductType.Consumable),
      Type.Literal(ProductType.Subscription),
    ]),
    salesPricePaise: Type.Integer(),
    costPricePaise: Type.Integer(),
    notes: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.Integer(),
    updatedAt: Type.Integer(),
    archivedAt: Type.Union([Type.Integer(), Type.Null()]),
    variants: Type.Array(ProductVariantSchema),
  },
  { additionalProperties: false },
);
export type ProductDetail = Static<typeof ProductDetailSchema>;

