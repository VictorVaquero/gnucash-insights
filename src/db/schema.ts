import { InferSelectModel } from "drizzle-orm";
import { AnySQLiteColumn, customType, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { DateTime } from 'luxon';

const customDateTime = customType<
  { data: DateTime; driverData: string; }
>({
  dataType() {
    return 'DateTime'
  },
  fromDriver(value: string): DateTime {
    return DateTime.fromISO(value)
  },
  toDriver(value: DateTime): string {
    return value.toISO() ?? ''
  },
});

export const meta = sqliteTable('meta', {
  countBook: integer(),
  parsedDate: text(),
  parsedVersion: text()
});
export type Meta = InferSelectModel<typeof meta>

export const booksTable = sqliteTable('books', {
  id: text().primaryKey(),
  version: text().notNull(),
  countAccount: integer().notNull(),
  countCommodity: integer().notNull(),
  countPrice: integer().notNull(),
  countSchedxaction: integer().notNull(),
  countTransaction: integer().notNull()
});
export type Book = InferSelectModel<typeof booksTable>

export const accountsTable = sqliteTable('accounts', {
  bookId: text().notNull().references(() => booksTable.id),
  id: text().primaryKey(),
  name: text().notNull(),
  accountType: text().notNull(),
  parent: text().references((): AnySQLiteColumn => accountsTable.id),
  commodity: text().references(() => commoditiesTable.id),
  scu: integer(),
  description: text(),
});
export type Account = InferSelectModel<typeof accountsTable>

export const commoditiesTable = sqliteTable('commodities', {
  bookId: text().notNull().references(() => booksTable.id),
  id: text().primaryKey(),
  space: text().notNull(),
  name: text(),
  fraction: integer(),
  version: text(),
  code: text(),
});
export type Commodity = InferSelectModel<typeof commoditiesTable>

export const pricesTable = sqliteTable('prices', {
  bookId: text().notNull().references(() => booksTable.id),
  id: text().primaryKey(),
  source: text().notNull(),
  priceType: text().notNull(),
  time: customDateTime().notNull(),
  commodity: text().notNull().references(() => commoditiesTable.id),
  currency: text().notNull().references(() => commoditiesTable.id),
  value: real().notNull()
});
export type Price = InferSelectModel<typeof pricesTable>



export const transactionsTable = sqliteTable('transactions', {
  bookId: text().notNull().references(() => booksTable.id),
  id: text().primaryKey(),
  dateEntered: customDateTime().notNull(),
  datePosted: customDateTime().notNull(),
  currencyId: text().notNull().references(() => commoditiesTable.id),
  description: text(),
  slDatePosted: text(),
  slFromSchedXaction: text(),
  slNotes: text(),
});
export type Transaction = InferSelectModel<typeof transactionsTable>


export const splitsTable = sqliteTable('splits', {
  transactionId: text().notNull().references(() => transactionsTable.id),
  id: text().primaryKey(),
  account: text().notNull(),
  value: real().notNull(),
  quantity: real().notNull(),
  isReconciled: text('isReconciled').notNull(),
  reconciledDate: customDateTime().notNull(),
  action: text(),
  memo: text(),
});
export type Split = InferSelectModel<typeof splitsTable>


export const timeTable = sqliteTable('timetable', {
  ymd: customDateTime().primaryKey(),
  year: integer().notNull(),
  month: integer().notNull(),
  day: integer().notNull(),
  yearmonth: text().notNull(),
  monthName: text().notNull(),
  weekDayNum: integer(),
  weekDayName: text().notNull()
});
export type Time = InferSelectModel<typeof timeTable>

