import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  DashboardSummarySchema,
  ErrorResponseSchema,
  Role,
} from "@brightloop/shared";
import { requireRole } from "../../app.ts";
import type { DashboardService } from "./service.ts";

export interface DashboardRoutesOptions {
  service: DashboardService;
}

export async function dashboardRoutes(
  app: FastifyInstance,
  options: DashboardRoutesOptions,
): Promise<void> {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = options.service;

  typedApp.get(
    "/api/dashboard/summary",
    {
      preHandler: requireRole(Role.Admin, Role.Staff),
      schema: {
        response: {
          200: DashboardSummarySchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const summary = await service.getSummary();
      return reply.status(200).send(summary);
    },
  );
}

