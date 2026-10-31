import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  CreateTaxBodySchema,
  UpdateTaxBodySchema,
  TaxSchema,
  PaginationQuerySchema,
  createPaginatedResponseSchema,
  IdParamSchema,
  ErrorResponseSchema,
  Role,
} from "@brightloop/shared";
import { requireRole } from "../../app.ts";
import type { TaxesService } from "./service.ts";

export interface TaxesRoutesOptions {
  service: TaxesService;
}

export async function taxRoutes(
  app: FastifyInstance,
  options: TaxesRoutesOptions,
): Promise<void> {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = options.service;

  typedApp.get(
    "/api/taxes",
    {
      schema: {
        querystring: PaginationQuerySchema,
        response: {
          200: createPaginatedResponseSchema(TaxSchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await service.listTaxes(request.query);
      return reply.status(200).send(result);
    },
  );

  typedApp.post(
    "/api/taxes",
    {
      preHandler: requireRole(Role.Admin),
      schema: {
        body: CreateTaxBodySchema,
        response: {
          201: TaxSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const created = await service.createTax(request.body);
      return reply.status(201).send(created);
    },
  );

  typedApp.patch(
    "/api/taxes/:id",
    {
      preHandler: requireRole(Role.Admin),
      schema: {
        params: IdParamSchema,
        body: UpdateTaxBodySchema,
        response: {
          200: TaxSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const updated = await service.updateTax(
        request.params.id,
        request.body,
      );
      return reply.status(200).send(updated);
    },
  );
}

