export interface QualitySplit {
  transactionId: string;
  splitId: string;
  accountId: string;
  accountName: string;
  date: string;
  value: number;
  description: string;
}

export interface QualityHolding {
  accountId: string;
  name: string;
  quantity: number;
  isClosed: boolean;
  isCash: boolean;
  priceDate: string | null;
}

/** Why one item was flagged: a translation key suffix plus the values to fill in. */
export interface QualityReason {
  key: string;
  params: Record<string, string | number>;
}

export interface QualityItem {
  /** Transaction id, or the holding's account id. */
  id: string;
  title: string;
  date: string | null;
  reason: QualityReason;
  /** Every split of the transaction, so the whole entry can be inspected. */
  splits: { splitId: string; accountId: string; accountName: string; value: number }[];
}

export interface QualityIssue {
  /** Stable id of the check. */
  id: string;
  severity: "error" | "warning" | "info";
  count: number;
  items: QualityItem[];
}

const IMBALANCE = /^(imbalance|orphan|desequilibrio|huérfan)/i;
export const STALE_PRICE_DAYS = 45;

const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** Data-quality checks over raw splits and holdings; only problems that exist are returned. */
export const checkQuality = (
  splits: QualitySplit[],
  holdings: QualityHolding[],
  today: string,
): { issues: QualityIssue[]; lastDate: string | null; daysSinceLast: number | null } => {
  const byTx = new Map<string, QualitySplit[]>();
  for (const s of splits) {
    const list = byTx.get(s.transactionId);
    if (list) list.push(s);
    else byTx.set(s.transactionId, [s]);
  }

  const txItem = (group: QualitySplit[], reason: QualityReason): QualityItem => ({
    id: group[0].transactionId,
    title: group[0].description.trim() || "—",
    date: group[0].date,
    reason,
    splits: group.map((s) => ({
      splitId: s.splitId,
      accountId: s.accountId,
      accountName: s.accountName,
      value: s.value,
    })),
  });

  const noDescription: QualityItem[] = [];
  const unbalanced: QualityItem[] = [];
  const future: QualityItem[] = [];
  const dupes: QualityItem[] = [];
  const imbalance: QualityItem[] = [];
  const firstWithKey = new Map<string, string>();
  let lastDate: string | null = null;

  for (const group of byTx.values()) {
    const first = group[0];
    if (!first.description.trim())
      noDescription.push(txItem(group, { key: "noDescription", params: {} }));

    const sum = group.reduce((acc, s) => acc + s.value, 0);
    if (Math.abs(sum) > 0.005)
      unbalanced.push(txItem(group, { key: "unbalanced", params: { sum: sum.toFixed(2) } }));

    const bad = group.filter((s) => IMBALANCE.test(s.accountName));
    if (bad.length)
      imbalance.push(txItem(group, { key: "imbalance", params: { account: bad[0].accountName } }));

    if (first.date > today)
      future.push(txItem(group, { key: "future", params: { date: first.date, today } }));
    else if (lastDate == null || first.date > lastDate) lastDate = first.date;

    const key = `${first.date}|${first.description.trim().toLowerCase()}|${group
      .map((s) => `${s.accountId}:${s.value.toFixed(2)}`)
      .sort()
      .join(",")}`;
    const original = firstWithKey.get(key);
    if (original) dupes.push(txItem(group, { key: "duplicates", params: { original } }));
    else firstWithKey.set(key, first.transactionId);
  }

  const holdingItem = (h: QualityHolding, reason: QualityReason): QualityItem => ({
    id: h.accountId,
    title: h.name,
    date: h.priceDate,
    reason,
    splits: [],
  });
  const live = holdings.filter((h) => !h.isClosed && !h.isCash);
  const noPrice = live
    .filter((h) => h.priceDate == null)
    .map((h) => holdingItem(h, { key: "noPrice", params: { quantity: h.quantity } }));
  const stale = live
    .filter((h) => h.priceDate != null && dayDiff(h.priceDate, today) > STALE_PRICE_DAYS)
    .map((h) =>
      holdingItem(h, {
        key: "stalePrice",
        params: {
          date: h.priceDate ?? "",
          days: dayDiff(h.priceDate ?? today, today),
          limit: STALE_PRICE_DAYS,
        },
      }),
    );
  const negative = holdings
    .filter((h) => h.quantity < -1e-6)
    .map((h) => holdingItem(h, { key: "negativeHolding", params: { quantity: h.quantity } }));

  const make = (id: string, severity: QualityIssue["severity"], items: QualityItem[]) =>
    items.length ? { id, severity, count: items.length, items } : null;

  const issues = [
    make("unbalanced", "error", unbalanced),
    make("imbalance", "error", imbalance),
    make("negativeHolding", "error", negative),
    make("noPrice", "warning", noPrice),
    make("stalePrice", "warning", stale),
    make("future", "warning", future),
    make("duplicates", "warning", dupes),
    make("noDescription", "info", noDescription),
  ].filter((i): i is QualityIssue => i != null);

  return {
    issues,
    lastDate,
    daysSinceLast: lastDate ? dayDiff(lastDate, today) : null,
  };
};
