import { eq, sum, sql} from 'drizzle-orm'
import { timeTable } from "../schema";
import { SQLJsDatabase } from 'drizzle-orm/sql-js';
import { subqueryColumnName } from '../utils';
import { getAccountsQuery } from './global';
import { fullTransactionsQuery } from './global';

export const getNetCostsYearMonthQuery = (db: SQLJsDatabase, bookId: string, isYearly: boolean = false) => {
  const ft = fullTransactionsQuery(db);
  const accounts = getAccountsQuery(db, ['Gastos'], ['Impuestos', 'IRPF', 'Seguridad Social', 'Contingencias Comunes', 'Desempleo', 'Formacion']);
  const dateCol = isYearly ? sql<string>`cast(${timeTable.year} as text)` : timeTable.yearmonth; 

  return db
    .select({account: accounts.id, date: dateCol, value: sum(ft.splits.value).mapWith(Number)})
    .from(ft)
    .innerJoin(accounts, eq(accounts.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(eq(ft.transactions.bookId, bookId))
    .groupBy(accounts.id, timeTable.yearmonth)

}


export const getAssetsDebtsYearMonthQuery = (db: SQLJsDatabase, bookId: string) => {
  const ft = fullTransactionsQuery(db);
  const accounts = getAccountsQuery(db, ['Activo circulante', 'Pasivo', 'Inversiones']);
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


export const getIncomeExpensesYearMonthQuery = (db: SQLJsDatabase, bookId: string) => {
  const ft = fullTransactionsQuery(db);
  const accountsFiltered = getAccountsQuery(db, ['Ingresos', 'Gastos']);

  return db
    .select({
      name: subqueryColumnName<string>(accountsFiltered, accountsFiltered.base).as('name'),
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

export const getTaxesYearMonthQuery = (db: SQLJsDatabase, bookId: string) => {
  const ft = fullTransactionsQuery(db);
  const accountsFiltered = getAccountsQuery(db, ['Impuestos']);

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


export const getProfitLossYearMonthQuery = (db: SQLJsDatabase, bookId: string) => {
  const ft = fullTransactionsQuery(db);
  const accountsFiltered = getAccountsQuery(db, ['Ingresos', 'Gastos']);
  
  return db
    .select({
      yearmonth: timeTable.yearmonth,
      value: sql<number>`abs(sum(${ft.splits.value}))`,
      name: sql<string>`case when (sum(-${ft.splits.value})) >= 0 then 'Ganancia' else 'Perdida' end` 
    })
    .from(ft)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(eq(ft.transactions.bookId, bookId))
    .groupBy(timeTable.yearmonth)
    .orderBy(timeTable.yearmonth)
}



