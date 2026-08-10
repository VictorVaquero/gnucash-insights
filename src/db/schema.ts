import { InferSelectModel } from "drizzle-orm";
import {
  AnySQLiteColumn,
  customType,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { DateTime } from "luxon";

const customDateTime = customType<{ data: DateTime; driverData: string }>({
  dataType() {
    return "DateTime";
  },
  fromDriver(value: string): DateTime {
    return DateTime.fromISO(value);
  },
  toDriver(value: DateTime): string {
    return value.toISO() ?? "";
  },
});

export const metaTable = sqliteTable("meta", {
  countBook: integer(),
  parsedDate: text(),
  parsedVersion: text(),
  minDate: customDateTime(),
  maxDate: customDateTime(),
});
/** @public Row type for the `meta` table; part of the schema's typed query surface. */
export type Meta = InferSelectModel<typeof metaTable>;

export const booksTable = sqliteTable("books", {
  id: text().primaryKey(),
  version: text().notNull(),
  countAccount: integer().notNull(),
  countCommodity: integer().notNull(),
  countPrice: integer().notNull(),
  countSchedxaction: integer().notNull(),
  countTransaction: integer().notNull(),
});
/** @public Row type for the `books` table; part of the schema's typed query surface. */
export type Book = InferSelectModel<typeof booksTable>;

export const accountsTable = sqliteTable("accounts", {
  bookId: text()
    .notNull()
    .references(() => booksTable.id),
  id: text().primaryKey(),
  name: text().notNull(),
  accountType: text().notNull(),
  parent: text().references((): AnySQLiteColumn => accountsTable.id),
  commodity: text().references(() => commoditiesTable.id),
  scu: integer(),
  description: text(),
});
export type Account = InferSelectModel<typeof accountsTable>;

/** @public Mirrors the real GnuCash `commodities` table; kept for schema completeness even though no current query joins against it. */
export const commoditiesTable = sqliteTable("commodities", {
  bookId: text()
    .notNull()
    .references(() => booksTable.id),
  id: text().primaryKey(),
  space: text().notNull(),
  name: text(),
  fraction: integer(),
  version: text(),
  code: text(),
});
/** @public Row type for the `commodities` table; part of the schema's typed query surface. */
export type Commodity = InferSelectModel<typeof commoditiesTable>;

/** @public Mirrors the real GnuCash `prices` table; kept for schema completeness even though no current query joins against it. */
export const pricesTable = sqliteTable("prices", {
  bookId: text()
    .notNull()
    .references(() => booksTable.id),
  id: text().primaryKey(),
  source: text().notNull(),
  priceType: text().notNull(),
  time: customDateTime().notNull(),
  commodity: text()
    .notNull()
    .references(() => commoditiesTable.id),
  currency: text()
    .notNull()
    .references(() => commoditiesTable.id),
  value: real().notNull(),
});
/** @public Row type for the `prices` table; part of the schema's typed query surface. */
export type Price = InferSelectModel<typeof pricesTable>;

export const transactionsTable = sqliteTable("transactions", {
  bookId: text()
    .notNull()
    .references(() => booksTable.id),
  id: text().primaryKey(),
  dateEntered: customDateTime().notNull(),
  datePosted: customDateTime().notNull(),
  ymdPosted: customDateTime().notNull(),
  currencyId: text()
    .notNull()
    .references(() => commoditiesTable.id),
  description: text(),
  slDatePosted: text(),
  slFromSchedXaction: text(),
  slNotes: text(),
});
/** @public Row type for the `transactions` table; part of the schema's typed query surface. */
export type Transaction = InferSelectModel<typeof transactionsTable>;

export const splitsTable = sqliteTable("splits", {
  transactionId: text()
    .notNull()
    .references(() => transactionsTable.id),
  id: text().primaryKey(),
  account: text().notNull(),
  value: real().notNull(),
  quantity: real().notNull(),
  isReconciled: text("isReconciled").notNull(),
  reconciledDate: customDateTime().notNull(),
  action: text(),
  memo: text(),
});
/** @public Row type for the `splits` table; part of the schema's typed query surface. */
export type Split = InferSelectModel<typeof splitsTable>;

export const timeTable = sqliteTable("timetable", {
  ymd: customDateTime().primaryKey(),
  year: integer().notNull(),
  month: integer().notNull(),
  day: integer().notNull(),
  yearmonth: text().notNull(),
  monthName: text().notNull(),
  weekDayNum: integer(),
  weekDayName: text().notNull(),
});
/** @public Row type for the `timetable` table; part of the schema's typed query surface. */
export type Time = InferSelectModel<typeof timeTable>;

/// EXTRA TABLES

export const accountsClosureTable = sqliteTable("accountsClosure", {
  bookId: text()
    .notNull()
    .references(() => booksTable.id),
  child: text().references((): AnySQLiteColumn => accountsTable.id),
  parent: text().references((): AnySQLiteColumn => accountsTable.id),
  depth: integer(),
});
/** @public Row type for the `accountsClosure` table; part of the schema's typed query surface. */
export type AccountClosure = InferSelectModel<typeof accountsClosureTable>;

export const summaryMonthlyTable = sqliteTable("summary_monthly", {
  date: text().notNull(),
  dateLabel: text().notNull(),
  accountId: text()
    .notNull()
    .references(() => accountsTable.id),
  accountName: text().primaryKey(),
  totalValue: real().notNull(),
});
/** @public Row type for the `summary_monthly` table; part of the schema's typed query surface. */
export type SummaryMonthly = InferSelectModel<typeof summaryMonthlyTable>;

export const summaryQuarterlyTable = sqliteTable("summary_quarterly", {
  date: text().notNull(),
  dateLabel: text().notNull(),
  accountId: text()
    .notNull()
    .references(() => accountsTable.id),
  accountName: text().primaryKey(),
  totalValue: real().notNull(),
});
/** @public Row type for the `summary_quarterly` table; part of the schema's typed query surface. */
export type SummaryQuarterly = InferSelectModel<typeof summaryQuarterlyTable>;
export const summaryYearlyTable = sqliteTable("summary_yearly", {
  date: text().notNull(),
  dateLabel: text().notNull(),
  accountId: text()
    .notNull()
    .references(() => accountsTable.id),
  accountName: text().primaryKey(),
  totalValue: real().notNull(),
});
/** @public Row type for the `summary_yearly` table; part of the schema's typed query surface. */
export type SummaryYearly = InferSelectModel<typeof summaryYearlyTable>;

// TODO: Add slNotes, dsecription
export const fullTransactionsTable = sqliteTable("fullTransactions", {
  bookId: text()
    .notNull()
    .references(() => booksTable.id),
  transactionId: text()
    .notNull()
    .references(() => transactionsTable.id),
  accountId: text()
    .notNull()
    .references(() => accountsTable.id),
  splitId: text().primaryKey(),
  accountName: text().notNull(),
  datePosted: customDateTime().notNull(),
  ymdPosted: text().notNull(),
  currencyId: text()
    .notNull()
    .references(() => commoditiesTable.id),
  value: real().notNull(),
});
/** @public Row type for the `fullTransactions` table; part of the schema's typed query surface. */
export type FullTransaction = InferSelectModel<typeof fullTransactionsTable>;
