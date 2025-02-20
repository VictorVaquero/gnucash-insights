import { SQL, and, eq, gte, lt, max, min, not, or, sql, sum } from "drizzle-orm";
import { SQLJsDatabase } from "drizzle-orm/sql-js";
import { alias } from "drizzle-orm/sqlite-core";
import { DateTime } from "luxon";

import { queryOptions, skipToken } from "@tanstack/react-query";
import { accountsTable, booksTable, splitsTable, timeTable, transactionsTable } from "../schema";
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
  const accounts = getAccountsClosureQuery(db, ['Gastos']);
  const ft = fullTransactionsQuery(db);
  return db
    .select({ startDate: min(ft.transactions.datePosted), endDate: max(ft.transactions.datePosted) })
    .from(ft)
    .innerJoin(accounts, eq(accounts.id, ft.splits.account));
};

export const accountsOptions = (db?: SQLJsDatabase, bookId?: string) => {
  const enabled = !!db && !!bookId;
  return queryOptions({
    queryKey: ['accounts', bookId],
    queryFn: !enabled ? skipToken : async () => db.select().from(accountsTable).execute(),
    enabled: enabled
  })
}
export const getAccountsClosureQuery = (db: SQLJsDatabase, accountNames?: string[], ignoreAccounts?: string[]) => {
  const parent = alias(accountsTable, "parent");
  const child = alias(accountsTable, "child");

  let check;
  if (accountNames) check = and(check, or(...accountNames.map((name) => eq(parent.name, name))));
  if (ignoreAccounts) {
    const ignore = or(...ignoreAccounts.map((name) => eq(child.name, name)));
    check = and(check, not(ignore as SQL<string>));
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
export const fullTransactionsOptions = (db?: SQLJsDatabase, bookId?: string) => {
  const enabled = !!db && !!bookId;
  return queryOptions({
    queryKey: ['fullTransactions', bookId],
    queryFn: !enabled ? skipToken : async () => db.select().from(fullTransactionsQuery(db)).execute(),
    enabled: enabled
  })
}

export const getSplitSumQuery = (db: SQLJsDatabase, bookId: string, accountNames: string[], startDate?: DateTime, endDate?: DateTime, notes?: string) => {
  const ft = fullTransactionsQuery(db);
  const accounts = getAccountsClosureQuery(db, accountNames);
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
export const splitSumOptions = (db: SQLJsDatabase | undefined, bookId: string | undefined, accountNames: string[], startDate?: DateTime, endDate?: DateTime, notes?: string) => {
  const enabled = !!db && !!bookId;
  return queryOptions({
    queryKey: ['splitSum', bookId, ...accountNames, startDate?.toISO(), endDate?.toISO(), notes],
    queryFn: !enabled ? skipToken : async () => {
      const data = await getSplitSumQuery(db, bookId, accountNames, startDate, endDate, notes).execute(); return data[0].value;
    },
    enabled: enabled
  })
}
