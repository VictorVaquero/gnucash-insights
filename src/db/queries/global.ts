import {
  SQL,
  and,
  eq,
  getTableColumns,
  gte,
  lt,
  not,
  or,
  sql,
  sum,
} from "drizzle-orm";
import { SQLJsDatabase } from "drizzle-orm/sql-js";
import { alias } from "drizzle-orm/sqlite-core";
import { DateTime } from "luxon";

import { queryOptions, skipToken } from "@tanstack/react-query";
import {
  accountsClosureTable,
  accountsTable,
  booksTable,
  fullTransactionsTable,
  metaTable,
  pricesTable,
  timeTable,
  transactionsTable,
} from "../schema";

export const getBooks = (db: SQLJsDatabase) => {
  return db.select().from(booksTable).all();
};
export const getDomain = (db: SQLJsDatabase) => {
  return db
    .select({
      min: metaTable.minDate,
      max: metaTable.maxDate,
    })
    .from(metaTable)
    .all()[0];
};

const getAccounts = ({
  db,
  accountIds,
}: {
  db: SQLJsDatabase;
  accountIds: string[];
}) => {
  const accountsFiltered = getAccountsClosureQuery(db, accountIds);
  return db
    .selectDistinct({
      ...getTableColumns(accountsTable),
    })
    .from(accountsTable)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, accountsTable.id));
};

export type AccountsData = Awaited<
  ReturnType<ReturnType<typeof getAccounts>["execute"]>
>;
export const accountsOptions = <TData = AccountsData>(args: {
  db: SQLJsDatabase | undefined;
  bookId: string | undefined;
  accountIds?: string[];
  select?: (data: AccountsData) => TData;
}) => {
  const { db, bookId, accountIds, select } = args;

  const cleanAccountIds = accountIds?.filter(Boolean) ?? [];
  const isEnabled = !!db && !!bookId;

  return queryOptions({
    queryKey: ["accounts", bookId, [...cleanAccountIds].sort()] as const,
    queryFn: !isEnabled
      ? skipToken
      : async () => {
          const query = getAccounts({
            db: db,
            accountIds: cleanAccountIds,
          });
          return await query.execute();
        },

    enabled: isEnabled,
    select,
  });
};

export const getAccountsClosureQuery = (
  db: SQLJsDatabase,
  accountNames?: string[],
  ignoreAccounts?: string[]
) => {
  const parent = alias(accountsTable, "parent");
  const child = alias(accountsTable, "child");

  let check;
  if (accountNames)
    check = and(check, or(...accountNames.map((name) => eq(parent.id, name))));
  if (ignoreAccounts && ignoreAccounts.length > 0) {
    const ignore = or(...ignoreAccounts.map((name) => eq(child.id, name)));
    check = and(check, not(ignore as SQL<string>));
  }

  return db
    .selectDistinct({
      id: accountsClosureTable.child,
      parent: accountsClosureTable.parent,
      base: sql<string>`${parent.name}`.as("base"),
      name: sql<string>`${child.name}`.as("name"),
    })
    .from(accountsClosureTable)
    .innerJoin(child, eq(accountsClosureTable.child, child.id))
    .innerJoin(parent, eq(accountsClosureTable.parent, parent.id))
    .where(check)
    .as("accountsFiltered");
};

const maxPricesQuery = (db: SQLJsDatabase) => {
  return db
    .select({
      bookId: pricesTable.bookId,
      currency: pricesTable.currency,
      commodity: pricesTable.commodity,
      year: timeTable.year,
      month: timeTable.month,
      price: sql`COALESCE(MAX(${pricesTable.value}), 1)`.as("price"),
    })
    .from(timeTable)
    .leftJoin(
      pricesTable,
      eq(timeTable.ymd, sql`substr(${pricesTable.time}, 0, 11)`)
    )
    .groupBy(
      pricesTable.bookId,
      pricesTable.currency,
      pricesTable.commodity,
      timeTable.year,
      timeTable.month
    )
    .orderBy(
      pricesTable.bookId,
      pricesTable.currency,
      pricesTable.commodity,
      timeTable.year,
      timeTable.month
    )
    .as("maxPrices");
};

export const fullTransactionsQuery = (db: SQLJsDatabase) => {
  return db
    .select({
      ...getTableColumns(fullTransactionsTable),
      accountType: accountsTable.accountType,
      description: transactionsTable.description,
      slNotes: transactionsTable.slNotes,
    })
    .from(fullTransactionsTable)
    .innerJoin(
      accountsTable,
      eq(accountsTable.id, fullTransactionsTable.accountId)
    )
    .innerJoin(
      transactionsTable,
      eq(transactionsTable.id, fullTransactionsTable.transactionId)
    )
    .as("ft");
};
export const fullTransactionsOptions = (
  db?: SQLJsDatabase,
  bookId?: string
) => {
  const enabled = !!db && !!bookId;
  return queryOptions({
    queryKey: ["fullTransactions", bookId],
    queryFn: !enabled
      ? skipToken
      : async () => db.select().from(fullTransactionsQuery(db)).execute(),
    enabled: enabled,
  });
};

const getSplitSumQuery = (
  db: SQLJsDatabase,
  bookId: string,
  accountNames: string[],
  startDate?: DateTime,
  endDate?: DateTime,
  notes?: string
) => {
  const ft = fullTransactionsQuery(db);
  const accounts = getAccountsClosureQuery(db, accountNames);
  let filterQuery: SQL<unknown> | undefined = undefined;
  if (startDate) filterQuery = and(filterQuery, gte(timeTable.ymd, startDate));
  if (endDate) filterQuery = and(filterQuery, lt(timeTable.ymd, endDate));
  if (notes)
    filterQuery = and(
      filterQuery,
      eq(
        sql<string>`substr(${transactionsTable.slNotes}, 0, ${
          notes.length + 1
        })`,
        notes
      )
    );

  return db
    .select({ value: sum(ft.value).mapWith(Number) })
    .from(ft)
    .innerJoin(accounts, eq(accounts.id, ft.accountId))
    .innerJoin(transactionsTable, eq(transactionsTable.id, ft.transactionId))
    .innerJoin(timeTable, eq(timeTable.ymd, ft.ymdPosted))
    .where(and(eq(ft.bookId, bookId), filterQuery));
};
export const splitSumOptions = (
  db: SQLJsDatabase | undefined,
  bookId: string | undefined,
  accountNames: string[],
  startDate?: DateTime,
  endDate?: DateTime,
  notes?: string
) => {
  const enabled = !!db && !!bookId;
  return queryOptions({
    queryKey: [
      "splitSum",
      bookId,
      ...accountNames,
      startDate?.toISO(),
      endDate?.toISO(),
      notes,
    ],
    queryFn: !enabled
      ? skipToken
      : async () => {
          const data = await getSplitSumQuery(
            db,
            bookId,
            accountNames,
            startDate,
            endDate,
            notes
          ).execute();
          return data[0].value;
        },
    enabled: enabled,
  });
};
