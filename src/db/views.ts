import { eq, or, sum, max, sql, and, SQL, lt, gte, min, Subquery, not, count, countDistinct} from 'drizzle-orm'
import { integer, text, sqliteView, alias  } from "drizzle-orm/sqlite-core"
import { accountsTable, splitsTable, timeTable, transactionsTable } from "./schema";
import { SQLJsDatabase } from 'drizzle-orm/sql-js';
import { DateTime } from 'luxon';

export const subqueryColumnName = <T>(
  table: Subquery,
  column: SQL.Aliased<T>
) =>
  sql<T>`${sql.identifier(table._.alias)}.${sql.identifier(column.fieldAlias)}`

export const accountsClosure = sqliteView('accountsClosure',{
  bookId: text().notNull(),
  parent: text().notNull(),
  child: text().notNull(),
  depth: integer().notNull()
}).existing()


// TODO: Don't really work in drizzle right now
//export const fullTransactions = sqliteView("fullTransactions").as((qb) => qb.select().from(transactions).leftJoin(splits, eq(transactions.id, splits.transactionId)));
export const fullTransactionsQuery = (db: SQLJsDatabase) => {
  return db
    .select()
    .from(transactionsTable)
    .innerJoin(splitsTable, eq(transactionsTable.id, splitsTable.transactionId))
    .innerJoin(accountsTable, eq(accountsTable.id, splitsTable.account))
    .as('ft')
};
  
  // SELECT date(MAX(DtYMD), 'start of month') as ym FROM FullTransactions t INNER JOIN TimeTable times on times.DtYMD = substr(t.DtPosted, 0, 11)
export const getLastDateQuery = (db: SQLJsDatabase) => {
  const accounts = getAccountsQuery(db, ['Gastos']);
  const ft = fullTransactionsQuery(db);
  return db
  .select({'latest': max(ft.transactions.datePosted)})
  .from(ft)
  .innerJoin(accounts, eq(accounts.id, ft.splits.account))
}

export const getDomainQuery = (db: SQLJsDatabase) => {
  const accounts = getAccountsQuery(db, ['Gastos']);
  const ft = fullTransactionsQuery(db);
  return db
  .select({startDate: min(ft.transactions.datePosted), endDate: max(ft.transactions.datePosted)})
  .from(ft)
  .innerJoin(accounts, eq(accounts.id, ft.splits.account))
}

export const getAccountsQuery = (db: SQLJsDatabase, accountNames: string[], ignoreAccounts?: string[]) => {
  const parent = alias(accountsTable, "parent")
  const child = alias(accountsTable, "child")
  
  let check = or(...accountNames.map((name) => eq(parent.name, name)));
  if (ignoreAccounts) {
    const ignore = or(...ignoreAccounts.map((name) => eq(child.name, name)));
    check = and(check, not(ignore!))
  }

  return db
    .selectDistinct({
      id: accountsClosure.child,
      base: sql<string>`${parent.name}`.as('base'),
      name: sql<string>`${child.name}`.as('name'),
    })
    .from(accountsClosure)
    .innerJoin(child, eq(accountsClosure.child, child.id))
    .innerJoin(parent, eq(accountsClosure.parent, parent.id))
    .where(check)
    .as('accountsFiltered')
};

