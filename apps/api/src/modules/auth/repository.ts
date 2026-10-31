import { eq, and, isNull } from "drizzle-orm";
import type { AppDatabase } from "../../db/client.ts";
import { users, passwordResetTokens } from "../../db/schema.ts";
import { Role } from "@brightloop/shared";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  name: string;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: number;
  usedAt: number | null;
  createdAt: number;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createCustomerUser(data: {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    createdAt: number;
    updatedAt: number;
  }): Promise<UserRecord>;
  createResetToken(data: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: number;
    createdAt: number;
  }): Promise<void>;
  findResetTokenByHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenRecord | null>;
  resetPassword(data: {
    userId: string;
    tokenId: string;
    newPasswordHash: string;
    usedAt: number;
    updatedAt: number;
  }): Promise<void>;
}

function parseRole(role: string): Role {
  if (role === Role.Admin || role === Role.Staff || role === Role.Customer) {
    return role;
  }
  throw new Error(`Invalid role in database: ${role}`);
}

export function createSqliteAuthRepository(
  database: AppDatabase,
): AuthRepository {
  return {
    async findUserByEmail(email: string): Promise<UserRecord | null> {
      const row = database
        .select()
        .from(users)
        .where(eq(users.email, email))
        .get();
      if (!row) {
        return null;
      }
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.passwordHash,
        role: parseRole(row.role),
        name: row.name,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        archivedAt: row.archivedAt,
      };
    },

    async findUserById(id: string): Promise<UserRecord | null> {
      const row = database
        .select()
        .from(users)
        .where(and(eq(users.id, id), isNull(users.archivedAt)))
        .get();
      if (!row) {
        return null;
      }
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.passwordHash,
        role: parseRole(row.role),
        name: row.name,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        archivedAt: row.archivedAt,
      };
    },

    async createCustomerUser(data: {
      id: string;
      email: string;
      passwordHash: string;
      name: string;
      createdAt: number;
      updatedAt: number;
    }): Promise<UserRecord> {
      const inserted = database
        .insert(users)
        .values({
          id: data.id,
          email: data.email,
          passwordHash: data.passwordHash,
          role: Role.Customer,
          name: data.name,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
        .returning()
        .get();
      return {
        id: inserted.id,
        email: inserted.email,
        passwordHash: inserted.passwordHash,
        role: parseRole(inserted.role),
        name: inserted.name,
        createdAt: inserted.createdAt,
        updatedAt: inserted.updatedAt,
        archivedAt: inserted.archivedAt,
      };
    },

    async createResetToken(data: {
      id: string;
      userId: string;
      tokenHash: string;
      expiresAt: number;
      createdAt: number;
    }): Promise<void> {
      database
        .insert(passwordResetTokens)
        .values({
          id: data.id,
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          createdAt: data.createdAt,
        })
        .run();
    },

    async findResetTokenByHash(
      tokenHash: string,
    ): Promise<PasswordResetTokenRecord | null> {
      const row = database
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.tokenHash, tokenHash))
        .get();
      return row ?? null;
    },

    async resetPassword(data: {
      userId: string;
      tokenId: string;
      newPasswordHash: string;
      usedAt: number;
      updatedAt: number;
    }): Promise<void> {
      database.transaction((tx) => {
        tx.update(users)
          .set({
            passwordHash: data.newPasswordHash,
            updatedAt: data.updatedAt,
          })
          .where(eq(users.id, data.userId))
          .run();
        tx.update(passwordResetTokens)
          .set({ usedAt: data.usedAt })
          .where(eq(passwordResetTokens.id, data.tokenId))
          .run();
      });
    },
  };
}

