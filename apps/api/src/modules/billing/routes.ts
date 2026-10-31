import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  RunBillingBodySchema,
  BillingRunResultSchema,
  ErrorResponseSchema,
  Role,
} from "@brightloop/shared";
import { requireRole } from "../../app.ts";
import type { BillingService } from "./service.ts";

export interface BillingRoutesOptions {
  service: BillingService;
}

export async function billingRoutes(
  app: FastifyInstance,
  options: BillingRoutesOptions,
): Promise<void> {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = options.service;

  typedApp.post(
    "/api/billing/run",
    {
      preHandler: requireRole(Role.Admin),
      schema: {
        body: RunBillingBodySchema,
        response: {
          200: BillingRunResultSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await service.runBilling(request.body.targetDate);
      return reply.status(200).send(result);
    },
  );
}

