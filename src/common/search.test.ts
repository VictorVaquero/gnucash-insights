import { describe, expect, it } from "vitest";
import { compileSearch, parseSearch, type SearchRecord } from "./search";

const rec: SearchRecord = {
  description: "Weekly Market",
  notes: "with friends",
  account: "Expenses:Food:Groceries",
  accountId: "abc123",
  transactionId: "tx-9",
  splitId: "sp-1",
  type: "EXPENSE",
  date: "2024-05-10",
  amount: -42.5,
};
const match = (q: string, scope?: Parameters<typeof compileSearch>[1]) =>
  compileSearch(q, scope)(rec);

describe("search", () => {
  it("matches a bare word in any column and ignores case", () => {
    expect(match("market")).toBe(true);
    expect(match("groceries")).toBe(true);
    expect(match("abc123")).toBe(true);
    expect(match("2024-05")).toBe(true);
    expect(match("zzz")).toBe(false);
    expect(match("")).toBe(true);
  });
  it("finds an exact amount typed as a plain number", () => {
    expect(match("42.5")).toBe(true);
    expect(match("42,5")).toBe(true);
    expect(match("43")).toBe(false);
  });
  it("searches one column with field:value, aliases included", () => {
    expect(match("desc:market")).toBe(true);
    expect(match("desc:groceries")).toBe(false);
    expect(match("account:food")).toBe(true);
    expect(match("cuenta:food")).toBe(true);
    expect(match("id:abc")).toBe(true);
    expect(match("tx:tx-9")).toBe(true);
    expect(match("type:income")).toBe(false);
  });
  it("scopes bare words to the chosen column", () => {
    expect(match("market", "description")).toBe(true);
    expect(match("market", "account")).toBe(false);
    expect(match("abc123", "accountId")).toBe(true);
  });
  it("ANDs terms, supports quotes and negation", () => {
    expect(match("market friends")).toBe(true);
    expect(match("market nothing")).toBe(false);
    expect(match('desc:"weekly market"')).toBe(true);
    expect(match("-groceries")).toBe(false);
    expect(match("market -income")).toBe(true);
    expect(match("-desc:rent")).toBe(true);
  });
  it("compares amounts by absolute value", () => {
    expect(match("amount:>40")).toBe(true);
    expect(match("amount:>50")).toBe(false);
    expect(match("amount:<=42.5")).toBe(true);
    expect(match("amount:40..45")).toBe(true);
    expect(match("amount:10..20")).toBe(false);
    expect(match("importe:=42.5")).toBe(true);
  });
  it("treats unknown prefixes as plain text", () => {
    expect(parseSearch("foo:bar")).toEqual([
      { field: "all", negate: false, op: "~", text: "foo:bar" },
    ]);
  });
});
