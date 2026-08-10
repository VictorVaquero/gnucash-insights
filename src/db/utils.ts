import { AccountConfig } from "@/services/tursoService";
import { SQL, Subquery, sql } from "drizzle-orm";

export const subqueryColumnName = <T>(table: Subquery, column: SQL.Aliased<T>) =>
  sql<T>`${sql.identifier(table._.alias)}.${sql.identifier(column.fieldAlias)}`;

// Populated by useSetupDB (src/hooks/useDB.tsx) as soon as each user's
// /api/turso-token response arrives — the account-GUID mapping is no longer
// file-based config, it's a runtime API response (data-model.md entity 2).
const accountConfigByUser = new Map<string, AccountConfig>();

export const setAccountConfig = (user: string, accountConfig: AccountConfig) => {
  accountConfigByUser.set(user, accountConfig);
};

export const getConfig = (user: string | undefined): AccountConfig => {
  if (!user) throw Error("User not defined, cant create query");
  const dbconf = accountConfigByUser.get(user);
  if (!dbconf) throw Error(`Account config not yet loaded for user ${user}`);
  return dbconf;
};
