import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  CreateStaffBodySchema,
  UserSummarySchema,
  UsersQuerySchema,
  createPaginatedResponseSchema,
  ErrorResponseSchema,
  Role,
} from "@brightloop/shared";
import { requireRole } from "../../app.ts";
import type { UsersService } from "./service.ts";

export interface UsersRoutesOptions {
  service: UsersService;
}

export async function usersRoutes(
  app: FastifyInstance,
  options: UsersRoutesOptions,
): Promise<void> {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = options.service;

  typedApp.post(
    "/api/users/staff",
    {
      preHandler: requireRole(Role.Admin),
      schema: {
        body: CreateStaffBodySchema,
        response: {
          201: UserSummarySchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await service.createStaff(request.body);
      return reply.status(201).send(user);
    },
  );

  typedApp.get(
    "/api/users",
    {
      preHandler: requireRole(Role.Admin, Role.Staff),
      schema: {
        querystring: UsersQuerySchema,
        response: {
          200: createPaginatedResponseSchema(UserSummarySchema),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await service.listUsers(request.query);
      return reply.status(200).send(result);
    },
  );
}

