import { SQLJsDatabase } from "drizzle-orm/sql-js"
import { SQL, and, eq, gte, lt, max, min, not, or, sql, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { DateTime } from "luxon";

import { accountsTable, booksTable, splitsTable, timeTable, transactionsTable } from "../schema"
import { accountsClosure } from "../views";

export const getBooks = (db: SQLJsDatabase) => { return db.select().from(booksTable).all(); }
export const getDomain = (db: SQLJsDatabase) => {
    return db.select({
        min: min(transactionsTable.datePosted),
        max: max(transactionsTable.datePosted),
    })
        .from(transactionsTable)
        .all()[0];
};
export const getDomainQuery = (db: SQLJsDatabase) => {
  const accounts = getAccountsQuery(db, ['Gastos']);
  const ft = fullTransactionsQuery(db);
  return db
    .select({ startDate: min(ft.transactions.datePosted), endDate: max(ft.transactions.datePosted) })
    .from(ft)
    .innerJoin(accounts, eq(accounts.id, ft.splits.account));
};
export const getAccountsQuery = (db: SQLJsDatabase, accountNames?: string[], ignoreAccounts?: string[]) => {
  const parent = alias(accountsTable, "parent");
  const child = alias(accountsTable, "child");

  let check;  
  if(accountNames) check = and(check, or(...accountNames.map((name) => eq(parent.name, name))));
  if (ignoreAccounts) {
    const ignore = or(...ignoreAccounts.map((name) => eq(child.name, name)));
    check = and(check, not(ignore!));
  }

  return db
    .selectDistinct({
      id: accountsClosure.child,
      parent: accountsClosure.parent,
      base: sql<string> `${parent.name}`.as('base'),
      name: sql<string> `${child.name}`.as('name'),
    })
    .from(accountsClosure)
    .innerJoin(child, eq(accountsClosure.child, child.id))
    .innerJoin(parent, eq(accountsClosure.parent, parent.id))
    .where(check)
    .as('accountsFiltered');
};

// TODO: Don't really work in drizzle right now
//export const fullTransactions = sqliteView("fullTransactions").as((qb) => qb.select().from(transactions).leftJoin(splits, eq(transactions.id, splits.transactionId)));
export const fullTransactionsQuery = (db: SQLJsDatabase) => {
  return db
    .select()
    .from(transactionsTable)
    .innerJoin(splitsTable, eq(transactionsTable.id, splitsTable.transactionId))
    .innerJoin(accountsTable, eq(accountsTable.id, splitsTable.account))
    .as('ft');
};

export const getSplitSumQuery = (db: SQLJsDatabase, bookId: string, accountNames: string[], startDate?: DateTime, endDate?: DateTime, notes?: string) => {
  const ft = fullTransactionsQuery(db);
  const accounts = getAccountsQuery(db, accountNames);
  let filterQuery: SQL<unknown> | undefined = undefined;
  if (startDate) filterQuery = and(filterQuery, gte(timeTable.ymd, startDate));
  if (endDate) filterQuery = and(filterQuery, lt(timeTable.ymd, endDate));
  if (notes) filterQuery = and(filterQuery, eq(sql<string> `substr(${ft.transactions.slNotes}, 0, ${notes.length + 1})`, notes));

  return db
    .select({ 'value': sum(ft.splits.value).mapWith(Number) })
    .from(ft)
    .innerJoin(accounts, eq(accounts.id, ft.splits.account))
    .innerJoin(timeTable, eq(timeTable.ymd, sql`substr(${ft.transactions.datePosted}, 0, 11)`))
    .where(and(eq(ft.transactions.bookId, bookId), filterQuery));
};

