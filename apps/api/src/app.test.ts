import { describe, expect, it } from "bun:test";
import { buildApp } from "./app.ts";
import { createTestDb } from "./db/client.ts";

describe("API Shell and Health", () => {
  it("responds to /api/health with status ok", async () => {
    const testDb = createTestDb();
    const app = await buildApp({ db: testDb });

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { status: string };
    expect(body.status).toBe("ok");
    await app.close();
  });

  it("returns 401 with standard error format on protected route without auth", async () => {
    const testDb = createTestDb();
    const app = await buildApp({ db: testDb });

    const response = await app.inject({
      method: "GET",
      url: "/api/subscriptions",
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toBe("Authentication required");
    await app.close();
  });
});

