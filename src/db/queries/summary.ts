import { queryOptions, skipToken } from '@tanstack/react-query';
import { eq, sql, sum } from 'drizzle-orm';
import { SQLJsDatabase } from 'drizzle-orm/sql-js';
import { timeTable } from "../schema";
import { getConfig, subqueryColumnName } from '../utils';
import { fullTransactionsQuery, getAccountsClosureQuery } from './global';


const getNetCostsYearMonthQuery = (db: SQLJsDatabase, user: string, bookId: string, isYearly = false) => {
  const dbconf = getConfig(user)

  const ft = fullTransactionsQuery(db);
  const accounts = getAccountsClosureQuery(db, [dbconf.expenses], dbconf.taxesAll);
  const dateCol = isYearly ? sql<string>`cast(${timeTable.year} as text)` : timeTable.yearmonth;

  return db
    .select({ account: accounts.id, date: dateCol, value: sum(ft.splits.value).mapWith(Number) })
    .from(ft)
    .innerJoin(accounts, eq(accounts.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(eq(ft.transactions.bookId, bookId))
    .groupBy(accounts.id, timeTable.yearmonth)

}
export const netCostsYearMonthOptions = ({ db, user, bookId, isYearly = false }: { db: SQLJsDatabase | undefined, user: string | undefined, bookId: string | undefined, isYearly?: boolean }) => {
  const enabled = !!db && !!bookId && !!user;
  return queryOptions({
    queryKey: ['netCostsYearMonth', user, bookId, isYearly],
    queryFn: !enabled ? skipToken : async () => getNetCostsYearMonthQuery(db, user, bookId, isYearly).execute(),
    enabled: enabled
  })
}


const getAssetsDebtsYearMonthQuery = ({ db, user, bookId }: { db: SQLJsDatabase, user: string, bookId: string }) => {
  const dbconf = getConfig(user)

  const ft = fullTransactionsQuery(db);
  const accounts = getAccountsClosureQuery(db, [dbconf.working, dbconf.liability, dbconf.investments]);
  return db
    .select({
      name: subqueryColumnName<string>(accounts, accounts.name).as('name'),
      yearmonth: timeTable.yearmonth,
      value: sql<number>`abs(sum(sum(${ft.splits.value})) OVER (partition by ${accounts.id} order by ${timeTable.yearmonth} ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW))`
    })
    .from(ft)
    .innerJoin(accounts, eq(accounts.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(eq(ft.transactions.bookId, bookId))
    .groupBy(accounts.id, timeTable.yearmonth)
    .orderBy(timeTable.yearmonth)
}
export const assetsDebtsYearMonthOptions = ({ db, user, bookId }: { db: SQLJsDatabase | undefined, user: string | undefined, bookId: string | undefined }) => {
  const enabled = !!db && !!bookId && !!user;
  return queryOptions({
    queryKey: ['assetsDebtsYearMonth', user, bookId],
    queryFn: !enabled ? skipToken : async () => getAssetsDebtsYearMonthQuery({ db, user, bookId }).execute(),
    enabled: enabled
  })
}


const getIncomeExpensesYearMonthQuery = ({ db, user, bookId }: { db: SQLJsDatabase, user: string, bookId: string }) => {
  const dbconf = getConfig(user)

  const ft = fullTransactionsQuery(db);
  const accountsFiltered = getAccountsClosureQuery(db, [dbconf.expenses, dbconf.income]);

  return db
    .select({
      name: subqueryColumnName<string>(accountsFiltered, accountsFiltered.base).as('name'),
      type: sql<string>`CASE WHEN ${subqueryColumnName<string>(accountsFiltered, accountsFiltered.base)} = ${dbconf.income} THEN 'g' ELSE 'r' END`,
      yearmonth: timeTable.yearmonth,
      value: sql<number>`sum(abs(${ft.splits.value})) `
    })
    .from(ft)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(eq(ft.transactions.bookId, bookId))
    .groupBy(subqueryColumnName(accountsFiltered, accountsFiltered.base), timeTable.yearmonth)
    .orderBy(subqueryColumnName(accountsFiltered, accountsFiltered.base), timeTable.yearmonth)
}
export const incomeExpensesYearMonthOptions = ({ db, user, bookId }: { db: SQLJsDatabase | undefined, user: string | undefined, bookId: string | undefined }) => {
  const enabled = !!db && !!bookId && !!user;
  return queryOptions({
    queryKey: ['incomeExpensesYearMonth', user, bookId],
    queryFn: !enabled ? skipToken : async () => getIncomeExpensesYearMonthQuery({ db, user, bookId }).execute(),
    enabled: enabled
  })
}

const getTaxesYearMonthQuery = ({ db, user, bookId }: { db: SQLJsDatabase, user: string, bookId: string }) => {
  const dbconf = getConfig(user)

  const ft = fullTransactionsQuery(db);
  const accountsFiltered = getAccountsClosureQuery(db, [dbconf.taxes]);

  return db
    .select({
      yearmonth: timeTable.yearmonth,
      value: sql<number>`sum(abs(${ft.splits.value})) `
    })
    .from(ft)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(eq(ft.transactions.bookId, bookId))
    .groupBy(timeTable.yearmonth)
    .orderBy(timeTable.yearmonth)
}
export const taxesYearMonthOptions = ({ db, user, bookId }: { db: SQLJsDatabase | undefined, user: string | undefined, bookId: string | undefined }) => {
  const enabled = !!db && !!bookId && !!user;
  return queryOptions({
    queryKey: ['taxesYearMonth', user, bookId],
    queryFn: !enabled ? skipToken : async () => getTaxesYearMonthQuery({ db, user, bookId }).execute(),
    enabled: enabled
  })
}


const getProfitLossYearMonthQuery = ({ db, user, bookId }: { db: SQLJsDatabase, user: string, bookId: string }) => {
  const dbconf = getConfig(user)

  const ft = fullTransactionsQuery(db);
  const accountsFiltered = getAccountsClosureQuery(db, [dbconf.expenses, dbconf.income]);

  return db
    .select({
      yearmonth: timeTable.yearmonth,
      value: sql<number>`abs(sum(${ft.splits.value}))`,
      name: sql<string>`case when (sum(-${ft.splits.value})) >= 0 then 'Gain' else 'Loss' END`,
      type: sql<string>`case when (sum(-${ft.splits.value})) >= 0 then 'g' else 'r' end`
    })
    .from(ft)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(eq(ft.transactions.bookId, bookId))
    .groupBy(timeTable.yearmonth)
    .orderBy(timeTable.yearmonth)
}

export const profitLossYearMonthOptions = ({ db, user, bookId }: { db: SQLJsDatabase | undefined, user: string | undefined, bookId: string | undefined }) => {
  const enabled = !!db && !!bookId && !!user;
  return queryOptions({
    queryKey: ['profitLossYearMonth', user, bookId],
    queryFn: !enabled ? skipToken : async () => getProfitLossYearMonthQuery({ db, user, bookId }).execute(),
    enabled: enabled
  })
}


