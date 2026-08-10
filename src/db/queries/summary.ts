import { queryOptions, skipToken } from "@tanstack/react-query";
import { eq, sql, sum } from "drizzle-orm";
import { AnyDB } from "../dbType";
import {
  summaryMonthlyTable,
  summaryQuarterlyTable,
  summaryYearlyTable,
  timeTable,
} from "../schema";
import { getConfig, subqueryColumnName } from "../utils";
import { fullTransactionsQuery, getAccountsClosureQuery } from "./global";

const getNetCostsYearMonthQuery = <TDB extends AnyDB>(
  db: TDB,
  user: string,
  bookId: string,
  isYearly = false,
) => {
  const dbconf = getConfig(user);

  const ft = fullTransactionsQuery(db);
  const accounts = getAccountsClosureQuery(db, [dbconf.expenses], dbconf.taxesAll);
  const dateCol = isYearly ? sql<string>`cast(${timeTable.year} as text)` : timeTable.yearmonth;

  return db
    .select({
      account: accounts.id,
      date: dateCol,
      value: sum(ft.value).mapWith(Number),
    })
    .from(ft)
    .innerJoin(accounts, eq(accounts.id, ft.accountId))
    .innerJoin(timeTable, eq(timeTable.ymd, ft.ymdPosted))
    .where(eq(ft.bookId, bookId))
    .groupBy(accounts.id, timeTable.yearmonth);
};
export const netCostsYearMonthOptions = <TDB extends AnyDB>({
  db,
  user,
  bookId,
  isYearly = false,
}: {
  db: TDB | undefined;
  user: string | undefined;
  bookId: string | undefined;
  isYearly?: boolean;
}) => {
  const enabled = !!db && !!bookId && !!user;
  return queryOptions({
    queryKey: ["netCostsYearMonth", user, bookId, isYearly],
    queryFn: !enabled
      ? skipToken
      : async () => getNetCostsYearMonthQuery(db, user, bookId, isYearly).execute(),
    enabled: enabled,
  });
};

const getAssetsDebtsYearMonthQuery = <TDB extends AnyDB>({
  db,
  user,
  bookId,
}: {
  db: TDB;
  user: string;
  bookId: string;
}) => {
  const dbconf = getConfig(user);

  const ft = fullTransactionsQuery(db);
  const accounts = getAccountsClosureQuery(db, [
    dbconf.working,
    dbconf.liability,
    dbconf.investments,
  ]);
  return db
    .select({
      name: subqueryColumnName<string>(accounts, accounts.name).as("name"),
      yearmonth: timeTable.yearmonth,
      value: sql<number>`abs(sum(sum(${ft.value})) OVER (partition by ${accounts.id} order by ${timeTable.yearmonth} ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW))`,
    })
    .from(ft)
    .innerJoin(accounts, eq(accounts.id, ft.accountId))
    .innerJoin(timeTable, eq(timeTable.ymd, ft.ymdPosted))
    .where(eq(ft.bookId, bookId))
    .groupBy(accounts.id, timeTable.yearmonth)
    .orderBy(timeTable.yearmonth);
};

export const assetsDebtsYearMonthOptions = <TDB extends AnyDB>({
  db,
  user,
  bookId,
}: {
  db: TDB | undefined;
  user: string | undefined;
  bookId: string | undefined;
}) => {
  const enabled = !!db && !!bookId && !!user;
  return queryOptions({
    queryKey: ["assetsDebtsYearMonth", user, bookId],
    queryFn: !enabled
      ? skipToken
      : async () => getAssetsDebtsYearMonthQuery({ db, user, bookId }).execute(),
    enabled: enabled,
  });
};

const getTransactSumQuery = <TDB extends AnyDB>({
  db,
  accountIds,
  periodicity,
  hideAccounts = [],
}: {
  db: TDB;
  bookId: string;
  accountIds: string[];
  periodicity: "monthly" | "quarterly" | "yearly";
  hideAccounts?: string[];
}) => {
  const ft = {
    monthly: summaryMonthlyTable,
    quarterly: summaryQuarterlyTable,
    yearly: summaryYearlyTable,
  }[periodicity];

  const accountsFiltered = getAccountsClosureQuery(db, accountIds, hideAccounts);

  return db
    .select({
      date: ft.date,
      dateLabel: ft.dateLabel,
      value: sql<number>`sum(${ft.totalValue}) `,
    })
    .from(ft)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.accountId))
    .groupBy(ft.date)
    .orderBy(ft.date);
};

export const transactsSumOptions = <TDB extends AnyDB>({
  db,
  bookId,
  accountIds,
  periodicity,
  hideAccounts = [],
}: {
  db: TDB | undefined;
  bookId: string | undefined;
  accountIds: string[];
  periodicity: "monthly" | "quarterly" | "yearly";
  hideAccounts?: string[];
}) => {
  const enabled = !!db && !!bookId && !!accountIds && !!periodicity;
  return queryOptions({
    queryKey: ["transactsSumOptions", bookId, accountIds, periodicity, hideAccounts],
    queryFn: !enabled
      ? skipToken
      : async () =>
          getTransactSumQuery({
            db,
            bookId,
            accountIds,
            periodicity,
            hideAccounts,
          }).execute(),
    enabled: enabled,
  });
};

