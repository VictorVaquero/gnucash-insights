import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/db/dbType";
import { createTestDb } from "@/test/db";
import { seedFixtures } from "@/test/fixtures";
import { getExpensesYearlyQuery } from "./expenses";

describe("db/queries/expenses", () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = await createTestDb();
    await seedFixtures(db);
  });

  describe("getExpensesYearlyQuery", () => {
    it("rolls up leaf transactions to every EXPENSE-type ancestor, per year", async () => {
      const rows = await getExpensesYearlyQuery({ db, bookId: "book-1" });
      const byName = Object.fromEntries(rows.map((r) => [r.name, r]));

      // Fixture transactions (all under Expenses -> {Groceries, Transport}):
      //   Groceries: -50 (2023), -30 (2023), -25 (2023, trip-tagged), -40 (2024)
      //   Transport: -20 (2023)
      // "Expenses" is the parent of both, so it rolls up all five.
      expect(Object.keys(byName).sort()).toEqual(["Expenses", "Groceries", "Transport"]);

      expect(byName.Expenses.total).toBe(-165);
      expect(byName.Expenses["2023"]).toBe(-125);
      expect(byName.Expenses["2024"]).toBe(-40);
      expect(byName.Expenses.last).toBe(-40);

      expect(byName.Groceries.total).toBe(-145);
      expect(byName.Groceries["2023"]).toBe(-105);
      expect(byName.Groceries["2024"]).toBe(-40);

      expect(byName.Transport.total).toBe(-20);
      expect(byName.Transport["2023"]).toBe(-20);
      expect(byName.Transport["2024"]).toBe(0);
    });

    it("excludes INCOME-type accounts entirely", async () => {
      const rows = await getExpensesYearlyQuery({ db, bookId: "book-1" });
      expect(rows.some((r) => r.name === "Income" || r.name === "Salary")).toBe(false);
    });
  });
});
