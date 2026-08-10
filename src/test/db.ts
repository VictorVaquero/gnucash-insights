import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import type { AppDatabase } from "@/db/dbType";

const MIGRATION_PATH = resolve(process.cwd(), "drizzle/0000_lumpy_archangel.sql");

/**
 * Creates a fresh in-memory libsql database with the real generated schema
 * (drizzle/0000_lumpy_archangel.sql) applied. Used by query tests so
 * assertions run against actual SQL execution, not mocked Drizzle calls.
 */
export const createTestDb = async (): Promise<AppDatabase> => {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client);

  const migrationSql = readFileSync(MIGRATION_PATH, "utf-8");
  const statements = migrationSql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  await client.batch(statements, "write");

  return db;
};