const getTaxesYearMonthQuery = <TDB extends AnyDB>({
  db,
  user,
  bookId,
}: {
  db: TDB;
  user: string;
  bookId: string;
}) => {
  const dbconf = getConfig(user);

  const ft = fullTransactionsQuery(db);
  const accountsFiltered = getAccountsClosureQuery(db, [dbconf.taxes]);

  return db
    .select({
      yearmonth: timeTable.yearmonth,
      value: sql<number>`sum(abs(${ft.value})) `,
    })
    .from(ft)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.accountId))
    .innerJoin(timeTable, eq(timeTable.ymd, ft.ymdPosted))
    .where(eq(ft.bookId, bookId))
    .groupBy(timeTable.yearmonth)
    .orderBy(timeTable.yearmonth);
};
export const taxesYearMonthOptions = <TDB extends AnyDB>({
  db,
  user,
  bookId,
}: {
  db: TDB | undefined;
  user: string | undefined;
  bookId: string | undefined;
}) => {
  const enabled = !!db && !!bookId && !!user;
  return queryOptions({
    queryKey: ["taxesYearMonth", user, bookId],
    queryFn: !enabled
      ? skipToken
      : async () => getTaxesYearMonthQuery({ db, user, bookId }).execute(),
    enabled: enabled,
  });
};

const getProfitLossYearMonthQuery = <TDB extends AnyDB>({
  db,
  user,
  bookId,
  hideAccounts,
}: {
  db: TDB;
  user: string;
  bookId: string;
  hideAccounts: string[];
}) => {
  const dbconf = getConfig(user);

  const ft = fullTransactionsQuery(db);
  const accountsFiltered = getAccountsClosureQuery(
    db,
    [dbconf.expenses, dbconf.income, dbconf.taxes],
    hideAccounts,
  );

  return db
    .select({
      date: timeTable.yearmonth,
      value: sql<number>`abs(sum(${ft.value}))`,
      name: sql<string>`case when (sum(-${ft.value})) >= 0 then 'Gain' else 'Loss' END`,
      type: sql<string>`case when (sum(-${ft.value})) >= 0 then 'g' else 'r' end`,
    })
    .from(ft)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.accountId))
    .innerJoin(timeTable, eq(timeTable.ymd, ft.ymdPosted))
    .where(eq(ft.bookId, bookId))
    .groupBy(timeTable.yearmonth)
    .orderBy(timeTable.yearmonth);
};

export const profitLossYearMonthOptions = <TDB extends AnyDB>({
  db,
  user,
  bookId,
  hideAccounts = [],
}: {
  db: TDB | undefined;
  user: string | undefined;
  bookId: string | undefined;
  hideAccounts?: string[];
}) => {
  const enabled = !!db && !!bookId && !!user;
  const queryFn = !enabled
    ? skipToken
    : async () =>
        getProfitLossYearMonthQuery({
          db,
          user,
          bookId,
          hideAccounts,
        }).execute();
  return queryOptions({
    queryKey: ["profitLossYearMonth", user, bookId, ...hideAccounts],
    queryFn: queryFn,
    enabled: enabled,
  });
};

const getTransactByAccountQuery = <TDB extends AnyDB>({
  db,
  accountIds,
  periodicity,
  accumulate = true, // New Argument
  hideAccounts = [],
}: {
  db: TDB;
  bookId: string;
  accountIds: string[];
  periodicity: "monthly" | "quarterly" | "yearly";
  accumulate?: boolean;
  hideAccounts?: string[];
}) => {
  const ft = {
    monthly: summaryMonthlyTable,
    quarterly: summaryQuarterlyTable,
    yearly: summaryYearlyTable,
  }[periodicity];

  const accountsFiltered = getAccountsClosureQuery(db, accountIds, hideAccounts);

  // Define the value column dynamically
  const valueColumn = accumulate
    ? sql<number>`SUM(${ft.totalValue}) OVER (
        PARTITION BY ${ft.accountId} 
        ORDER BY ${ft.date} 
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      )`.mapWith(Number)
    : ft.totalValue; // Just the raw value for that period

  return (
    db
      .select({
        date: ft.date,
        dateLabel: ft.dateLabel,
        accountId: ft.accountId,
        accountName: ft.accountName,
        value: valueColumn,
      })
      .from(ft)
      .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.accountId))
      // Note: groupBy might be redundant if ft is already a summary table,
      // but kept for consistency with your original snippet.
      .groupBy(ft.accountId, ft.date)
      .orderBy(ft.date)
  );
};

// Helper to extract the actual data type from the execute() promise
export type TransactData = Awaited<
  ReturnType<ReturnType<typeof getTransactByAccountQuery>["execute"]>
>;

export const transactByAccountOptions = <TDB extends AnyDB, TData = TransactData>(args: {
  db: TDB | undefined;
  bookId: string | undefined;
  accountIds: string[];
  periodicity: "monthly" | "quarterly" | "yearly";
  accumulate?: boolean;
  hideAccounts?: string[];
  // TData defaults to the raw data, or whatever the select function returns
  select?: (data: TransactData) => TData;
}) => {
  const {
    db,
    bookId,
    accountIds,
    periodicity,
    accumulate = false,
    hideAccounts = [],
    select,
  } = args;

  const isEnabled = !!db && !!bookId && accountIds.length > 0;

  return queryOptions({
    queryKey: [
      "transactsSumOptions",
      bookId,
      [...accountIds].sort(),
      periodicity,
      accumulate,
      [...hideAccounts].sort(),
    ] as const,

    queryFn: isEnabled
      ? async () => {
          const query = getTransactByAccountQuery({
            db: db,
            bookId: bookId,
            accountIds,
            periodicity,
            accumulate,
            hideAccounts,
          });
          return await query.execute();
        }
      : skipToken,

    enabled: isEnabled,
    select,
  });
};
