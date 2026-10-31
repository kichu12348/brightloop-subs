import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  TransitionInvoiceBodySchema,
  RecordPaymentBodySchema,
  InvoiceSummarySchema,
  InvoiceDetailSchema,
  PaymentDetailSchema,
  InvoiceListQuerySchema,
  IdParamSchema,
  ErrorResponseSchema,
  createPaginatedResponseSchema,
  Role,
} from "@brightloop/shared";
import { requireRole } from "../../app.ts";
import type { InvoicesService } from "./service.ts";

export interface InvoicesRoutesOptions {
  service: InvoicesService;
}

export async function invoiceRoutes(
  app: FastifyInstance,
  options: InvoicesRoutesOptions,
): Promise<void> {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = options.service;

  typedApp.get(
    "/api/invoices",
    {
      schema: {
        querystring: InvoiceListQuerySchema,
        response: {
          200: createPaginatedResponseSchema(InvoiceSummarySchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user;
      const result = await service.listInvoices(
        request.query,
        user.role,
        user.id,
      );
      return reply.status(200).send(result);
    },
  );

  typedApp.get(
    "/api/invoices/:id",
    {
      schema: {
        params: IdParamSchema,
        response: {
          200: InvoiceDetailSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user;
      const invoice = await service.getInvoiceById(
        request.params.id,
        user.role,
        user.id,
      );
      return reply.status(200).send(invoice);
    },
  );

  typedApp.post(
    "/api/invoices/:id/transition",
    {
      preHandler: requireRole(Role.Admin, Role.Staff),
      schema: {
        params: IdParamSchema,
        body: TransitionInvoiceBodySchema,
        response: {
          200: InvoiceDetailSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const updated = await service.transitionInvoice(
        request.params.id,
        request.body.status,
      );
      return reply.status(200).send(updated);
    },
  );

  typedApp.post(
    "/api/invoices/:id/payments",
    {
      schema: {
        params: IdParamSchema,
        body: RecordPaymentBodySchema,
        response: {
          201: PaymentDetailSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
          422: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user;
      const payment = await service.recordPayment(
        request.params.id,
        request.body,
        user.role,
        user.id,
      );
      return reply.status(201).send(payment);
    },
  );
}

