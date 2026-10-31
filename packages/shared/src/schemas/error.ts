import { Type, type Static } from "@sinclair/typebox";

export const ErrorResponseSchema = Type.Object(
  {
    error: Type.Object(
      {
        code: Type.String(),
        message: Type.String(),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export type ErrorResponse = Static<typeof ErrorResponseSchema>;

