import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema.ts";
import { env } from "../config/env.ts";

export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>;

function configurePragmas(sqlite: Database): void {
  sqlite.run("PRAGMA journal_mode = WAL;");
  sqlite.run("PRAGMA synchronous = NORMAL;");
  sqlite.run("PRAGMA foreign_keys = ON;");
}

function initializeDatabase(filePath: string): AppDatabase {
  const sqlite = new Database(filePath);
  configurePragmas(sqlite);
  sqlite.run(schema.SCHEMA_DDL);
  return drizzle(sqlite, { schema });
}

export const db: AppDatabase = initializeDatabase(env.DATABASE_URL);

export function createTestDb(): AppDatabase {
  const testSqlite = new Database(":memory:");
  configurePragmas(testSqlite);
  testSqlite.run(schema.SCHEMA_DDL);
  return drizzle(testSqlite, { schema });
}
