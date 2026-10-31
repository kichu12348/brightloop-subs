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
import { createContainer, type AppDependencies, type AppContainer } from "./container.ts";
import { authRoutes } from "./modules/auth/index.ts";
import { usersRoutes } from "./modules/users/index.ts";
import { productRoutes } from "./modules/products/index.ts";
import { planRoutes } from "./modules/plans/index.ts";
import { taxRoutes } from "./modules/taxes/index.ts";
import { discountRoutes } from "./modules/discounts/index.ts";
import { quotationTemplateRoutes } from "./modules/quotationTemplates/index.ts";
import { subscriptionRoutes } from "./modules/subscriptions/index.ts";
import { billingRoutes } from "./modules/billing/index.ts";
import { invoiceRoutes } from "./modules/invoices/index.ts";
import { dashboardRoutes } from "./modules/dashboard/index.ts";

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

declare module "fastify" {
  interface FastifyInstance {
    container: AppContainer;
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
  const container = createContainer(depsOverrides);

  const app = Fastify({
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  app.decorate("container", container);

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

  await authRoutes(app, { service: container.authService });
  await usersRoutes(app, { service: container.usersService });
  await productRoutes(app, { service: container.productsService });
  await planRoutes(app, { service: container.plansService });
  await taxRoutes(app, { service: container.taxesService });
  await discountRoutes(app, { service: container.discountsService });
  await quotationTemplateRoutes(app, {
    service: container.quotationTemplatesService,
  });
  await subscriptionRoutes(app, {
    service: container.subscriptionsService,
  });
  await billingRoutes(app, {
    service: container.billingService,
  });
  await invoiceRoutes(app, {
    service: container.invoicesService,
  });
  await dashboardRoutes(app, {
    service: container.dashboardService,
  });

  return app;
}
