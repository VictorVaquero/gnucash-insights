import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/db/dbType";
import { createTestDb } from "@/test/db";
import { ACCOUNTS, BOOK_ID, seedFixtures } from "@/test/fixtures";
import { setAccountConfig } from "@/db/utils";
import { netCostsYearMonthOptions } from "./summary";

describe("db/queries/summary", () => {
  let db: AppDatabase;
  const user = "summary-test-user";

  beforeEach(async () => {
    db = await createTestDb();
    await seedFixtures(db);
    setAccountConfig(user, {
      expenses: ACCOUNTS.exp.id,
      income: ACCOUNTS.inc.id,
      checking: ACCOUNTS.root.id,
      savings: ACCOUNTS.root.id,
      assets: ACCOUNTS.root.id,
      working: ACCOUNTS.root.id,
      liability: ACCOUNTS.root.id,
      investments: ACCOUNTS.root.id,
      taxes: ACCOUNTS.root.id,
      taxesAll: [ACCOUNTS.root.id],
      tripDesc: "Trip:",
    });
  });

  describe("netCostsYearMonthOptions", () => {
    it("sums fullTransactions value grouped by expenses account and yearmonth", async () => {
      const options = netCostsYearMonthOptions({ db, user, bookId: BOOK_ID });
      const rows = await (options.queryFn as () => Promise<unknown>)();

      // Groceries: -50 and -25 (both 2023-01, summed to -75), -30 (2023-06), -40 (2024-02);
      // Transport: -20 (2023-03).
      // "account" is the closure's child id, i.e. the leaf account the transaction posted to.
      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            account: ACCOUNTS.expGroceries.id,
            date: "2023-01",
            value: -75,
          }),
          expect.objectContaining({
            account: ACCOUNTS.expTransport.id,
            date: "2023-03",
            value: -20,
          }),
          expect.objectContaining({
            account: ACCOUNTS.expGroceries.id,
            date: "2023-06",
            value: -30,
          }),
          expect.objectContaining({
            account: ACCOUNTS.expGroceries.id,
            date: "2024-02",
            value: -40,
          }),
        ]),
      );
      expect(rows).toHaveLength(4);
    });
  });
});
