import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import {
  CreatePlanBodySchema,
  UpdatePlanBodySchema,
  PlanSchema,
  PaginationQuerySchema,
  createPaginatedResponseSchema,
  IdParamSchema,
  ErrorResponseSchema,
  Role,
} from "@brightloop/shared";
import { requireRole } from "../../app.ts";
import type { PlansService } from "./service.ts";

export interface PlansRoutesOptions {
  service: PlansService;
}

export async function planRoutes(
  app: FastifyInstance,
  options: PlansRoutesOptions,
): Promise<void> {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = options.service;

  typedApp.get(
    "/api/plans",
    {
      schema: {
        querystring: PaginationQuerySchema,
        response: {
          200: createPaginatedResponseSchema(PlanSchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await service.listPlans(request.query);
      return reply.status(200).send(result);
    },
  );

  typedApp.get(
    "/api/plans/:id",
    {
      schema: {
        params: IdParamSchema,
        response: {
          200: PlanSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const plan = await service.getPlanById(request.params.id);
      return reply.status(200).send(plan);
    },
  );

  typedApp.post(
    "/api/plans",
    {
      preHandler: requireRole(Role.Admin),
      schema: {
        body: CreatePlanBodySchema,
        response: {
          201: PlanSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const created = await service.createPlan(request.body);
      return reply.status(201).send(created);
    },
  );

  typedApp.patch(
    "/api/plans/:id",
    {
      preHandler: requireRole(Role.Admin),
      schema: {
        params: IdParamSchema,
        body: UpdatePlanBodySchema,
        response: {
          200: PlanSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const updated = await service.updatePlan(
        request.params.id,
        request.body,
      );
      return reply.status(200).send(updated);
    },
  );

  typedApp.delete(
    "/api/plans/:id",
    {
      preHandler: requireRole(Role.Admin),
      schema: {
        params: IdParamSchema,
        response: {
          204: Type.Null(),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await service.deletePlan(request.params.id);
      return reply.status(204).send(null);
    },
  );
}

