import { beforeEach, describe, expect, it } from "vitest";
import { DateTime } from "luxon";

import type { AppDatabase } from "@/db/dbType";
import { createTestDb } from "@/test/db";
import {
  accountsClosureTable,
  accountsTable,
  booksTable,
  commoditiesTable,
  pricesTable,
  splitsTable,
  transactionsTable,
} from "@/db/schema";

import { commodityPricesOptions, holdingAccountsOptions, holdingLotsOptions } from "./investments";

const BOOK_ID = "book-inv";
const CURRENCY_ID = "cur-eur";
const INVESTMENTS_ID = "acc-investments";
const BROKER_ID = "acc-broker"; // grouping account, no commodity of its own
const VWCE_ACCOUNT_ID = "acc-vwce";
const VWCE_COMMODITY_ID = "com-vwce";

const ymd = (iso: string) => DateTime.fromISO(iso, { setZone: true });

describe("db/queries/investments", () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = await createTestDb();

    await db.insert(booksTable).values({
      id: BOOK_ID,
      version: "2.0.0",
      countAccount: 4,
      countCommodity: 2,
      countPrice: 2,
      countSchedxaction: 0,
      countTransaction: 2,
    });

    await db.insert(commoditiesTable).values([
      {
        bookId: BOOK_ID,
        id: CURRENCY_ID,
        space: "ISO4217",
        name: "Euro",
        fraction: 100,
        code: "EUR",
      },
      {
        bookId: BOOK_ID,
        id: VWCE_COMMODITY_ID,
        space: "XETRA",
        name: "Vanguard FTSE All-World",
        fraction: 100000,
        code: "VWCE",
      },
    ]);

    await db.insert(accountsTable).values([
      {
        bookId: BOOK_ID,
        id: INVESTMENTS_ID,
        name: "Investments",
        accountType: "ASSET",
        parent: null,
        commodity: CURRENCY_ID,
      },
      {
        bookId: BOOK_ID,
        id: BROKER_ID,
        name: "Broker",
        accountType: "ASSET",
        parent: INVESTMENTS_ID,
        commodity: CURRENCY_ID,
      },
      {
        bookId: BOOK_ID,
        id: VWCE_ACCOUNT_ID,
        name: "VWCE",
        accountType: "STOCK",
        parent: BROKER_ID,
        commodity: VWCE_COMMODITY_ID,
      },
    ]);

    // Closure table: every (ancestor, descendant) pair including self (depth 0).
    await db.insert(accountsClosureTable).values([
      { bookId: BOOK_ID, parent: INVESTMENTS_ID, child: INVESTMENTS_ID, depth: 0 },
      { bookId: BOOK_ID, parent: INVESTMENTS_ID, child: BROKER_ID, depth: 1 },
      { bookId: BOOK_ID, parent: INVESTMENTS_ID, child: VWCE_ACCOUNT_ID, depth: 2 },
      { bookId: BOOK_ID, parent: BROKER_ID, child: BROKER_ID, depth: 0 },
      { bookId: BOOK_ID, parent: BROKER_ID, child: VWCE_ACCOUNT_ID, depth: 1 },
      { bookId: BOOK_ID, parent: VWCE_ACCOUNT_ID, child: VWCE_ACCOUNT_ID, depth: 0 },
    ]);

    await db.insert(transactionsTable).values([
      {
        bookId: BOOK_ID,
        id: "txn-buy-1",
        dateEntered: ymd("2023-01-10T00:00:00.000Z"),
        datePosted: ymd("2023-01-10T00:00:00.000Z"),
        ymdPosted: ymd("2023-01-10T00:00:00.000Z"),
        currencyId: CURRENCY_ID,
        description: "Buy VWCE",
      },
      {
        bookId: BOOK_ID,
        id: "txn-buy-2",
        dateEntered: ymd("2023-06-10T00:00:00.000Z"),
        datePosted: ymd("2023-06-10T00:00:00.000Z"),
        ymdPosted: ymd("2023-06-10T00:00:00.000Z"),
        currencyId: CURRENCY_ID,
        description: "Buy VWCE",
      },
    ]);

    await db.insert(splitsTable).values([
      {
        transactionId: "txn-buy-1",
        id: "split-buy-1",
        account: VWCE_ACCOUNT_ID,
        value: 1000,
        quantity: 10,
        isReconciled: "n",
        reconciledDate: ymd("2023-01-10T00:00:00.000Z"),
      },
      {
        transactionId: "txn-buy-2",
        id: "split-buy-2",
        account: VWCE_ACCOUNT_ID,
        value: 550,
        quantity: 5,
        isReconciled: "n",
        reconciledDate: ymd("2023-06-10T00:00:00.000Z"),
      },
    ]);

    await db.insert(pricesTable).values([
      {
        bookId: BOOK_ID,
        id: "price-1",
        source: "user:price-editor",
        priceType: "last",
        time: ymd("2023-01-10T00:00:00.000Z"),
        commodity: VWCE_COMMODITY_ID,
        currency: CURRENCY_ID,
        value: 100,
      },
      {
        bookId: BOOK_ID,
        id: "price-2",
        source: "user:price-editor",
        priceType: "last",
        time: ymd("2023-12-31T00:00:00.000Z"),
        commodity: VWCE_COMMODITY_ID,
        currency: CURRENCY_ID,
        value: 120,
      },
    ]);
  });

  describe("holdingAccountsOptions", () => {
    it("returns leaf security accounts under the investments tree, joined with their commodity", async () => {
      const options = holdingAccountsOptions({
        db,
        bookId: BOOK_ID,
        investmentsAccountId: INVESTMENTS_ID,
      });
      const rows = await (options.queryFn as () => Promise<unknown>)();
      expect(rows).toEqual([
        {
          id: VWCE_ACCOUNT_ID,
          name: "VWCE",
          commodityId: VWCE_COMMODITY_ID,
          ticker: "VWCE",
          commodityName: "Vanguard FTSE All-World",
        },
      ]);
    });

    it("excludes grouping accounts that hold the book's home currency instead of a security", async () => {
      const options = holdingAccountsOptions({
        db,
        bookId: BOOK_ID,
        investmentsAccountId: INVESTMENTS_ID,
      });
      const rows = await (options.queryFn as unknown as () => Promise<{ id: string }[]>)();
      expect(rows.map((r) => r.id)).not.toContain(BROKER_ID);
      expect(rows.map((r) => r.id)).not.toContain(INVESTMENTS_ID);
    });
  });

  describe("holdingLotsOptions", () => {
    it("returns each purchase split with its posting date", async () => {
      const options = holdingLotsOptions({ db, bookId: BOOK_ID, accountIds: [VWCE_ACCOUNT_ID] });
      const rows = await (options.queryFn as () => Promise<unknown>)();
      expect(rows).toEqual([
        expect.objectContaining({ accountId: VWCE_ACCOUNT_ID, quantity: 10, value: 1000 }),
        expect.objectContaining({ accountId: VWCE_ACCOUNT_ID, quantity: 5, value: 550 }),
      ]);
    });
  });

  describe("commodityPricesOptions", () => {
    it("returns price history for the requested commodities, oldest first", async () => {
      const options = commodityPricesOptions({
        db,
        bookId: BOOK_ID,
        commodityIds: [VWCE_COMMODITY_ID],
      });
      const rows = await (options.queryFn as unknown as () => Promise<{ value: number }[]>)();
      expect(rows.map((r) => r.value)).toEqual([100, 120]);
    });
  });
});
