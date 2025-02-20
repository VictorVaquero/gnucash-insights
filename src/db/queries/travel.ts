import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import { and, countDistinct, eq, gte, lt, max, min, sql, sum } from "drizzle-orm";
import { SQLJsDatabase } from "drizzle-orm/sql-js";

import { DateTime } from 'luxon';
import { accountsTable, splitsTable, timeTable, transactionsTable } from "../schema";
import { getConfig, subqueryColumnName } from '../utils';
import { fullTransactionsQuery, getAccountsClosureQuery } from './global';


const getTravelExpensesByAccountQuery = ({ db, user, bookId }: { db: SQLJsDatabase, user: string, bookId: string }) => {
    const dbconf = getConfig(user)

    const ft = fullTransactionsQuery(db);
    const accountsFiltered = getAccountsClosureQuery(db, [dbconf.expenses]);

    return db
        .select({
            key: ft.splits.account,
            name: subqueryColumnName<string>(accountsFiltered, accountsFiltered.name).as('name'),
            value: sum(ft.splits.value).mapWith(Number)
        })
        .from(ft)
        .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
        .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
        .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string> `substr(${ft.transactions.slNotes}, 0, ${dbconf.tripDesc.length + 1})`, dbconf.tripDesc)))
        .groupBy(accountsFiltered.id);

};
export const travelExpensesByAccountOptions = ({ db, user, bookId }: { db: SQLJsDatabase | undefined, user: string | undefined, bookId: string | undefined }) => {
    const enabled = !!db && !!bookId && !!user;

    return queryOptions({
        queryKey: ['travelExpensesByAccount', bookId],
        queryFn: !enabled ? skipToken : async () => getTravelExpensesByAccountQuery({ db, user, bookId }).execute(),
        enabled: enabled
    })
}
const getTravelExpensesDetailedQuery = ({ db, user, bookId }: { db: SQLJsDatabase, user: string, bookId: string }) => {
    const dbconf = getConfig(user)
    const ft = fullTransactionsQuery(db);
    const accountsFiltered = getAccountsClosureQuery(db, [dbconf.expenses]);

    return db
        .select({
            name: sql<string> `${ft.transactions.slNotes}`.as('name'),
            ini: min(timeTable.yearmonth),
            fin: max(timeTable.yearmonth),
            value: sql<number> `sum(abs(${ft.splits.value})) `
        })
        .from(ft)
        .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
        .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
        .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string> `substr(${ft.transactions.slNotes}, 0, ${dbconf.tripDesc.length + 1})`, dbconf.tripDesc)))
        .groupBy(ft.transactions.slNotes)
        .orderBy(ft.transactions.slNotes);
};
export const travelExpensesDetailedOptions = ({ db, user, bookId }: { db: SQLJsDatabase | undefined, user: string | undefined, bookId: string | undefined }) => {
    const enabled = !!db && !!bookId && !!user;

    return queryOptions({
        queryKey: ['travelExpensesDetailed', user, bookId],
        queryFn: !enabled ? skipToken : async () => getTravelExpensesDetailedQuery({ db, user, bookId }).execute(),
        enabled: enabled
    })
}
const getTravelExpensesDetailedYearMonthQuery = ({ db, user, bookId }: { db: SQLJsDatabase, user: string, bookId: string }) => {
    const dbconf = getConfig(user)
    const ft = fullTransactionsQuery(db);
    const accountsFiltered = getAccountsClosureQuery(db, [dbconf.expenses]);

    return db
        .select({
            name: sql<string> `${ft.transactions.slNotes}`.as('name'),
            date: timeTable.yearmonth,
            value: sql<number> `sum(abs(${ft.splits.value})) `
        })
        .from(ft)
        .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
        .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
        .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string> `substr(${ft.transactions.slNotes}, 0, ${dbconf.tripDesc.length + 1})`, dbconf.tripDesc)))
        .groupBy(ft.transactions.slNotes, timeTable.yearmonth)
        .orderBy(ft.transactions.slNotes, timeTable.yearmonth);
};
export const travelExpensesDetailedYearMonthOptions = ({ db, user, bookId }: { db: SQLJsDatabase | undefined, user: string | undefined, bookId: string | undefined }) => {
    const enabled = !!db && !!bookId && !!user;

    return queryOptions({
        queryKey: ['travelExpensesDetailedYearMonth', user, bookId],
        queryFn: !enabled ? skipToken : async () => getTravelExpensesDetailedYearMonthQuery({ db, user, bookId }).execute(),
        enabled: enabled
    })
}


