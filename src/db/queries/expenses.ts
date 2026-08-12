import { queryOptions, skipToken } from "@tanstack/react-query";
import { and, eq, sql } from "drizzle-orm";
import { AnyDB } from "../dbType";
import { DateTime } from "luxon";
import { accountsTable, timeTable } from "../schema";
import { subqueryColumnName } from "../utils";
import { fullTransactionsQuery, getAccountsClosureQuery, getDomain } from "./global";

export const getExpensesYearlyQuery = async <TDB extends AnyDB>({
  db,
  bookId,
}: {
  db: TDB;
  bookId: string;
}) => {
  const ft = fullTransactionsQuery(db);
  const accounts = getAccountsClosureQuery(db);
  const { min, max } = (await getDomain(db)) as {
    min: DateTime<boolean>;
    max: DateTime<boolean>;
  };
  // Calendar-year span, not a fractional Luxon year-diff: a range like 2023-08 to
  // 2026-07 covers 4 distinct calendar years but is under 3.0 elapsed years, so
  // diffing in ["years"] would silently drop the final (partial) year.
  const yearRange = Array.from(
    { length: max.year - min.year + 1 },
    (_value, index) => min.year + index,
  );

  // timetable.year is stored as TEXT in the DB despite its integer() schema type; a bound
  // numeric parameter compared against it silently matches nothing over the libsql wire
  // protocol, so the column must be cast explicitly rather than relying on SQLite's
  // literal-only type-affinity coercion.
  const yearCol = sql`CAST(${timeTable.year} AS INTEGER)`;

  return db
    .select({
      name: subqueryColumnName<string>(accounts, accounts.base).as("name"),
      id: accounts.parent,
      parentId: accountsTable.parent,
      total: sql<number>`sum(${ft.value})`,
      last: sql<number>`sum(CASE WHEN ${yearCol} = ${max.year} THEN ${ft.value} ELSE 0 END) `,
      ...yearRange.reduce(
        (prev, y) => ({
          ...prev,
          [y.toString()]: sql<number>`sum(CASE WHEN ${yearCol} = ${y} THEN ${ft.value} ELSE 0 END) `,
        }),
        {},
      ),
    })
    .from(accounts)
    .innerJoin(ft, eq(accounts.id, ft.accountId))
    .innerJoin(accountsTable, eq(accountsTable.id, accounts.parent))
    .innerJoin(timeTable, eq(timeTable.ymd, ft.ymdPosted))
    .where(and(eq(ft.bookId, bookId), eq(accountsTable.accountType, "EXPENSE")))
    .groupBy(subqueryColumnName<string>(accounts, accounts.base))
    .orderBy(subqueryColumnName<string>(accounts, accounts.base));
};
export type ExpensesYearlyRow = Awaited<ReturnType<typeof getExpensesYearlyQuery>>[number];

export const yearlyExpensesOptions = <TDB extends AnyDB>({
  db,
  bookId,
}: {
  db: TDB | undefined;
  bookId: string | undefined;
}) => {
  const enabled = !!db && !!bookId;
  return queryOptions({
    queryKey: ["expensesYearly", bookId],
    queryFn: !enabled ? skipToken : async () => await getExpensesYearlyQuery({ db, bookId }),
    enabled: enabled,
  });
};
