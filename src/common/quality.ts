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
  name: string;
  quantity: number;
  isClosed: boolean;
  isCash: boolean;
  priceDate: string | null;
}

export interface QualityIssue {
  /** Short, stable label of what is wrong. */
  id: string;
  severity: "error" | "warning" | "info";
  count: number;
  /** A few concrete examples to go and fix. */
  samples: string[];
}

const SAMPLE = 5;
const IMBALANCE = /^(imbalance|orphan|desequilibrio|huérfan)/i;
export const STALE_PRICE_DAYS = 45;

const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

const issue = (
  id: string,
  severity: QualityIssue["severity"],
  items: string[],
): QualityIssue | null =>
  items.length ? { id, severity, count: items.length, samples: items.slice(0, SAMPLE) } : null;

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

  const label = (s: QualitySplit) => `${s.date} · ${s.description || "∅"} · ${s.value.toFixed(2)}`;

  const noDescription: string[] = [];
  const unbalanced: string[] = [];
  const future: string[] = [];
  const dupes: string[] = [];
  const seen = new Set<string>();
  let lastDate: string | null = null;

  for (const group of byTx.values()) {
    const first = group[0];
    if (!first.description.trim()) noDescription.push(label(first));
    if (Math.abs(group.reduce((sum, s) => sum + s.value, 0)) > 0.005) unbalanced.push(label(first));
    if (first.date > today) future.push(label(first));
    else if (lastDate == null || first.date > lastDate) lastDate = first.date;
    const key = `${first.date}|${first.description.trim().toLowerCase()}|${group
      .map((s) => `${s.accountId}:${s.value.toFixed(2)}`)
      .sort()
      .join(",")}`;
    if (seen.has(key)) dupes.push(label(first));
    else seen.add(key);
  }

  const imbalance = splits.filter((s) => IMBALANCE.test(s.accountName)).map(label);

  const live = holdings.filter((h) => !h.isClosed && !h.isCash);
  const noPrice = live.filter((h) => h.priceDate == null).map((h) => h.name);
  const stale = live
    .filter((h) => h.priceDate != null && dayDiff(h.priceDate, today) > STALE_PRICE_DAYS)
    .map((h) => `${h.name} (${h.priceDate})`);
  const negative = holdings.filter((h) => h.quantity < -1e-6).map((h) => h.name);

  const issues = [
    issue("unbalanced", "error", unbalanced),
    issue("imbalance", "error", imbalance),
    issue("negativeHolding", "error", negative),
    issue("noPrice", "warning", noPrice),
    issue("stalePrice", "warning", stale),
    issue("future", "warning", future),
    issue("duplicates", "warning", dupes),
    issue("noDescription", "info", noDescription),
  ].filter((i): i is QualityIssue => i != null);

  return {
    issues,
    lastDate,
    daysSinceLast: lastDate ? dayDiff(lastDate, today) : null,
  };
};
