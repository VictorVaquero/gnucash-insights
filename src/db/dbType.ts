import { LibSQLDatabase } from "drizzle-orm/libsql";
import { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

// Concrete type: used at the app boundary (state/context/hooks) where a db
// instance is just held and passed along, not used to compose subqueries.
export type AppDatabase = LibSQLDatabase;

// Generic constraint: used by query-builder functions in db/queries/*.ts.
// A plain `AppDatabase` union parameter breaks Drizzle's type inference for
// chained/subquery builders (`.as()`, nested `.select()` composed by another
// function) — TypeScript can't resolve which union member's overloads to use
// partway through a chain. A generic `<TDB extends AnyDB>` parameter keeps a
// single concrete type per call, which Drizzle can infer through correctly,
// while still accepting either driver's db instance at the call site.
export type AnyDB = BaseSQLiteDatabase<
  "sync" | "async",
  unknown,
  Record<string, never>
>;