const getTravelExpensesYearQuery = ({ db, user, bookId }: { db: SQLJsDatabase, user: string, bookId: string }) => {
    const dbconf = getConfig(user)
    const ft = fullTransactionsQuery(db);
    const accountsFiltered = getAccountsClosureQuery(db, [dbconf.expenses]);

    return db
        .select({
            date: sql<string> `cast(${timeTable.year} as text)`,
            value: sql<number> `sum(abs(${ft.splits.value}))`
        })
        .from(ft)
        .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
        .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
        .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string> `substr(${ft.transactions.slNotes}, 0, ${dbconf.tripDesc.length + 1})`, dbconf.tripDesc)))
        .groupBy(timeTable.year)
        .orderBy(timeTable.year);
};
export const travelExpensesYearOptions = ({ db, user, bookId }: { db: SQLJsDatabase | undefined, user: string | undefined, bookId: string | undefined }) => {
    const enabled = !!db && !!bookId && !!user;

    return queryOptions({
        queryKey: ['travelExpensesYear', user, bookId],
        queryFn: !enabled ? skipToken : async () => getTravelExpensesYearQuery({ db, user, bookId }).execute(),
        enabled: enabled
    })
}
const getTravelExpensesYearMonthQuery = ({ db, user, bookId }: { db: SQLJsDatabase, user: string, bookId: string }) => {
    const dbconf = getConfig(user)
    const ft = fullTransactionsQuery(db);
    const accountsFiltered = getAccountsClosureQuery(db, [dbconf.expenses]);

    return db
        .select({
            date: timeTable.yearmonth,
            value: sql<number> `sum(abs(${ft.splits.value}))`
        })
        .from(ft)
        .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
        .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
        .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string> `substr(${ft.transactions.slNotes}, 0, ${dbconf.tripDesc.length + 1})`, dbconf.tripDesc)))
        .groupBy(timeTable.yearmonth)
        .orderBy(timeTable.yearmonth);
};
export const travelExpensesYearMonthOptions = ({ db, user, bookId }: { db: SQLJsDatabase | undefined, user: string | undefined, bookId: string | undefined }) => {
    const enabled = !!db && !!bookId && !!user;

    return queryOptions({
        queryKey: ['travelExpensesYearMonth', user, bookId],
        queryFn: !enabled ? skipToken : async () => getTravelExpensesYearMonthQuery({ db, user, bookId }).execute(),
        enabled: enabled
    })
}

