import { getObjByKey } from "@/common/utils";
import config from "@/config.json";
import { SQL, Subquery, sql } from "drizzle-orm";


export const subqueryColumnName = <T>(
  table: Subquery,
  column: SQL.Aliased<T>
) => sql<T> `${sql.identifier(table._.alias)}.${sql.identifier(column.fieldAlias)}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const firstRow = (query: any) => async () => { const data = await query.execute(); return data[0] };

export const getConfig = (user: string|undefined) => {
  if (!user) throw Error('User not defined, cant create query');
  const dbconf = getObjByKey(config.database, user);
  return dbconf;
};

