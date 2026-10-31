import { Type, type Static } from "@sinclair/typebox";

export const CreateTaxBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    rateBps: Type.Integer({ minimum: 0, maximum: 10000 }),
    isActive: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);
export type CreateTaxBody = Static<typeof CreateTaxBodySchema>;

export const UpdateTaxBodySchema = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1 })),
    rateBps: Type.Optional(Type.Integer({ minimum: 0, maximum: 10000 })),
    isActive: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);
export type UpdateTaxBody = Static<typeof UpdateTaxBodySchema>;

export const TaxSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    rateBps: Type.Integer(),
    isActive: Type.Boolean(),
    createdAt: Type.Integer(),
    updatedAt: Type.Integer(),
    archivedAt: Type.Union([Type.Integer(), Type.Null()]),
  },
  { additionalProperties: false },
);
export type Tax = Static<typeof TaxSchema>;

