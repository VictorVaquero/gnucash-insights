import { describe, expect, it } from "vitest";
import { checkQuality, type QualitySplit } from "./quality";

const sp = (over: Partial<QualitySplit>): QualitySplit => ({
  transactionId: "t1",
  splitId: "s",
  accountId: "a",
  accountName: "Food",
  date: "2024-05-01",
  value: 10,
  description: "Shop",
  ...over,
});

describe("checkQuality", () => {
  it("is clean for balanced, described, past transactions", () => {
    const r = checkQuality(
      [sp({}), sp({ splitId: "s2", accountId: "b", value: -10 })],
      [],
      "2024-05-10",
    );
    expect(r.issues).toEqual([]);
    expect(r.lastDate).toBe("2024-05-01");
    expect(r.daysSinceLast).toBe(9);
  });
  it("finds unbalanced, imbalance, blank, future and duplicate entries", () => {
    const r = checkQuality(
      [
        sp({ description: "" }),
        sp({ transactionId: "t2", accountName: "Imbalance-EUR", date: "2024-06-01" }),
        sp({ transactionId: "t3" }),
        sp({ transactionId: "t4" }),
      ],
      [],
      "2024-05-10",
    );
    const ids = r.issues.map((i) => i.id);
    expect(ids).toEqual(
      expect.arrayContaining(["unbalanced", "imbalance", "future", "duplicates", "noDescription"]),
    );
  });
  it("flags stale and missing prices on open, non-cash holdings only", () => {
    const h = (o: object) => ({
      accountId: "x",
      name: "F",
      quantity: 1,
      isClosed: false,
      isCash: false,
      priceDate: null,
      ...o,
    });
    const r = checkQuality(
      [],
      [
        h({ priceDate: "2024-01-01" }),
        h({ name: "N" }),
        h({ isCash: true }),
        h({ isClosed: true }),
      ],
      "2024-05-10",
    );
    expect(r.issues.map((i) => i.id)).toEqual(["noPrice", "stalePrice"]);
  });
});

describe("checkQuality details", () => {
  it("explains each finding and carries the whole transaction", () => {
    const r = checkQuality(
      [
        sp({ transactionId: "tx9", value: 10 }),
        sp({ transactionId: "tx9", splitId: "s2", accountId: "b", value: -7 }),
      ],
      [],
      "2024-05-10",
    );
    const item = r.issues.find((i) => i.id === "unbalanced")?.items[0];
    expect(item?.id).toBe("tx9");
    expect(item?.reason).toEqual({ key: "unbalanced", params: { sum: "3.00" } });
    expect(item?.splits).toHaveLength(2);
  });
  it("points a duplicate at the transaction it repeats", () => {
    const r = checkQuality(
      [sp({ transactionId: "a" }), sp({ transactionId: "b" })],
      [],
      "2024-05-10",
    );
    const d = r.issues.find((i) => i.id === "duplicates")?.items[0];
    expect(d?.id).toBe("b");
    expect(d?.reason.params.original).toBe("a");
  });
});
