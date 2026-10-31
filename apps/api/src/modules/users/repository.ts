import { eq, and, isNull, like, or, count, desc, type SQL } from "drizzle-orm";
import type { AppDatabase } from "../../db/client.ts";
import { users } from "../../db/schema.ts";
import { Role } from "@brightloop/shared";

export interface UserSummaryRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: number;
}

export interface ListUsersFilter {
  role?: Role | undefined;
  search?: string | undefined;
  limit: number;
  offset: number;
}

export interface UsersRepository {
  findUserById(id: string): Promise<UserSummaryRecord | null>;
  findUserByEmail(email: string): Promise<UserSummaryRecord | null>;
  createUser(data: {
    id: string;
    email: string;
    passwordHash: string;
    role: Role;
    name: string;
    createdAt: number;
    updatedAt: number;
  }): Promise<UserSummaryRecord>;
  findUsers(filter: ListUsersFilter): Promise<UserSummaryRecord[]>;
  countUsers(
    filter: Omit<ListUsersFilter, "limit" | "offset">,
  ): Promise<number>;
}

function parseRole(role: string): Role {
  if (role === Role.Admin || role === Role.Staff || role === Role.Customer) {
    return role;
  }
  throw new Error(`Invalid role in database: ${role}`);
}

function buildWhereConditions(
  filter: Omit<ListUsersFilter, "limit" | "offset">,
): SQL<unknown>[] {
  const conditions: SQL<unknown>[] = [isNull(users.archivedAt)];
  if (filter.role) {
    conditions.push(eq(users.role, filter.role));
  }
  if (filter.search) {
    const pattern = `%${filter.search}%`;
    const searchCondition = or(
      like(users.name, pattern),
      like(users.email, pattern),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }
  return conditions;
}

export function createSqliteUsersRepository(
  database: AppDatabase,
): UsersRepository {
  return {
    async findUserById(id: string): Promise<UserSummaryRecord | null> {
      const row = database
        .select()
        .from(users)
        .where(eq(users.id, id))
        .get();
      if (!row) {
        return null;
      }
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: parseRole(row.role),
        createdAt: row.createdAt,
      };
    },

    async findUserByEmail(email: string): Promise<UserSummaryRecord | null> {
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
        name: row.name,
        email: row.email,
        role: parseRole(row.role),
        createdAt: row.createdAt,
      };
    },

    async createUser(data: {
      id: string;
      email: string;
      passwordHash: string;
      role: Role;
      name: string;
      createdAt: number;
      updatedAt: number;
    }): Promise<UserSummaryRecord> {
      const inserted = database
        .insert(users)
        .values({
          id: data.id,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role,
          name: data.name,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
        .returning()
        .get();
      return {
        id: inserted.id,
        name: inserted.name,
        email: inserted.email,
        role: parseRole(inserted.role),
        createdAt: inserted.createdAt,
      };
    },

    async findUsers(filter: ListUsersFilter): Promise<UserSummaryRecord[]> {
      const conditions = buildWhereConditions(filter);

      const rows = database
        .select()
        .from(users)
        .where(and(...conditions))
        .orderBy(desc(users.createdAt))
        .limit(filter.limit)
        .offset(filter.offset)
        .all();

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: parseRole(row.role),
        createdAt: row.createdAt,
      }));
    },

    async countUsers(
      filter: Omit<ListUsersFilter, "limit" | "offset">,
    ): Promise<number> {
      const conditions = buildWhereConditions(filter);

      const result = database
        .select({ total: count() })
        .from(users)
        .where(and(...conditions))
        .get();

      return result?.total ?? 0;
    },
  };
}
