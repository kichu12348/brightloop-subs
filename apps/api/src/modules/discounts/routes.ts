import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  CreateDiscountBodySchema,
  UpdateDiscountBodySchema,
  DiscountSchema,
  PaginationQuerySchema,
  createPaginatedResponseSchema,
  IdParamSchema,
  ErrorResponseSchema,
  Role,
} from "@brightloop/shared";
import { requireRole } from "../../app.ts";
import type { DiscountsService } from "./service.ts";

export interface DiscountsRoutesOptions {
  service: DiscountsService;
}

export async function discountRoutes(
  app: FastifyInstance,
  options: DiscountsRoutesOptions,
): Promise<void> {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = options.service;

  typedApp.get(
    "/api/discounts",
    {
      preHandler: requireRole(Role.Admin, Role.Staff),
      schema: {
        querystring: PaginationQuerySchema,
        response: {
          200: createPaginatedResponseSchema(DiscountSchema),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await service.listDiscounts(request.query);
      return reply.status(200).send(result);
    },
  );

  typedApp.post(
    "/api/discounts",
    {
      preHandler: requireRole(Role.Admin),
      schema: {
        body: CreateDiscountBodySchema,
        response: {
          201: DiscountSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          422: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const created = await service.createDiscount(request.body);
      return reply.status(201).send(created);
    },
  );

  typedApp.patch(
    "/api/discounts/:id",
    {
      preHandler: requireRole(Role.Admin),
      schema: {
        params: IdParamSchema,
        body: UpdateDiscountBodySchema,
        response: {
          200: DiscountSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          422: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const updated = await service.updateDiscount(
        request.params.id,
        request.body,
      );
      return reply.status(200).send(updated);
    },
  );
}

