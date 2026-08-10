import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/db/dbType";
import { createTestDb } from "@/test/db";
import { ACCOUNTS, BOOK_ID, TRIP_DESC, seedFixtures } from "@/test/fixtures";
import { setAccountConfig } from "@/db/utils";
import {
  travelExpensesByAccountOptions,
  travelExpensesDetailedOptions,
  travelExpensesDetailedYearMonthOptions,
} from "./travel";

// Only the travel queries that join `timeTable` directly on `ft.ymdPosted` are covered here.
// The remaining travel.ts queries (getTravelExpensesYearQuery, getTravelExpensesYearMonthQuery,
// getTravelExpenseKPIsQuery, getUniqueTravelsQuery) join on `substr(datePosted, 0, 11)` instead,
// which expects `timetable.ymd` to be stored as a bare date string rather than a full timestamp.
// That's a different fixture convention from the rest of the suite and is out of scope here.
describe("db/queries/travel", () => {
  let db: AppDatabase;
  const user = "travel-test-user";

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
      tripDesc: TRIP_DESC,
    });
  });

  describe("travelExpensesByAccountOptions", () => {
    it("sums only trip-tagged transactions, grouped by account", async () => {
      const options = travelExpensesByAccountOptions({ db, user, bookId: BOOK_ID });
      const rows = await (options.queryFn as () => Promise<unknown>)();

      expect(rows).toEqual([{ key: ACCOUNTS.expGroceries.id, name: "Groceries", value: -25 }]);
    });
  });

  describe("travelExpensesDetailedOptions", () => {
    it("groups trip-tagged transactions by their note, with min/max yearmonth", async () => {
      const options = travelExpensesDetailedOptions({ db, user, bookId: BOOK_ID });
      const rows = await (options.queryFn as () => Promise<unknown>)();

      expect(rows).toEqual([
        { name: "Trip:Paris weekend", ini: "2023-01", fin: "2023-01", value: 25 },
      ]);
    });
  });

  describe("travelExpensesDetailedYearMonthOptions", () => {
    it("groups trip-tagged transactions by note and yearmonth", async () => {
      const options = travelExpensesDetailedYearMonthOptions({ db, user, bookId: BOOK_ID });
      const rows = await (options.queryFn as () => Promise<unknown>)();

      expect(rows).toEqual([{ name: "Trip:Paris weekend", date: "2023-01", value: 25 }]);
    });
  });
});
