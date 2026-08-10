import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/db/dbType";
import { createTestDb } from "@/test/db";
import { ACCOUNTS, MAX_DATE, MIN_DATE, seedFixtures } from "@/test/fixtures";
import { getAccountsClosureQuery, getBooks, getDomain } from "./global";

describe("db/queries/global", () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = await createTestDb();
    await seedFixtures(db);
  });

  describe("getBooks", () => {
    it("returns the seeded book", async () => {
      const books = await getBooks(db);
      expect(books).toHaveLength(1);
      expect(books[0].id).toBe("book-1");
    });
  });

  describe("getDomain", () => {
    it("returns the min/max dates from the meta table", async () => {
      const domain = await getDomain(db);
      expect(domain?.min.toUTC().toISO()).toBe(MIN_DATE.toUTC().toISO());
      expect(domain?.max.toUTC().toISO()).toBe(MAX_DATE.toUTC().toISO());
    });
  });

  describe("getAccountsClosureQuery", () => {
    it("returns every descendant (including self) of a given ancestor", async () => {
      const closure = getAccountsClosureQuery(db, [ACCOUNTS.exp.id]);
      const rows = await db.select().from(closure).execute();

      const childIds = rows.map((r) => r.id).sort();
      expect(childIds).toEqual(
        [ACCOUNTS.exp.id, ACCOUNTS.expGroceries.id, ACCOUNTS.expTransport.id].sort(),
      );
      for (const row of rows) {
        expect(row.parent).toBe(ACCOUNTS.exp.id);
        expect(row.base).toBe(ACCOUNTS.exp.name);
      }
    });

    it("excludes accounts listed in ignoreAccounts", async () => {
      const closure = getAccountsClosureQuery(db, [ACCOUNTS.exp.id], [ACCOUNTS.expGroceries.id]);
      const rows = await db.select().from(closure).execute();

      const childIds = rows.map((r) => r.id).sort();
      expect(childIds).toEqual([ACCOUNTS.exp.id, ACCOUNTS.expTransport.id].sort());
    });

    it("returns rows for every account when no filters are given", async () => {
      const closure = getAccountsClosureQuery(db);
      const rows = await db.select().from(closure).execute();

      // One row per (ancestor, descendant) pair, including self-pairs:
      // root(1) + exp(2) + expGroceries(3) + expTransport(3) + inc(2) + incSalary(3) = 14.
      expect(rows.length).toBe(14);
    });
  });
});
