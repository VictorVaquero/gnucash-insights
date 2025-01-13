import { fullTransactionsQuery } from './global';
import { getAccountsQuery } from './global';
import { firstRow, subqueryColumnName } from '../utils';

import { sum, eq, sql, and, countDistinct, max, min, gte, lt } from "drizzle-orm";
import { SQLJsDatabase } from "drizzle-orm/sql-js";
import { accountsTable, splitsTable, timeTable, transactionsTable } from "../schema";
import { DateTime } from 'luxon';
import { useQuery } from 'react-query';
import { areAnyUndefined } from '@/common/utils';


export const getTravelExpensesByAccountQuery = (db: SQLJsDatabase, bookId: string) => {
    const ft = fullTransactionsQuery(db);
    const accountsFiltered = getAccountsQuery(db, ['Gastos']);

    return db
        .select({
            key: ft.splits.account,
            name: subqueryColumnName<string>(accountsFiltered, accountsFiltered.name).as('name'),
            value: sum(ft.splits.value).mapWith(Number)
        })
        .from(ft)
        .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
        .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
        .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string> `substr(${ft.transactions.slNotes}, 0, 6)`, 'Viaje')))
        .groupBy(accountsFiltered.id);

};
export const getTravelExpensesDetailedQuery = (db: SQLJsDatabase, bookId: string) => {
    const ft = fullTransactionsQuery(db);
    const accountsFiltered = getAccountsQuery(db, ['Gastos']);

    return db
        .select({
            name: sql<string> `${ft.transactions.slNotes}`.as('name'),
            ini: min(timeTable.yearmonth)!,
            fin: max(timeTable.yearmonth)!,
            value: sql<number> `sum(abs(${ft.splits.value})) `
        })
        .from(ft)
        .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
        .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
        .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string> `substr(${ft.transactions.slNotes}, 0, 6)`, 'Viaje')))
        .groupBy(ft.transactions.slNotes)
        .orderBy(ft.transactions.slNotes);
};
const getTravelExpensesDetailedYearMonthQuery = (db: SQLJsDatabase, bookId: string) => {
    const ft = fullTransactionsQuery(db);
    const accountsFiltered = getAccountsQuery(db, ['Gastos']);

    return db
        .select({
            name: sql<string> `${ft.transactions.slNotes}`.as('name'),
            date: timeTable.yearmonth,
            value: sql<number> `sum(abs(${ft.splits.value})) `
        })
        .from(ft)
        .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
        .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
        .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string> `substr(${ft.transactions.slNotes}, 0, 6)`, 'Viaje')))
        .groupBy(ft.transactions.slNotes, timeTable.yearmonth)
        .orderBy(ft.transactions.slNotes, timeTable.yearmonth);
};
export const useGetTravelExpensesDetailedYearMonth = (db?: SQLJsDatabase, bookId?: string) => useQuery(['travelExpensesDetailedYearMonth', bookId], async () => getTravelExpensesDetailedYearMonthQuery(db!, bookId!).execute(), {enabled: !areAnyUndefined([db, bookId]), staleTime: Infinity} );

export const getTravelExpensesYearQuery = (db: SQLJsDatabase, bookId: string) => {
    const ft = fullTransactionsQuery(db);
    const accountsFiltered = getAccountsQuery(db, ['Gastos']);

    return db
        .select({
            date: sql<string> `cast(${timeTable.year} as text)`,
            value: sql<number> `sum(abs(${ft.splits.value}))`
        })
        .from(ft)
        .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
        .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
        .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string> `substr(${ft.transactions.slNotes}, 0, 6)`, 'Viaje')))
        .groupBy(timeTable.year)
        .orderBy(timeTable.year);
};
export const getTravelExpensesYearMonthQuery = (db: SQLJsDatabase, bookId: string) => {
    const ft = fullTransactionsQuery(db);
    const accountsFiltered = getAccountsQuery(db, ['Gastos']);

    return db
        .select({
            date: timeTable.yearmonth,
            value: sql<number> `sum(abs(${ft.splits.value}))`
        })
        .from(ft)
        .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
        .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
        .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string> `substr(${ft.transactions.slNotes}, 0, 6)`, 'Viaje')))
        .groupBy(timeTable.yearmonth)
        .orderBy(timeTable.yearmonth);
};

