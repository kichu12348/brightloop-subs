import type {
  CreateStaffBody,
  UsersQuery,
  PaginatedResponse,
} from "@brightloop/shared";
import { ErrorCode, Role } from "@brightloop/shared";
import { AppError } from "../../errors/appError.ts";
import type { Clock } from "../../lib/clock.ts";
import type { UsersRepository, UserSummaryRecord } from "./repository.ts";

export interface UsersServiceDependencies {
  repository: UsersRepository;
  clock: Clock;
}

export interface UsersService {
  createStaff(data: CreateStaffBody): Promise<UserSummaryRecord>;
  listUsers(query: UsersQuery): Promise<PaginatedResponse<UserSummaryRecord>>;
}

export function createUsersService(
  deps: UsersServiceDependencies,
): UsersService {
  return {
    async createStaff(data: CreateStaffBody): Promise<UserSummaryRecord> {
      const normalizedEmail = data.email.toLowerCase().trim();
      const existing = await deps.repository.findUserByEmail(normalizedEmail);
      if (existing) {
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

      return deps.repository.createUser({
        id: crypto.randomUUID(),
        email: normalizedEmail,
        passwordHash,
        role: Role.Staff,
        name: data.name.trim(),
        createdAt: now,
        updatedAt: now,
      });
    },

    async listUsers(
      query: UsersQuery,
    ): Promise<PaginatedResponse<UserSummaryRecord>> {
      const page = query.page ?? 1;
      const pageSize = Math.min(query.pageSize ?? 20, 100);
      const offset = (page - 1) * pageSize;

      const filter = {
        role: query.role,
        search: query.search?.trim(),
      };

      const [items, total] = await Promise.all([
        deps.repository.findUsers({
          ...filter,
          limit: pageSize,
          offset,
        }),
        deps.repository.countUsers(filter),
      ]);

      return {
        items,
        total,
        page,
        pageSize,
      };
    },
  };
}