export const getSplitSumQuery = (db: SQLJsDatabase, bookId: string, accountNames: string[], startDate?: DateTime, endDate?: DateTime, notes?: string) => {
  const ft = fullTransactionsQuery(db);
  const accounts = getAccountsQuery(db, accountNames);
  let filterQuery: SQL<unknown>|undefined = undefined; 
  if (startDate) filterQuery = and(filterQuery, gte(timeTable.ymd, startDate))
  if (endDate) filterQuery = and(filterQuery, lt(timeTable.ymd, endDate))
  if (notes) filterQuery = and(filterQuery, eq(sql<string>`substr(${ft.transactions.slNotes}, 0, ${notes.length+1})`, notes))

  return db
    .select({'value': sum(ft.splits.value).mapWith(Number)})
    .from(ft)
    .innerJoin(accounts, eq(accounts.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(and(eq(ft.transactions.bookId, bookId), filterQuery));
}


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


export const getTravelExpensesYearMonthQuery = (db: SQLJsDatabase, bookId: string) => {
  const ft = fullTransactionsQuery(db);
  const accountsFiltered = getAccountsQuery(db, ['Gastos']);

  return db
    .select({
      date: timeTable.yearmonth,
      value: sql<number>`sum(abs(${ft.splits.value}))`
    })
    .from(ft)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string>`substr(${ft.transactions.slNotes}, 0, 6)`, 'Viaje') ))
    .groupBy(timeTable.yearmonth)
    .orderBy(timeTable.yearmonth)
}
export const getTravelExpensesYearQuery = (db: SQLJsDatabase, bookId: string) => {
  const ft = fullTransactionsQuery(db);
  const accountsFiltered = getAccountsQuery(db, ['Gastos']);

  return db
    .select({
      date: sql<string>`cast(${timeTable.year} as text)`, 
      value: sql<number>`sum(abs(${ft.splits.value}))`
    })
    .from(ft)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string>`substr(${ft.transactions.slNotes}, 0, 6)`, 'Viaje') ))
    .groupBy(timeTable.year)
    .orderBy(timeTable.year)
}

export const getTravelExpensesDetailedYearMonthQuery = (db: SQLJsDatabase, bookId: string) => {
  const ft = fullTransactionsQuery(db);
  const accountsFiltered = getAccountsQuery(db, ['Gastos']);

  return db
    .select({
      name: sql<string>`${ft.transactions.slNotes}`.as('name'),
      date: timeTable.yearmonth,
      value: sql<number>`sum(abs(${ft.splits.value})) `
    })
    .from(ft)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string>`substr(${ft.transactions.slNotes}, 0, 6)`, 'Viaje') ))
    .groupBy(ft.transactions.slNotes, timeTable.yearmonth)
    .orderBy(ft.transactions.slNotes, timeTable.yearmonth)
}


export const getTravelExpensesDetailedQuery = (db: SQLJsDatabase, bookId: string) => {
  const ft = fullTransactionsQuery(db);
  const accountsFiltered = getAccountsQuery(db, ['Gastos']);

  return db
    .select({
      name: sql<string>`${ft.transactions.slNotes}`.as('name'),
      ini: min(timeTable.yearmonth)!,
      fin: max(timeTable.yearmonth)!,
      value: sql<number>`sum(abs(${ft.splits.value})) `
    })
    .from(ft)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string>`substr(${ft.transactions.slNotes}, 0, 6)`, 'Viaje') ))
    .groupBy(ft.transactions.slNotes)
    .orderBy(ft.transactions.slNotes)
}

export const getTravelKpiQuery = (db: SQLJsDatabase, bookId: string) => {
  const ft = fullTransactionsQuery(db);
  const accountsFiltered = getAccountsQuery(db, ['Gastos']);

  return db
    .select({
      number: countDistinct(ft.transactions.slNotes),
      ini: min(timeTable.yearmonth)!,
      fin: max(timeTable.yearmonth)!
    })
    .from(ft)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string>`substr(${ft.transactions.slNotes}, 0, 6)`, 'Viaje') ))
}


export const getTravelExpensesByAccountQuery = (db: SQLJsDatabase, bookId: string) => {
  const ft = fullTransactionsQuery(db);
  const accountsFiltered = getAccountsQuery(db, ['Gastos']);

  return db
    .select({
      name: subqueryColumnName<string>(accountsFiltered, accountsFiltered.name).as('name'),
      value: sum(ft.splits.value).mapWith(Number)
    })
    .from(ft)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string>`substr(${ft.transactions.slNotes}, 0, 6)`, 'Viaje') ))
    .groupBy(accountsFiltered.id)

}











