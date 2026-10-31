import { describe, expect, it } from "bun:test";
import { buildApp } from "../../app.ts";
import { createTestDb } from "../../db/client.ts";
import { TestClock } from "../../lib/clock.ts";
import { InMemoryMailer } from "../../lib/mailer.ts";
import { Role } from "@brightloop/shared";

describe("Auth and Staff Management", () => {
  it("enforces password complexity and rejects weak passwords with 400", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(1700000000000);
    const mailer = new InMemoryMailer();
    const app = await buildApp({ db: testDb, clock, mailer });

    const tooShortResponse = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: {
        name: "Short Pass",
        email: "short@test.com",
        password: "Ab1!",
      },
    });
    expect(tooShortResponse.statusCode).toBe(400);

    const noUpperResponse = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: {
        name: "No Upper",
        email: "noupper@test.com",
        password: "lowercase123!",
      },
    });
    expect(noUpperResponse.statusCode).toBe(400);

    const noLowerResponse = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: {
        name: "No Lower",
        email: "nolower@test.com",
        password: "UPPERCASE123!",
      },
    });
    expect(noLowerResponse.statusCode).toBe(400);

    const noSpecialResponse = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: {
        name: "No Special",
        email: "nospecial@test.com",
        password: "NoSpecialChar123",
      },
    });
    expect(noSpecialResponse.statusCode).toBe(400);

    const validResponse = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: {
        name: "Valid User",
        email: "valid@test.com",
        password: "ValidPass123!",
      },
    });
    expect(validResponse.statusCode).toBe(201);
    const validBody = JSON.parse(validResponse.body) as {
      token: string;
      user: { id: string; name: string; email: string; role: string };
    };
    expect(validBody.token).toBeDefined();
    expect(validBody.user.email).toBe("valid@test.com");
    expect(validBody.user.role).toBe(Role.Customer);

    await app.close();
  });

  it("enforces unique email on signup with 409", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(1700000000000);
    const mailer = new InMemoryMailer();
    const app = await buildApp({ db: testDb, clock, mailer });

    const firstResponse = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: {
        name: "First User",
        email: "duplicate@test.com",
        password: "Password123!",
      },
    });
    expect(firstResponse.statusCode).toBe(201);

    const secondResponse = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: {
        name: "Second User",
        email: "DUPLICATE@test.com",
        password: "Password123!",
      },
    });
    expect(secondResponse.statusCode).toBe(409);
    const body = JSON.parse(secondResponse.body) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("CONFLICT");

    await app.close();
  });

  it("handles login and authenticated /api/auth/me", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(1700000000000);
    const mailer = new InMemoryMailer();
    const app = await buildApp({ db: testDb, clock, mailer });

    await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: {
        name: "Login User",
        email: "login@test.com",
        password: "LoginPass123!",
      },
    });

    const badPasswordResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "login@test.com",
        password: "WrongPassword123!",
      },
    });
    expect(badPasswordResponse.statusCode).toBe(401);

    const successLoginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "login@test.com",
        password: "LoginPass123!",
      },
    });
    expect(successLoginResponse.statusCode).toBe(200);
    const loginBody = JSON.parse(successLoginResponse.body) as {
      token: string;
      user: { id: string; email: string };
    };

    const meResponse = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        authorization: `Bearer ${loginBody.token}`,
      },
    });
    expect(meResponse.statusCode).toBe(200);
    const meBody = JSON.parse(meResponse.body) as {
      id: string;
      name: string;
      email: string;
      role: string;
    };
    expect(meBody.id).toBe(loginBody.user.id);
    expect(meBody.email).toBe("login@test.com");

    await app.close();
  });

  it("completes full forgot-password and reset-password flow", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(1700000000000);
    const mailer = new InMemoryMailer();
    const app = await buildApp({ db: testDb, clock, mailer });

    await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: {
        name: "Reset User",
        email: "reset@test.com",
        password: "InitialPassword123!",
      },
    });

    const unknownEmailResponse = await app.inject({
      method: "POST",
      url: "/api/auth/forgot-password",
      payload: {
        email: "nonexistent@test.com",
      },
    });
    expect(unknownEmailResponse.statusCode).toBe(200);
    expect(mailer.sentEmails).toHaveLength(0);

    const forgotResponse = await app.inject({
      method: "POST",
      url: "/api/auth/forgot-password",
      payload: {
        email: "reset@test.com",
      },
    });
    expect(forgotResponse.statusCode).toBe(200);
    expect(mailer.sentEmails).toHaveLength(1);

    const sent = mailer.sentEmails[0];
    if (!sent) {
      throw new Error("No email was sent");
    }
    expect(sent.email).toBe("reset@test.com");
    const rawToken = sent.rawToken;

    const resetResponse = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: {
        token: rawToken,
        newPassword: "BrandNewPassword123!",
      },
    });
    expect(resetResponse.statusCode).toBe(200);

    const oldLoginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "reset@test.com",
        password: "InitialPassword123!",
      },
    });
    expect(oldLoginResponse.statusCode).toBe(401);

    const newLoginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "reset@test.com",
        password: "BrandNewPassword123!",
      },
    });
    expect(newLoginResponse.statusCode).toBe(200);

    const reuseResponse = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: {
        token: rawToken,
        newPassword: "AnotherPassword123!",
      },
    });
    expect(reuseResponse.statusCode).toBe(400);

    await app.close();
  });

  it("rejects expired reset token when advancing clock by 31 minutes", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(1700000000000);
    const mailer = new InMemoryMailer();
    const app = await buildApp({ db: testDb, clock, mailer });

    await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: {
        name: "Expiry User",
        email: "expiry@test.com",
        password: "InitialPass123!",
      },
    });

    await app.inject({
      method: "POST",
      url: "/api/auth/forgot-password",
      payload: {
        email: "expiry@test.com",
      },
    });
    expect(mailer.sentEmails).toHaveLength(1);
    const sent = mailer.sentEmails[0];
    if (!sent) {
      throw new Error("No email was sent");
    }

    clock.advanceMs(31 * 60 * 1000);

    const expiredResetResponse = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: {
        token: sent.rawToken,
        newPassword: "AfterExpiryPass123!",
      },
    });
    expect(expiredResetResponse.statusCode).toBe(400);

    await app.close();
  });

  it("enforces role guards on POST /api/users/staff: only Admin can create Staff", async () => {
    const testDb = createTestDb();
    const clock = new TestClock(1700000000000);
    const mailer = new InMemoryMailer();
    const app = await buildApp({ db: testDb, clock, mailer });

    const adminToken = app.jwt.sign({
      id: "admin-id",
      email: "admin@brightloop.com",
      role: Role.Admin,
    });
    const staffToken = app.jwt.sign({
      id: "staff-id",
      email: "staff@brightloop.com",
      role: Role.Staff,
    });
    const customerToken = app.jwt.sign({
      id: "customer-id",
      email: "cust@brightloop.com",
      role: Role.Customer,
    });

    const unauthResponse = await app.inject({
      method: "POST",
      url: "/api/users/staff",
      payload: {
        name: "Staff 1",
        email: "staff1@brightloop.com",
        password: "StaffPass123!",
      },
    });
    expect(unauthResponse.statusCode).toBe(401);

    const customerResponse = await app.inject({
      method: "POST",
      url: "/api/users/staff",
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
      payload: {
        name: "Staff 2",
        email: "staff2@brightloop.com",
        password: "StaffPass123!",
      },
    });
    expect(customerResponse.statusCode).toBe(403);

    const staffResponse = await app.inject({
      method: "POST",
      url: "/api/users/staff",
      headers: {
        authorization: `Bearer ${staffToken}`,
      },
      payload: {
        name: "Staff 3",
        email: "staff3@brightloop.com",
        password: "StaffPass123!",
      },
    });
    expect(staffResponse.statusCode).toBe(403);

    const adminResponse = await app.inject({
      method: "POST",
      url: "/api/users/staff",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: "New Staff",
        email: "newstaff@brightloop.com",
        password: "StaffPass123!",
      },
    });
    expect(adminResponse.statusCode).toBe(201);
    const adminBody = JSON.parse(adminResponse.body) as {
      id: string;
      email: string;
      role: string;
    };
    expect(adminBody.email).toBe("newstaff@brightloop.com");
    expect(adminBody.role).toBe(Role.Staff);

    const listUsersResponse = await app.inject({
      method: "GET",
      url: "/api/users?role=staff",
      headers: {
        authorization: `Bearer ${staffToken}`,
      },
    });
    expect(listUsersResponse.statusCode).toBe(200);
    const listBody = JSON.parse(listUsersResponse.body) as {
      items: Array<{ email: string; role: string }>;
      total: number;
    };
    expect(listBody.total).toBe(1);
    expect(listBody.items[0]?.email).toBe("newstaff@brightloop.com");

    await app.close();
  });
});

