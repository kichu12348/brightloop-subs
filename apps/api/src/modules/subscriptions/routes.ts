import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  CreateSubscriptionBodySchema,
  TransitionSubscriptionBodySchema,
  SubscriptionSummarySchema,
  SubscriptionDetailSchema,
  SubscriptionListQuerySchema,
  IdParamSchema,
  ErrorResponseSchema,
  createPaginatedResponseSchema,
  Role,
} from "@brightloop/shared";
import { requireRole } from "../../app.ts";
import type { SubscriptionsService } from "./service.ts";

export interface SubscriptionsRoutesOptions {
  service: SubscriptionsService;
}

export async function subscriptionRoutes(
  app: FastifyInstance,
  options: SubscriptionsRoutesOptions,
): Promise<void> {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = options.service;

  typedApp.post(
    "/api/subscriptions",
    {
      preHandler: requireRole(Role.Admin, Role.Staff),
      schema: {
        body: CreateSubscriptionBodySchema,
        response: {
          201: SubscriptionDetailSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          422: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const created = await service.createSubscription(request.body);
      return reply.status(201).send(created);
    },
  );

  typedApp.get(
    "/api/subscriptions",
    {
      schema: {
        querystring: SubscriptionListQuerySchema,
        response: {
          200: createPaginatedResponseSchema(SubscriptionSummarySchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user;
      const result = await service.listSubscriptions(
        request.query,
        user.role,
        user.id,
      );
      return reply.status(200).send(result);
    },
  );

  typedApp.get(
    "/api/subscriptions/:id",
    {
      schema: {
        params: IdParamSchema,
        response: {
          200: SubscriptionDetailSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user;
      const subscription = await service.getSubscriptionById(
        request.params.id,
        user.role,
        user.id,
      );
      return reply.status(200).send(subscription);
    },
  );

  typedApp.post(
    "/api/subscriptions/:id/transition",
    {
      schema: {
        params: IdParamSchema,
        body: TransitionSubscriptionBodySchema,
        response: {
          200: SubscriptionDetailSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          422: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user;
      const updated = await service.transitionSubscription(
        request.params.id,
        request.body.status,
        user.role,
        user.id,
      );
      return reply.status(200).send(updated);
    },
  );
}

