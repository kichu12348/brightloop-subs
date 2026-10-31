import { Type, type Static } from "@sinclair/typebox";

export const IdParamSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export type IdParam = Static<typeof IdParamSchema>;

