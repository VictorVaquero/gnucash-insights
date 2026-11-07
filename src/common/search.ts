/** Searchable columns. `all` searches every text column. */
export type SearchField =
  | "all"
  | "description"
  | "notes"
  | "memo"
  | "account"
  | "accountId"
  | "transactionId"
  | "splitId"
  | "type"
  | "date"
  | "amount";

export interface SearchRecord {
  description?: string | null;
  notes?: string | null;
  memo?: string | null;
  account?: string | null;
  accountId?: string | null;
  transactionId?: string | null;
  splitId?: string | null;
  type?: string | null;
  date?: string | null;
  amount?: number | null;
}

export const SEARCH_FIELDS: SearchField[] = [
  "all",
  "description",
  "notes",
  "memo",
  "account",
  "accountId",
  "transactionId",
  "splitId",
  "type",
  "date",
  "amount",
];

const ALIASES: Record<string, SearchField> = {
  all: "all",
  desc: "description",
  description: "description",
  descripcion: "description",
  d: "description",
  note: "notes",
  notes: "notes",
  nota: "notes",
  notas: "notes",
  memo: "memo",
  account: "account",
  acc: "account",
  cuenta: "account",
  a: "account",
  accountid: "accountId",
  accid: "accountId",
  aid: "accountId",
  id: "accountId",
  tx: "transactionId",
  txid: "transactionId",
  transaction: "transactionId",
  transactionid: "transactionId",
  split: "splitId",
  splitid: "splitId",
  type: "type",
  tipo: "type",
  date: "date",
  fecha: "date",
  amount: "amount",
  importe: "amount",
  value: "amount",
  valor: "amount",
};

interface Term {
  field: SearchField;
  negate: boolean;
  op: "~" | "=" | ">" | "<" | ">=" | "<=";
  text: string;
}

/** Splits on spaces, keeping "quoted phrases" (also after `field:`) together. */
const tokenize = (query: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of query) {
    if (ch === '"') quoted = !quoted;
    else if (ch === " " && !quoted) {
      if (cur) out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
};

const parseNumber = (s: string): number | null => {
  const n = Number(s.replace(",", "."));
  return s.trim() !== "" && Number.isFinite(n) ? n : null;
};

/**
 * Parses a search box into terms. A bare word searches the chosen column (`scope`, default every
 * column); `field:value` targets one column, `-word` / `-field:value` excludes, `"a b"` keeps a
 * phrase, and `amount:>100`, `amount:<=50`, `amount:10..20` compare amounts (absolute value).
 */
export const parseSearch = (query: string, scope: SearchField = "all"): Term[] =>
  tokenize(query).flatMap((raw): Term[] => {
    let tok = raw;
    let negate = false;
    if (tok.startsWith("-") && tok.length > 1) {
      negate = true;
      tok = tok.slice(1);
    }
    let field = scope;
    const colon = tok.indexOf(":");
    if (colon > 0) {
      const alias = ALIASES[tok.slice(0, colon).toLowerCase()];
      if (alias) {
        field = alias;
        tok = tok.slice(colon + 1);
      }
    }
    if (!tok) return [];
    let op: Term["op"] = "~";
    if (field === "amount") {
      const m = /^(>=|<=|>|<|=)/.exec(tok);
      if (m) {
        op = m[1] as Term["op"];
        tok = tok.slice(m[1].length);
      }
    }
    return [{ field, negate, op, text: tok.toLowerCase() }];
  });

const textOf = (rec: SearchRecord, field: Exclude<SearchField, "all" | "amount">) =>
  (rec[field] ?? "").toLowerCase();

const ALL_TEXT: Exclude<SearchField, "all" | "amount">[] = [
  "description",
  "notes",
  "memo",
  "account",
  "accountId",
  "transactionId",
  "splitId",
  "type",
  "date",
];

const matchTerm = (rec: SearchRecord, term: Term): boolean => {
  const { field, op, text } = term;
  if (field === "amount") {
    const value = rec.amount == null ? null : Math.abs(rec.amount);
    if (value == null) return false;
    const range = /^(-?[\d.,]+)\.\.(-?[\d.,]+)$/.exec(text);
    if (range) {
      const lo = parseNumber(range[1]);
      const hi = parseNumber(range[2]);
      return lo != null && hi != null && value >= lo && value <= hi;
    }
    const n = parseNumber(text);
    if (n == null) return false;
    const eps = 0.005;
    switch (op) {
      case ">":
        return value > n;
      case "<":
        return value < n;
      case ">=":
        return value >= n - eps;
      case "<=":
        return value <= n + eps;
      default:
        return Math.abs(value - n) < eps;
    }
  }
  if (field === "all") {
    if (ALL_TEXT.some((f) => textOf(rec, f).includes(text))) return true;
    // A bare number also finds amounts.
    const n = parseNumber(text);
    return n != null && rec.amount != null && Math.abs(Math.abs(rec.amount) - n) < 0.005;
  }
  return textOf(rec, field).includes(text);
};

/** Compiles a query into a predicate; every term must hold (AND), `-` terms must not. */
export const compileSearch = (query: string, scope: SearchField = "all") => {
  const terms = parseSearch(query, scope);
  return (rec: SearchRecord): boolean =>
    terms.every((term) => matchTerm(rec, term) !== term.negate);
};
