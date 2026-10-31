import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  SignupBodySchema,
  LoginBodySchema,
  AuthResponseSchema,
  ForgotPasswordBodySchema,
  ForgotPasswordResponseSchema,
  ResetPasswordBodySchema,
  MessageResponseSchema,
  UserSummarySchema,
  ErrorResponseSchema,
} from "@brightloop/shared";
import type { AuthService } from "./service.ts";

export interface AuthRoutesOptions {
  service: AuthService;
}

export async function authRoutes(
  app: FastifyInstance,
  options: AuthRoutesOptions,
): Promise<void> {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();
  const service = options.service;

  typedApp.post(
    "/api/auth/signup",
    {
      schema: {
        body: SignupBodySchema,
        response: {
          201: AuthResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await service.signup(request.body);
      const token = app.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      return reply.status(201).send({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    },
  );

  typedApp.post(
    "/api/auth/login",
    {
      schema: {
        body: LoginBodySchema,
        response: {
          200: AuthResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await service.login(request.body);
      const token = app.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      return reply.status(200).send({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    },
  );

  typedApp.post(
    "/api/auth/forgot-password",
    {
      schema: {
        body: ForgotPasswordBodySchema,
        response: {
          200: ForgotPasswordResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await service.forgotPassword(request.body.email);
      return reply.status(200).send({
        message: "If that email is registered, a reset link has been sent.",
      });
    },
  );

  typedApp.post(
    "/api/auth/reset-password",
    {
      schema: {
        body: ResetPasswordBodySchema,
        response: {
          200: MessageResponseSchema,
          400: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await service.resetPassword(request.body);
      return reply.status(200).send({
        message: "Password reset successful",
      });
    },
  );

  typedApp.get(
    "/api/auth/me",
    {
      schema: {
        response: {
          200: UserSummarySchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await service.getCurrentUser(request.user.id);
      return reply.status(200).send({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      });
    },
  );
}

