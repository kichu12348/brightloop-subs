import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import {
  CreateQuotationTemplateBodySchema,
  QuotationTemplateDetailSchema,
  PaginationQuerySchema,
  createPaginatedResponseSchema,
  IdParamSchema,
  ErrorResponseSchema,
  Role,
} from "@brightloop/shared";
import { requireRole } from "../../app.ts";
import type { QuotationTemplatesService } from "./service.ts";

export interface QuotationTemplatesRoutesOptions {
  service: QuotationTemplatesService;
}

export async function quotationTemplateRoutes(
  app: FastifyInstance,
  options: QuotationTemplatesRoutesOptions,
): Promise<void> {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = options.service;

  typedApp.get(
    "/api/quotation-templates",
    {
      preHandler: requireRole(Role.Admin, Role.Staff),
      schema: {
        querystring: PaginationQuerySchema,
        response: {
          200: createPaginatedResponseSchema(QuotationTemplateDetailSchema),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await service.listTemplates(request.query);
      return reply.status(200).send(result);
    },
  );

  typedApp.get(
    "/api/quotation-templates/:id",
    {
      preHandler: requireRole(Role.Admin, Role.Staff),
      schema: {
        params: IdParamSchema,
        response: {
          200: QuotationTemplateDetailSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const template = await service.getTemplateById(request.params.id);
      return reply.status(200).send(template);
    },
  );

  typedApp.post(
    "/api/quotation-templates",
    {
      preHandler: requireRole(Role.Admin, Role.Staff),
      schema: {
        body: CreateQuotationTemplateBodySchema,
        response: {
          201: QuotationTemplateDetailSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const created = await service.createTemplate(request.body);
      return reply.status(201).send(created);
    },
  );

  typedApp.delete(
    "/api/quotation-templates/:id",
    {
      preHandler: requireRole(Role.Admin, Role.Staff),
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
      await service.deleteTemplate(request.params.id);
      return reply.status(204).send(null);
    },
  );
}

