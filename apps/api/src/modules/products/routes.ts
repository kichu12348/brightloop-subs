import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import {
  CreateProductBodySchema,
  UpdateProductBodySchema,
  ProductDetailSchema,
  PaginationQuerySchema,
  createPaginatedResponseSchema,
  IdParamSchema,
  ErrorResponseSchema,
  Role,
} from "@brightloop/shared";
import { requireRole } from "../../app.ts";
import type { ProductsService } from "./service.ts";

export interface ProductsRoutesOptions {
  service: ProductsService;
}

export async function productRoutes(
  app: FastifyInstance,
  options: ProductsRoutesOptions,
): Promise<void> {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = options.service;

  typedApp.get(
    "/api/products",
    {
      schema: {
        querystring: PaginationQuerySchema,
        response: {
          200: createPaginatedResponseSchema(ProductDetailSchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await service.listProducts(request.query);
      return reply.status(200).send(result);
    },
  );

  typedApp.get(
    "/api/products/:id",
    {
      schema: {
        params: IdParamSchema,
        response: {
          200: ProductDetailSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const product = await service.getProductById(request.params.id);
      return reply.status(200).send(product);
    },
  );

  typedApp.post(
    "/api/products",
    {
      preHandler: requireRole(Role.Admin),
      schema: {
        body: CreateProductBodySchema,
        response: {
          201: ProductDetailSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const created = await service.createProduct(request.body);
      return reply.status(201).send(created);
    },
  );

  typedApp.patch(
    "/api/products/:id",
    {
      preHandler: requireRole(Role.Admin),
      schema: {
        params: IdParamSchema,
        body: UpdateProductBodySchema,
        response: {
          200: ProductDetailSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const updated = await service.updateProduct(
        request.params.id,
        request.body,
      );
      return reply.status(200).send(updated);
    },
  );

  typedApp.delete(
    "/api/products/:id",
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
      await service.deleteProduct(request.params.id);
      return reply.status(204).send(null);
    },
  );
}

