import { Type, type Static, type TSchema } from "@sinclair/typebox";

export const PaginationQuerySchema = Type.Object(
  {
    page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
    pageSize: Type.Optional(
      Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
    ),
  },
  { additionalProperties: false },
);

export type PaginationQuery = Static<typeof PaginationQuerySchema>;

export function createPaginatedResponseSchema<T extends TSchema>(
  itemSchema: T,
) {
  return Type.Object(
    {
      items: Type.Array(itemSchema),
      total: Type.Integer({ minimum: 0 }),
      page: Type.Integer({ minimum: 1 }),
      pageSize: Type.Integer({ minimum: 1, maximum: 100 }),
    },
    { additionalProperties: false },
  );
}

export const PaginatedResponseSchema = createPaginatedResponseSchema(
  Type.Unknown(),
);

export type PaginatedResponse<T = unknown> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

