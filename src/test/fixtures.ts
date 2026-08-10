import { DateTime } from "luxon";
import type { AppDatabase } from "@/db/dbType";
import {
  accountsClosureTable,
  accountsTable,
  booksTable,
  commoditiesTable,
  fullTransactionsTable,
  metaTable,
  timeTable,
  transactionsTable,
} from "@/db/schema";

export const BOOK_ID = "book-1";
export const CURRENCY_ID = "cur-eur";

/**
 * A small account hierarchy used across query tests:
 *   root
 *     exp (EXPENSE)
 *       exp-groceries (EXPENSE)
 *       exp-transport (EXPENSE)
 *     inc (INCOME)
 *       inc-salary (INCOME)
 */
export const ACCOUNTS = {
  root: { id: "root", name: "Root", accountType: "ROOT", parent: null },
  exp: { id: "exp", name: "Expenses", accountType: "EXPENSE", parent: "root" },
  expGroceries: {
    id: "exp-groceries",
    name: "Groceries",
    accountType: "EXPENSE",
    parent: "exp",
  },
  expTransport: {
    id: "exp-transport",
    name: "Transport",
    accountType: "EXPENSE",
    parent: "exp",
  },
  inc: { id: "inc", name: "Income", accountType: "INCOME", parent: "root" },
  incSalary: { id: "inc-salary", name: "Salary", accountType: "INCOME", parent: "inc" },
} as const;

export const MIN_DATE = DateTime.fromISO("2023-01-01T00:00:00.000Z", { setZone: true });
export const MAX_DATE = DateTime.fromISO("2024-01-01T00:00:00.000Z", { setZone: true });

const ymd = (iso: string) => DateTime.fromISO(iso, { setZone: true });

const timeRows = [
  { ymd: "2023-01-15T00:00:00.000Z", year: 2023, month: 1, day: 15 },
  { ymd: "2023-03-05T00:00:00.000Z", year: 2023, month: 3, day: 5 },
  { ymd: "2023-06-10T00:00:00.000Z", year: 2023, month: 6, day: 10 },
  { ymd: "2024-02-20T00:00:00.000Z", year: 2024, month: 2, day: 20 },
].map((row) => ({
  ymd: row.ymd,
  year: row.year,
  month: row.month,
  day: row.day,
  yearmonth: `${row.year}-${String(row.month).padStart(2, "0")}`,
  monthName: DateTime.fromISO(row.ymd).toFormat("LLLL"),
  weekDayNum: DateTime.fromISO(row.ymd).weekday,
  weekDayName: DateTime.fromISO(row.ymd).toFormat("cccc"),
}));

/** Leaf-level transactions; totals below are hand-computed from these exact rows. */
export const TRANSACTIONS = [
  {
    id: "txn-1",
    splitId: "split-1",
    accountId: ACCOUNTS.expGroceries.id,
    value: -50,
    ymdPosted: "2023-01-15T00:00:00.000Z",
    slNotes: null as string | null,
  },
  {
    id: "txn-2",
    splitId: "split-2",
    accountId: ACCOUNTS.expGroceries.id,
    value: -30,
    ymdPosted: "2023-06-10T00:00:00.000Z",
    slNotes: null as string | null,
  },
  {
    id: "txn-3",
    splitId: "split-3",
    accountId: ACCOUNTS.expTransport.id,
    value: -20,
    ymdPosted: "2023-03-05T00:00:00.000Z",
    slNotes: null as string | null,
  },
  {
    id: "txn-4",
    splitId: "split-4",
    accountId: ACCOUNTS.expGroceries.id,
    value: -40,
    ymdPosted: "2024-02-20T00:00:00.000Z",
    slNotes: null as string | null,
  },
  {
    id: "txn-5",
    splitId: "split-5",
    accountId: ACCOUNTS.incSalary.id,
    value: 1000,
    ymdPosted: "2023-01-15T00:00:00.000Z",
    slNotes: null as string | null,
  },
  {
    id: "txn-6",
    splitId: "split-6",
    accountId: ACCOUNTS.expGroceries.id,
    value: -25,
    ymdPosted: "2023-01-15T00:00:00.000Z",
    slNotes: "Trip:Paris weekend" as string | null,
  },
];

/** Prefix recognized by travel queries (`dbconf.tripDesc`) to tag trip-related transactions. */
export const TRIP_DESC = "Trip:";

/** Seeds a freshly-created test db with a deterministic fixture dataset. */
export const seedFixtures = async (db: AppDatabase) => {
  await db.insert(booksTable).values({
    id: BOOK_ID,
    version: "2.0.0",
    countAccount: Object.keys(ACCOUNTS).length,
    countCommodity: 1,
    countPrice: 0,
    countSchedxaction: 0,
    countTransaction: TRANSACTIONS.length,
  });

  await db.insert(accountsTable).values(
    Object.values(ACCOUNTS).map((account) => ({
      bookId: BOOK_ID,
      id: account.id,
      name: account.name,
      accountType: account.accountType,
      parent: account.parent,
    })),
  );

  // Closure table: every (ancestor, descendant) pair including self (depth 0).
  const closurePairs: { parent: string; child: string; depth: number }[] = [];
  const byId = Object.fromEntries(Object.values(ACCOUNTS).map((a) => [a.id, a]));
  for (const account of Object.values(ACCOUNTS)) {
    let current: (typeof ACCOUNTS)[keyof typeof ACCOUNTS] | undefined = account;
    let depth = 0;
    while (current) {
      closurePairs.push({ parent: current.id, child: account.id, depth });
      current = current.parent ? byId[current.parent] : undefined;
      depth += 1;
    }
  }
  await db.insert(accountsClosureTable).values(
    closurePairs.map((pair) => ({
      bookId: BOOK_ID,
      child: pair.child,
      parent: pair.parent,
      depth: pair.depth,
    })),
  );

  await db.insert(commoditiesTable).values({
    bookId: BOOK_ID,
    id: CURRENCY_ID,
    space: "ISO4217",
    name: "Euro",
    fraction: 100,
    code: "EUR",
  });

  await db.insert(metaTable).values({
    countBook: 1,
    parsedDate: MIN_DATE.toISODate(),
    parsedVersion: "1",
    minDate: MIN_DATE,
    maxDate: MAX_DATE,
  });

  await db.insert(timeTable).values(
    timeRows.map((row) => ({
      ymd: ymd(row.ymd),
      year: row.year,
      month: row.month,
      day: row.day,
      yearmonth: row.yearmonth,
      monthName: row.monthName,
      weekDayNum: row.weekDayNum,
      weekDayName: row.weekDayName,
    })),
  );

  await db.insert(transactionsTable).values(
    TRANSACTIONS.map((t) => ({
      bookId: BOOK_ID,
      id: t.id,
      dateEntered: ymd(t.ymdPosted),
      datePosted: ymd(t.ymdPosted),
      ymdPosted: ymd(t.ymdPosted),
      currencyId: CURRENCY_ID,
      description: t.id,
      slNotes: t.slNotes,
    })),
  );

  await db.insert(fullTransactionsTable).values(
    TRANSACTIONS.map((t) => ({
      bookId: BOOK_ID,
      transactionId: t.id,
      accountId: t.accountId,
      splitId: t.splitId,
      accountName: byId[t.accountId].name,
      datePosted: ymd(t.ymdPosted),
      ymdPosted: t.ymdPosted,
      currencyId: CURRENCY_ID,
      value: t.value,
    })),
  );
};
