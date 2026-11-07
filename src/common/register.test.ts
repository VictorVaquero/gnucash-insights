import { describe, expect, it } from "vitest";
import {
  buildRegister,
  columnKeys,
  registerCsv,
  registerMatcher,
  registerTotals,
  type RegisterAccount,
  type RegisterSplit,
} from "./register";

const acc = (id: string, name: string, parent: string | null, accountType: string) =>
  [id, { id, name, parent, accountType }] as const;
const accounts = new Map<string, RegisterAccount>([
  acc("root", "Root", null, "ROOT"),
  acc("bank", "Bank", "root", "BANK"),
  acc("inc", "Income", "root", "INCOME"),
  acc("sal", "Salary", "inc", "INCOME"),
  acc("tax", "Taxes", "root", "EXPENSE"),
  acc("food", "Food", "root", "EXPENSE"),
]);

const sp = (o: Partial<RegisterSplit>): RegisterSplit => ({
  splitId: "s",
  transactionId: "t",
  accountId: "bank",
  value: 0,
  quantity: 0,
  memo: null,
  action: null,
  reconciled: "n",
  date: "2024-01-01",
  description: "x",
  notes: null,
  ...o,
});

// Payroll: salary -3600, taxes +900, bank +2700; then a food purchase of 50.
const splits: RegisterSplit[] = [
  sp({
    splitId: "a1",
    transactionId: "pay",
    accountId: "sal",
    value: -3600,
    date: "2024-01-31",
    description: "Payroll",
  }),
  sp({
    splitId: "a2",
    transactionId: "pay",
    accountId: "tax",
    value: 900,
    date: "2024-01-31",
    description: "Payroll",
    memo: "IRPF",
  }),
  sp({
    splitId: "a3",
    transactionId: "pay",
    accountId: "bank",
    value: 2700,
    date: "2024-01-31",
    description: "Payroll",
  }),
  sp({
    splitId: "b1",
    transactionId: "shop",
    accountId: "food",
    value: 50,
    date: "2024-01-10",
    description: "Market",
  }),
  sp({
    splitId: "b2",
    transactionId: "shop",
    accountId: "bank",
    value: -50,
    date: "2024-01-10",
    description: "Market",
  }),
];

describe("buildRegister", () => {
  it("lists the account's splits oldest first with a running balance", () => {
    const rows = buildRegister(splits, "bank", accounts);
    expect(rows.map((r) => r.description)).toEqual(["Market", "Payroll"]);
    expect(rows.map((r) => r.balance)).toEqual([-50, 2650]);
    expect(rows[0]).toMatchObject({ credit: 50, debit: 0, isSplit: false, transfers: ["Food"] });
  });
  it("marks multi-account transactions as split and keeps every split for the detailed view", () => {
    const [, pay] = buildRegister(splits, "bank", accounts);
    expect(pay).toMatchObject({ isSplit: true, debit: 2700 });
    expect(pay.transfers).toEqual(["Income:Salary", "Taxes"]);
    expect(pay.splits).toHaveLength(3);
    expect(pay.splits.filter((s) => s.isThis)).toHaveLength(1);
    expect(pay.splits.find((s) => s.accountId === "tax")).toMatchObject({
      debit: 900,
      memo: "IRPF",
    });
  });
  it("shows income balances in their natural (positive) direction", () => {
    const rows = buildRegister(splits, "sal", accounts);
    expect(rows[0]).toMatchObject({ credit: 3600, balance: 3600 });
  });
});

describe("columns and search", () => {
  it("labels the columns like GnuCash per account type", () => {
    expect(columnKeys("BANK")).toEqual(["deposit", "withdrawal"]);
    expect(columnKeys("EXPENSE")).toEqual(["expense", "rebate"]);
    expect(columnKeys("INCOME")).toEqual(["charge", "income"]);
    expect(columnKeys("WEIRD")).toEqual(["debit", "credit"]);
  });
  it("searches description, memos, accounts and ids, in general or per column", () => {
    const [, pay] = buildRegister(splits, "bank", accounts);
    const m = (q: string, scope?: Parameters<typeof registerMatcher>[1]) =>
      registerMatcher(q, scope)(pay, "BANK");
    expect(m("irpf")).toBe(true);
    expect(m("salary")).toBe(true);
    expect(m("nope")).toBe(false);
    expect(m("")).toBe(true);
    expect(m("memo:irpf")).toBe(true);
    expect(m("irpf", "account")).toBe(false);
    expect(m("id:sal")).toBe(true);
    expect(m("amount:>2000")).toBe(true);
    expect(m("tx:pay")).toBe(true);
  });
  it("totals and exports the rows in view", () => {
    const rows = buildRegister(splits, "bank", accounts);
    expect(registerTotals(rows)).toEqual({ debit: 2700, credit: 50, net: 2650 });
    const csv = registerCsv(rows);
    expect(csv.split("\n")).toHaveLength(1 + 2 + 3);
    expect(csv).toContain('"IRPF"');
  });
  it("flags unbalanced transactions and tracks shares", () => {
    const odd = [
      sp({ splitId: "u1", transactionId: "u", value: 10, quantity: 2 }),
      sp({ splitId: "u2", transactionId: "u", accountId: "food", value: -7 }),
    ];
    const [row] = buildRegister(odd, "bank", accounts);
    expect(row).toMatchObject({ unbalanced: true, shares: 2, quantity: 2 });
    expect(buildRegister(splits, "bank", accounts).every((r) => !r.unbalanced)).toBe(true);
  });
});