const getTravelExpenseKPIsQuery = (db: SQLJsDatabase, bookId: string, latestMonth: DateTime) => {
  const accounts = getAccountsQuery(db, ['Gastos']);

  return db
    .select({ 
      total_lm: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth))} THEN ${splitsTable.value} ELSE 0 END) `,
      expense_lm: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth))} AND substr(${transactionsTable.slNotes}, 0, 6) = 'Viaje' THEN ${splitsTable.value} ELSE 0 END) `,
      total_3m: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth.minus({months: 3})), lt(timeTable.ymd, latestMonth))} THEN ${splitsTable.value} ELSE 0 END) `,
      expense_3m: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth.minus({months: 3})), lt(timeTable.ymd, latestMonth))} AND substr(${transactionsTable.slNotes}, 0, 6) = 'Viaje' THEN ${splitsTable.value} ELSE 0 END) `,
      total_6m: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth.minus({months: 6})), lt(timeTable.ymd, latestMonth))} THEN ${splitsTable.value} ELSE 0 END) `,
      expense_6m: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth.minus({months: 6})), lt(timeTable.ymd, latestMonth))} AND substr(${transactionsTable.slNotes}, 0, 6) = 'Viaje' THEN ${splitsTable.value} ELSE 0 END) `,
      total_1y: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth.minus({years: 1})), lt(timeTable.ymd, latestMonth))} THEN ${splitsTable.value} ELSE 0 END) `,
      expense_1y: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth.minus({years: 1})), lt(timeTable.ymd, latestMonth))} AND substr(${transactionsTable.slNotes}, 0, 6) = 'Viaje' THEN ${splitsTable.value} ELSE 0 END) `,
      total_all: sql<number>`sum(${splitsTable.value}) `,
      expense_all: sql<number>`sum(CASE WHEN substr(${transactionsTable.slNotes}, 0, 6) = 'Viaje' THEN ${splitsTable.value} ELSE 0 END) `,
    })
    .from(transactionsTable)
    .innerJoin(splitsTable, eq(transactionsTable.id, splitsTable.transactionId))
    .innerJoin(accountsTable, eq(accountsTable.id, splitsTable.account))
    .innerJoin(accounts, eq(accounts.id, splitsTable.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${transactionsTable.datePosted}, 0, 11)`))
    .where(eq(transactionsTable.bookId, bookId));
};
export const useGetTravelExpensesKPIs = (db?: SQLJsDatabase, bookId?: string, latestMonth?: DateTime) => useQuery(['travelExpensesKPIs', bookId], async ()=> {const data = await getTravelExpenseKPIsQuery(db!, bookId!, latestMonth!).execute(); return data[0]}, {enabled: !areAnyUndefined([db, bookId, latestMonth]), staleTime: Infinity} );

const getUniqueTravelsQuery = (db: SQLJsDatabase, bookId: string) => {
    const ft = fullTransactionsQuery(db);
    const accountsFiltered = getAccountsQuery(db, ['Gastos']);

    return db
        .select({
            number: countDistinct(ft.transactions.slNotes)
        })
        .from(ft)
        .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
        .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
        .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string> `substr(${ft.transactions.slNotes}, 0, 6)`, 'Viaje')));
};
export const useGetUniqueTravels = (db?: SQLJsDatabase, bookId?: string) => useQuery(['uniqueTravels', bookId], firstRow(getUniqueTravelsQuery(db, bookId)), {enabled: !!db && !!bookId, staleTime: Infinity} );


