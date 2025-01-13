import { Subquery, SQL, sql } from "drizzle-orm";


export const subqueryColumnName = <T>(
  table: Subquery,
  column: SQL.Aliased<T>
) => sql<T> `${sql.identifier(table._.alias)}.${sql.identifier(column.fieldAlias)}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const firstRow = (query: any)=> async ()=> {const data = await query.execute(); return data[0]}