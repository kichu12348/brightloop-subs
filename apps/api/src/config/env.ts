import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export const EnvSchema = Type.Object({
  PORT: Type.Integer({ minimum: 1, maximum: 65535, default: 3000 }),
  DATABASE_URL: Type.String({ minLength: 1, default: "brightloop.db" }),
  JWT_SECRET: Type.String({ minLength: 32 }),
  CORS_ORIGIN: Type.String({ minLength: 1, default: "http://localhost:5173" }),
});

export type Env = Static<typeof EnvSchema>;

function loadEnv(): Env {
  const rawPort = process.env["PORT"];
  const parsedPort = rawPort !== undefined ? parseInt(rawPort, 10) : 3000;

  const candidate = {
    PORT: Number.isNaN(parsedPort) ? 3000 : parsedPort,
    DATABASE_URL: process.env["DATABASE_URL"] ?? "brightloop.db",
    JWT_SECRET:
      process.env["JWT_SECRET"] ??
      "brightloop-secret-key-at-least-32-characters-long",
    CORS_ORIGIN: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
  };

  if (!Value.Check(EnvSchema, candidate)) {
    const errors = [...Value.Errors(EnvSchema, candidate)];
    const message = errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    throw new Error(`Invalid environment variables: ${message}`);
  }

  return candidate;
}

export const env = loadEnv();

