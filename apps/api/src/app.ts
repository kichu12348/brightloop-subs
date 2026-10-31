import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
} from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { Type } from "@sinclair/typebox";
import { env } from "./config/env.ts";
import { AppError } from "./errors/appError.ts";
import { ErrorCode, type Role } from "@brightloop/shared";
import { createContainer, type AppDependencies } from "./container.ts";

export interface TokenPayload {
  id: string;
  role: Role;
  email: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: TokenPayload;
    user: TokenPayload;
  }
}

const PUBLIC_ROUTES = new Set([
  "/api/health",
  "/api/auth/signup",
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
]);

export function requireRole(...allowedRoles: readonly Role[]) {
  return async function rolePreHandler(request: FastifyRequest): Promise<void> {
    const user = request.user;
    if (!user || !allowedRoles.includes(user.role)) {
      throw new AppError(ErrorCode.Forbidden, "Forbidden", 403);
    }
  };
}

export async function buildApp(
  depsOverrides: Partial<AppDependencies> = {},
): Promise<FastifyInstance> {
  const _container = createContainer(depsOverrides);

  const app = Fastify({
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  app.addHook("onRequest", async (request, _reply) => {
    const urlPath = request.url.split("?")[0] ?? "";
    if (PUBLIC_ROUTES.has(urlPath)) {
      return;
    }
    if (!urlPath.startsWith("/api")) {
      return;
    }
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError(ErrorCode.Unauthorized, "Authentication required", 401);
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    const errorRecord =
      typeof error === "object" && error !== null
        ? (error as Record<string, unknown>)
        : null;

    if (errorRecord && "validation" in errorRecord && errorRecord["validation"]) {
      const message =
        typeof errorRecord["message"] === "string"
          ? errorRecord["message"]
          : "Validation error";
      return reply.status(400).send({
        error: {
          code: ErrorCode.ValidationError,
          message,
        },
      });
    }

    if (errorRecord && errorRecord["statusCode"] === 401) {
      return reply.status(401).send({
        error: {
          code: ErrorCode.Unauthorized,
          message: "Unauthorized",
        },
      });
    }

    if (errorRecord && errorRecord["statusCode"] === 403) {
      return reply.status(403).send({
        error: {
          code: ErrorCode.Forbidden,
          message: "Forbidden",
        },
      });
    }

    return reply.status(500).send({
      error: {
        code: ErrorCode.InternalError,
        message: "Internal server error",
      },
    });
  });

  app.get(
    "/api/health",
    {
      schema: {
        response: {
          200: Type.Object(
            {
              status: Type.Literal("ok"),
            },
            { additionalProperties: false },
          ),
        },
      },
    },
    async () => {
      return { status: "ok" as const };
    },
  );

  return app;
}
