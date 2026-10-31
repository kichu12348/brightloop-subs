import { createHash } from "node:crypto";
import type {
  SignupBody,
  LoginBody,
  ResetPasswordBody,
} from "@brightloop/shared";
import { ErrorCode } from "@brightloop/shared";
import { AppError } from "../../errors/appError.ts";
import type { Clock } from "../../lib/clock.ts";
import type { Mailer } from "../../lib/mailer.ts";
import type { AuthRepository, UserRecord } from "./repository.ts";

export interface AuthServiceDependencies {
  repository: AuthRepository;
  clock: Clock;
  mailer: Mailer;
}

export interface AuthService {
  signup(data: SignupBody): Promise<UserRecord>;
  login(data: LoginBody): Promise<UserRecord>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(data: ResetPasswordBody): Promise<void>;
  getCurrentUser(userId: string): Promise<UserRecord>;
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createAuthService(
  deps: AuthServiceDependencies,
): AuthService {
  return {
    async signup(data: SignupBody): Promise<UserRecord> {
      const normalizedEmail = data.email.toLowerCase().trim();
      const existingUser =
        await deps.repository.findUserByEmail(normalizedEmail);
      if (existingUser) {
        throw new AppError(
          ErrorCode.Conflict,
          "Email already registered",
          409,
        );
      }

      const passwordHash = await Bun.password.hash(data.password, {
        algorithm: "argon2id",
      });
      const now = deps.clock.nowMs();

      return deps.repository.createCustomerUser({
        id: crypto.randomUUID(),
        email: normalizedEmail,
        passwordHash,
        name: data.name.trim(),
        createdAt: now,
        updatedAt: now,
      });
    },

    async login(data: LoginBody): Promise<UserRecord> {
      const normalizedEmail = data.email.toLowerCase().trim();
      const user = await deps.repository.findUserByEmail(normalizedEmail);
      if (!user || user.archivedAt !== null) {
        throw new AppError(ErrorCode.Unauthorized, "Invalid credentials", 401);
      }

      const isPasswordValid = await Bun.password.verify(
        data.password,
        user.passwordHash,
      );
      if (!isPasswordValid) {
        throw new AppError(ErrorCode.Unauthorized, "Invalid credentials", 401);
      }

      return user;
    },

    async forgotPassword(email: string): Promise<void> {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await deps.repository.findUserByEmail(normalizedEmail);
      if (user && user.archivedAt === null) {
        const rawToken = crypto.randomUUID();
        const tokenHash = hashToken(rawToken);
        const now = deps.clock.nowMs();
        const expiresAt = now + 30 * 60 * 1000;

        await deps.repository.createResetToken({
          id: crypto.randomUUID(),
          userId: user.id,
          tokenHash,
          expiresAt,
          createdAt: now,
        });

        await deps.mailer.sendPasswordResetEmail(user.email, rawToken);
      }
    },

    async resetPassword(data: ResetPasswordBody): Promise<void> {
      const tokenHash = hashToken(data.token);
      const resetToken =
        await deps.repository.findResetTokenByHash(tokenHash);
      const now = deps.clock.nowMs();

      if (
        !resetToken ||
        resetToken.usedAt !== null ||
        resetToken.expiresAt <= now
      ) {
        throw new AppError(
          ErrorCode.ValidationError,
          "Invalid or expired reset token",
          400,
        );
      }

      const newPasswordHash = await Bun.password.hash(data.newPassword, {
        algorithm: "argon2id",
      });

      await deps.repository.resetPassword({
        userId: resetToken.userId,
        tokenId: resetToken.id,
        newPasswordHash,
        usedAt: now,
        updatedAt: now,
      });
    },

    async getCurrentUser(userId: string): Promise<UserRecord> {
      const user = await deps.repository.findUserById(userId);
      if (!user || user.archivedAt !== null) {
        throw new AppError(ErrorCode.NotFound, "User not found", 404);
      }
      return user;
    },
  };
}

