import { SQLJsDatabase } from "drizzle-orm/sql-js";
import { fullTransactionsQuery, getAccountsQuery, getDomain } from "./global";
import { accountsTable, timeTable } from "../schema";
import { sql, and, eq } from "drizzle-orm";
import { subqueryColumnName } from "../utils";

export const getExpensesYearlyQuery = (db: SQLJsDatabase, bookId: string) => {
    const ft = fullTransactionsQuery(db);
    const accounts = getAccountsQuery(db);
    const { min, max } = getDomain(db)
    const yearRange = Array.from({ length: max!.diff(min!, ['years']).years + 1 }, (_value, index) => min!.year + index);

    return db
        .select({
            name: subqueryColumnName<string>(accounts, accounts.base).as('name'),
            id: accounts.parent,
            parentId: accountsTable.parent,
            total: sql<number>`sum(${ft.splits.value})`,
            last: sql<number>`sum(CASE WHEN ${timeTable.year} = ${max!.year} THEN ${ft.splits.value} ELSE 0 END) `,
            ...yearRange.reduce((prev, y) => ({ ...prev, [y.toString()]: sql<number>`sum(CASE WHEN ${timeTable.year} = ${y} THEN ${ft.splits.value} ELSE 0 END) ` }), {})
        })
        .from(accounts)
        .innerJoin(ft, eq(accounts.id, ft.splits.account))
        .innerJoin(accountsTable, eq(accountsTable.id, accounts.parent))
        .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
        .where(and(eq(ft.transactions.bookId, bookId), eq(accountsTable.accountType, 'EXPENSE')))
        .groupBy(subqueryColumnName<string>(accounts, accounts.base))
        .orderBy(subqueryColumnName<string>(accounts, accounts.base))
}