const getTravelExpenseKPIsQuery = ({ db, user, latestMonth, bookId }: { db: SQLJsDatabase, user: string, bookId: string, latestMonth: DateTime }) => {
    const dbconf = getConfig(user)
    const accounts = getAccountsClosureQuery(db, [dbconf.expenses]);

    return db
        .select({
            total_lm: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth))} THEN ${splitsTable.value} ELSE 0 END) `,
            expense_lm: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth))} AND substr(${transactionsTable.slNotes}, 0, ${dbconf.tripDesc.length + 1}) = ${dbconf.tripDesc} THEN ${splitsTable.value} ELSE 0 END) `,
            total_3m: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth.minus({ months: 3 })), lt(timeTable.ymd, latestMonth))} THEN ${splitsTable.value} ELSE 0 END) `,
            expense_3m: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth.minus({ months: 3 })), lt(timeTable.ymd, latestMonth))} AND substr(${transactionsTable.slNotes}, 0, ${dbconf.tripDesc.length + 1}) = ${dbconf.tripDesc} THEN ${splitsTable.value} ELSE 0 END) `,
            total_6m: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth.minus({ months: 6 })), lt(timeTable.ymd, latestMonth))} THEN ${splitsTable.value} ELSE 0 END) `,
            expense_6m: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth.minus({ months: 6 })), lt(timeTable.ymd, latestMonth))} AND substr(${transactionsTable.slNotes}, 0, ${dbconf.tripDesc.length + 1}) = ${dbconf.tripDesc} THEN ${splitsTable.value} ELSE 0 END) `,
            total_1y: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth.minus({ years: 1 })), lt(timeTable.ymd, latestMonth))} THEN ${splitsTable.value} ELSE 0 END) `,
            expense_1y: sql<number>`sum(CASE WHEN ${and(gte(timeTable.ymd, latestMonth.minus({ years: 1 })), lt(timeTable.ymd, latestMonth))} AND substr(${transactionsTable.slNotes}, 0, ${dbconf.tripDesc.length + 1}) = ${dbconf.tripDesc} THEN ${splitsTable.value} ELSE 0 END) `,
            total_all: sql<number>`sum(${splitsTable.value}) `,
            expense_all: sql<number>`sum(CASE WHEN substr(${transactionsTable.slNotes}, 0, ${dbconf.tripDesc.length + 1}) = ${dbconf.tripDesc} THEN ${splitsTable.value} ELSE 0 END) `,
        })
        .from(transactionsTable)
        .innerJoin(splitsTable, eq(transactionsTable.id, splitsTable.transactionId))
        .innerJoin(accountsTable, eq(accountsTable.id, splitsTable.account))
        .innerJoin(accounts, eq(accounts.id, splitsTable.account))
        .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${transactionsTable.datePosted}, 0, 11)`))
        .where(eq(transactionsTable.bookId, bookId));
};
export const useGetTravelExpensesKPIs = ({ db, user, bookId, latestMonth }: { db: SQLJsDatabase | undefined, user: string | undefined, bookId: string | undefined, latestMonth: DateTime | undefined }) => {
    const enabled = !!db && !!bookId && !!user && !!latestMonth;

    return useQuery({
        queryKey: ['travelExpensesKPIs', user, bookId, latestMonth?.toISODate()],
        queryFn: !enabled ? skipToken : async () => { const data = await getTravelExpenseKPIsQuery({ db, bookId, user, latestMonth }).execute(); return data[0] },
        enabled: enabled
    })
};

const getUniqueTravelsQuery = ({ db, user, bookId }: { db: SQLJsDatabase, user: string, bookId: string }) => {
    const dbconf = getConfig(user)
    const ft = fullTransactionsQuery(db);
    const accountsFiltered = getAccountsClosureQuery(db, [dbconf.expenses]);

    return db
        .select({
            number: countDistinct(ft.transactions.slNotes)
        })
        .from(ft)
        .innerJoin(accountsFiltered, eq(accountsFiltered.id, ft.splits.account))
        .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
        .where(and(eq(ft.transactions.bookId, bookId), eq(sql<string> `substr(${ft.transactions.slNotes}, 0, ${dbconf.tripDesc.length + 1})`, dbconf.tripDesc)));
};
export const uniqueTravelsOptions = ({ db, user, bookId }: { db: SQLJsDatabase | undefined, user: string | undefined, bookId: string | undefined }) => {
    const enabled = !!db && !!bookId && !!user;
    return queryOptions({
        queryKey: ['uniqueTravels', user, bookId],
        queryFn: !enabled ? skipToken : async () => (await getUniqueTravelsQuery({ db, user, bookId }).execute())[0],
        enabled: !!db && !!bookId
    });

}


