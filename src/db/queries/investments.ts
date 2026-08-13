import { queryOptions, skipToken } from "@tanstack/react-query";
import { and, asc, eq, inArray, ne } from "drizzle-orm";

import { AnyDB } from "../dbType";
import {
  accountsTable,
  commoditiesTable,
  pricesTable,
  splitsTable,
  transactionsTable,
} from "../schema";
import { getAccountsClosureQuery } from "./global";

// GnuCash tags every commodity with a "space": currencies live in "ISO4217", tradeable
// securities live in a ticker namespace (NASDAQ, NYSE, AMEX, FUND, XETRA, ...). An account
// under Investments whose commodity isn't a currency is a holding; parent/grouping accounts
// in that tree have no commodity at all and are dropped by the inner join below.
const CURRENCY_SPACE = "ISO4217";

const getHoldingAccountsQuery = <TDB extends AnyDB>({
  db,
  bookId,
  investmentsAccountId,
}: {
  db: TDB;
  bookId: string;
  investmentsAccountId: string;
}) => {
  const accountsFiltered = getAccountsClosureQuery(db, [investmentsAccountId]);
  return db
    .selectDistinct({
      id: accountsTable.id,
      name: accountsTable.name,
      commodityId: commoditiesTable.id,
      ticker: commoditiesTable.code,
      commodityName: commoditiesTable.name,
    })
    .from(accountsTable)
    .innerJoin(accountsFiltered, eq(accountsFiltered.id, accountsTable.id))
    .innerJoin(commoditiesTable, eq(commoditiesTable.id, accountsTable.commodity))
    .where(and(eq(accountsTable.bookId, bookId), ne(commoditiesTable.space, CURRENCY_SPACE)));
};

export type HoldingAccount = Awaited<
  ReturnType<ReturnType<typeof getHoldingAccountsQuery>["execute"]>
>[number];

export const holdingAccountsOptions = <TDB extends AnyDB>({
  db,
  bookId,
  investmentsAccountId,
}: {
  db: TDB | undefined;
  bookId: string | undefined;
  investmentsAccountId: string | undefined;
}) => {
  const enabled = !!db && !!bookId && !!investmentsAccountId;
  return queryOptions({
    queryKey: ["holdingAccounts", bookId, investmentsAccountId],
    queryFn: !enabled
      ? skipToken
      : async () => getHoldingAccountsQuery({ db, bookId, investmentsAccountId }).execute(),
    enabled,
  });
};

const getHoldingLotsQuery = <TDB extends AnyDB>({
  db,
  bookId,
  accountIds,
}: {
  db: TDB;
  bookId: string;
  accountIds: string[];
}) => {
  return db
    .select({
      accountId: splitsTable.account,
      date: transactionsTable.datePosted,
      quantity: splitsTable.quantity,
      value: splitsTable.value,
    })
    .from(splitsTable)
    .innerJoin(transactionsTable, eq(transactionsTable.id, splitsTable.transactionId))
    .where(and(eq(transactionsTable.bookId, bookId), inArray(splitsTable.account, accountIds)))
    .orderBy(asc(transactionsTable.datePosted));
};

export type HoldingLot = Awaited<
  ReturnType<ReturnType<typeof getHoldingLotsQuery>["execute"]>
>[number];

export const holdingLotsOptions = <TDB extends AnyDB>({
  db,
  bookId,
  accountIds,
}: {
  db: TDB | undefined;
  bookId: string | undefined;
  accountIds: string[];
}) => {
  const enabled = !!db && !!bookId && accountIds.length > 0;
  return queryOptions({
    queryKey: ["holdingLots", bookId, [...accountIds].sort()] as const,
    queryFn: !enabled
      ? skipToken
      : async () => getHoldingLotsQuery({ db, bookId, accountIds }).execute(),
    enabled,
  });
};

const getCommodityPricesQuery = <TDB extends AnyDB>({
  db,
  bookId,
  commodityIds,
}: {
  db: TDB;
  bookId: string;
  commodityIds: string[];
}) => {
  return db
    .select({
      commodityId: pricesTable.commodity,
      date: pricesTable.time,
      value: pricesTable.value,
    })
    .from(pricesTable)
    .where(and(eq(pricesTable.bookId, bookId), inArray(pricesTable.commodity, commodityIds)))
    .orderBy(asc(pricesTable.time));
};

export type CommodityPrice = Awaited<
  ReturnType<ReturnType<typeof getCommodityPricesQuery>["execute"]>
>[number];

export const commodityPricesOptions = <TDB extends AnyDB>({
  db,
  bookId,
  commodityIds,
}: {
  db: TDB | undefined;
  bookId: string | undefined;
  commodityIds: string[];
}) => {
  const enabled = !!db && !!bookId && commodityIds.length > 0;
  return queryOptions({
    queryKey: ["commodityPrices", bookId, [...commodityIds].sort()] as const,
    queryFn: !enabled
      ? skipToken
      : async () => getCommodityPricesQuery({ db, bookId, commodityIds }).execute(),
    enabled,
  });
};
