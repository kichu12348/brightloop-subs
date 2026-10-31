import { Type, type Static } from "@sinclair/typebox";

export const IsoDateSchema = Type.String({
  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
});
export type IsoDate = Static<typeof IsoDateSchema>;

export const RunBillingBodySchema = Type.Object(
  {
    targetDate: Type.Optional(IsoDateSchema),
  },
  { additionalProperties: false },
);
export type RunBillingBody = Static<typeof RunBillingBodySchema>;

export const BillingFailureSchema = Type.Object(
  {
    subscriptionId: Type.String(),
    reason: Type.String(),
  },
  { additionalProperties: false },
);
export type BillingFailure = Static<typeof BillingFailureSchema>;

export const BillingRunResultSchema = Type.Object(
  {
    targetDate: Type.String(),
    processedCount: Type.Integer({ minimum: 0 }),
    invoicesCreated: Type.Integer({ minimum: 0 }),
    subscriptionsClosed: Type.Integer({ minimum: 0 }),
    skippedDuplicates: Type.Integer({ minimum: 0 }),
    failures: Type.Array(BillingFailureSchema),
  },
  { additionalProperties: false },
);
export type BillingRunResult = Static<typeof BillingRunResultSchema>;

