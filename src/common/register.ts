import { compileSearch, type SearchField } from "./search";

/** One split of a transaction, as stored (GnuCash signs: positive = debit, negative = credit). */
export interface RegisterSplit {
  splitId: string;
  transactionId: string;
  accountId: string;
  value: number;
  /** Units (shares) for investment splits; equals `value` for plain currency splits. */
  quantity: number;
  memo: string | null;
  action: string | null;
  /** GnuCash reconcile flag: n (no), c (cleared), y (reconciled). */
  reconciled: string;
  /** YYYY-MM-DD. */
  date: string;
  description: string | null;
  notes: string | null;
}

export interface RegisterAccount {
  id: string;
  name: string;
  parent: string | null;
  accountType: string;
}

export interface RegisterSplitView {
  splitId: string;
  accountId: string;
  accountPath: string;
  memo: string | null;
  action: string | null;
  reconciled: string;
  debit: number;
  credit: number;
  quantity: number;
  /** The split that belongs to the account being viewed. */
  isThis: boolean;
}

export interface RegisterRow {
  transactionId: string;
  splitId: string;
  date: string;
  num: string;
  description: string;
  notes: string;
  memo: string;
  reconciled: string;
  /** Other accounts touched by the transaction (full paths). */
  transfers: string[];
  isSplit: boolean;
  debit: number;
  credit: number;
  /** Running balance, positive in the account's natural direction. */
  balance: number;
  /** Units moved by this split and the running unit count (investment accounts). */
  quantity: number;
  shares: number;
  /** Splits do not add up to zero. */
  unbalanced: boolean;
  /** Ids of every account the transaction touches, for searching. */
  accountIds: string[];
  /** Value of this account's split (signed, GnuCash convention), for searching. */
  value: number;
  splits: RegisterSplitView[];
}

const CREDIT_NORMAL = new Set(["INCOME", "LIABILITY", "CREDIT", "PAYABLE", "EQUITY"]);

/** Accounts whose balance grows with credits (income, liabilities, equity). */
export const isCreditNormal = (type: string) => CREDIT_NORMAL.has(type);

/**
 * Names of the two amount columns, as GnuCash labels them per account type:
 * [left (debit) column, right (credit) column].
 */
export const columnKeys = (type: string): [string, string] => {
  switch (type) {
    case "BANK":
    case "CASH":
    case "ASSET":
    case "STOCK":
    case "MUTUAL":
      return ["deposit", "withdrawal"];
    case "EXPENSE":
      return ["expense", "rebate"];
    case "INCOME":
      return ["charge", "income"];
    case "LIABILITY":
    case "CREDIT":
    case "PAYABLE":
      return ["payment", "charge"];
    case "RECEIVABLE":
      return ["invoice", "payment"];
    default:
      return ["debit", "credit"];
  }
};

export const accountPath = (id: string, accounts: Map<string, RegisterAccount>): string => {
  const names: string[] = [];
  const seen = new Set<string>();
  for (
    let a = accounts.get(id);
    a && !seen.has(a.id);
    a = a.parent ? accounts.get(a.parent) : undefined
  ) {
    seen.add(a.id);
    if (a.accountType !== "ROOT") names.unshift(a.name);
  }
  return names.join(":");
};

/**
 * The register of one account: its splits oldest first (ties keep a stable order) with the running
 * balance, the other accounts involved and, for the detailed view, every split of each transaction.
 */
// Grouping every split by transaction is the same for every account, so keep it per splits array
// (switching tabs then only walks the chosen account's splits).
const groupCache = new WeakMap<RegisterSplit[], Map<string, RegisterSplit[]>>();
const groupByTransaction = (splits: RegisterSplit[]) => {
  const cached = groupCache.get(splits);
  if (cached) return cached;
  const byTx = new Map<string, RegisterSplit[]>();
  for (const s of splits) {
    const list = byTx.get(s.transactionId);
    if (list) list.push(s);
    else byTx.set(s.transactionId, [s]);
  }
  groupCache.set(splits, byTx);
  return byTx;
};

