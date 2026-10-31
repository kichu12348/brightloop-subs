import { Type, type Static } from "@sinclair/typebox";

export const TemplateLineInputSchema = Type.Object(
  {
    productId: Type.String({ minLength: 1 }),
    variantId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    quantity: Type.Integer({ minimum: 1, default: 1 }),
    taxId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  },
  { additionalProperties: false },
);
export type TemplateLineInput = Static<typeof TemplateLineInputSchema>;

export const TemplateLineSchema = Type.Object(
  {
    id: Type.String(),
    templateId: Type.String(),
    productId: Type.String(),
    variantId: Type.Union([Type.String(), Type.Null()]),
    quantity: Type.Integer(),
    taxId: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.Integer(),
  },
  { additionalProperties: false },
);
export type TemplateLine = Static<typeof TemplateLineSchema>;

export const CreateQuotationTemplateBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    planId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    validityDays: Type.Integer({ minimum: 1, default: 30 }),
    lines: Type.Array(TemplateLineInputSchema, { default: [] }),
  },
  { additionalProperties: false },
);
export type CreateQuotationTemplateBody = Static<
  typeof CreateQuotationTemplateBodySchema
>;

export const QuotationTemplateDetailSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    planId: Type.Union([Type.String(), Type.Null()]),
    validityDays: Type.Integer(),
    createdAt: Type.Integer(),
    updatedAt: Type.Integer(),
    archivedAt: Type.Union([Type.Integer(), Type.Null()]),
    lines: Type.Array(TemplateLineSchema),
  },
  { additionalProperties: false },
);
export type QuotationTemplateDetail = Static<
  typeof QuotationTemplateDetailSchema
>;

