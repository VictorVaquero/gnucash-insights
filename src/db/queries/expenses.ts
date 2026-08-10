import { queryOptions, skipToken } from "@tanstack/react-query";
import { and, eq, sql } from "drizzle-orm";
import { AnyDB } from "../dbType";
import { DateTime } from "luxon";
import { accountsTable, timeTable } from "../schema";
import { subqueryColumnName } from "../utils";
import { fullTransactionsQuery, getAccountsClosureQuery, getDomain } from "./global";

const getExpensesYearlyQuery = async <TDB extends AnyDB>({
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
  const yearRange = Array.from(
    { length: max.diff(min, ["years"]).years + 1 },
    (_value, index) => min.year + index,
  );

  return db
    .select({
      name: subqueryColumnName<string>(accounts, accounts.base).as("name"),
      id: accounts.parent,
      parentId: accountsTable.parent,
      total: sql<number>`sum(${ft.value})`,
      last: sql<number>`sum(CASE WHEN ${timeTable.year} = ${max.year} THEN ${ft.value} ELSE 0 END) `,
      ...yearRange.reduce(
        (prev, y) => ({
          ...prev,
          [y.toString()]: sql<number>`sum(CASE WHEN ${timeTable.year} = ${y} THEN ${ft.value} ELSE 0 END) `,
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