export const buildRegister = (
  splits: RegisterSplit[],
  accountId: string,
  accounts: Map<string, RegisterAccount>,
): RegisterRow[] => {
  const byTx = groupByTransaction(splits);
  const paths = new Map<string, string>();
  const pathOf = (id: string) => {
    let p = paths.get(id);
    if (p === undefined) {
      p = accountPath(id, accounts);
      paths.set(id, p);
    }
    return p;
  };
  const type = accounts.get(accountId)?.accountType ?? "";
  const sign = isCreditNormal(type) ? -1 : 1;

  const mine = splits
    .filter((s) => s.accountId === accountId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.transactionId.localeCompare(b.transactionId));

  let balance = 0;
  let shares = 0;
  return mine.map((s) => {
    balance += sign * s.value;
    shares += sign * s.quantity;
    const all = byTx.get(s.transactionId) ?? [s];
    const views: RegisterSplitView[] = all.map((o) => ({
      splitId: o.splitId,
      accountId: o.accountId,
      accountPath: pathOf(o.accountId),
      memo: o.memo,
      action: o.action,
      reconciled: o.reconciled,
      debit: o.value > 0 ? o.value : 0,
      credit: o.value < 0 ? -o.value : 0,
      quantity: o.quantity,
      isThis: o.splitId === s.splitId,
    }));
    const others = views.filter((v) => !v.isThis);
    return {
      transactionId: s.transactionId,
      splitId: s.splitId,
      date: s.date,
      num: s.action ?? "",
      description: s.description ?? "",
      notes: s.notes ?? "",
      memo: s.memo ?? "",
      reconciled: s.reconciled,
      transfers: [...new Set(others.map((o) => o.accountPath))],
      isSplit: new Set(others.map((o) => o.accountId)).size > 1,
      debit: s.value > 0 ? s.value : 0,
      credit: s.value < 0 ? -s.value : 0,
      balance,
      quantity: s.quantity,
      shares,
      unbalanced: Math.abs(all.reduce((a, o) => a + o.value, 0)) > 0.005,
      accountIds: [...new Set(all.map((o) => o.accountId))],
      value: s.value,
      splits: views,
    };
  });
};

/** Applies the shared search syntax (see `compileSearch`) to a register row. */
export const registerMatcher = (query: string, scope: SearchField = "all") => {
  const matches = compileSearch(query, scope);
  return (row: RegisterRow, accountType: string): boolean =>
    matches({
      description: row.description,
      notes: row.notes,
      memo: [row.memo, ...row.splits.map((s) => s.memo ?? "")].join(" "),
      account: row.transfers.join(" "),
      accountId: row.accountIds.join(" "),
      transactionId: row.transactionId,
      splitId: row.splits.map((s) => s.splitId).join(" "),
      type: accountType,
      date: row.date,
      amount: row.value,
    });
};

/** Totals of the rows in view. */
export const registerTotals = (rows: RegisterRow[]) => {
  let debit = 0;
  let credit = 0;
  for (const r of rows) {
    debit += r.debit;
    credit += r.credit;
  }
  return { debit, credit, net: debit - credit };
};

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** One CSV line per split of each row (the account's own split first), oldest first. */
export const registerCsv = (rows: RegisterRow[]): string => {
  const header = [
    "date",
    "transactionId",
    "description",
    "notes",
    "splitId",
    "account",
    "accountId",
    "memo",
    "reconciled",
    "debit",
    "credit",
    "isThisAccount",
  ];
  const lines = rows.flatMap((r) =>
    r.splits.map((s) =>
      [
        r.date,
        r.transactionId,
        r.description,
        r.notes,
        s.splitId,
        s.accountPath,
        s.accountId,
        s.memo ?? "",
        s.reconciled,
        s.debit,
        s.credit,
        s.isThis ? 1 : 0,
      ]
        .map(csvCell)
        .join(","),
    ),
  );
  return [header.join(","), ...lines].join("\n");
};

export type Tone = "good" | "bad" | "neutral";

/**
 * Whether money on one side of the register is good news (green) or bad (red): deposits,
 * income, rebates and loan payments are good; withdrawals, spending and new debt are bad.
 */
export const sideTone = (type: string, side: "left" | "right"): Tone => {
  switch (type) {
    case "BANK":
    case "CASH":
    case "ASSET":
    case "STOCK":
    case "MUTUAL":
    case "RECEIVABLE":
    case "LIABILITY":
    case "CREDIT":
    case "PAYABLE":
      return side === "left" ? "good" : "bad";
    case "INCOME":
    case "EXPENSE":
      return side === "right" ? "good" : "bad";
    default:
      return "neutral";
  }
};
