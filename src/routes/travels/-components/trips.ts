import { DateTime } from "luxon";

import type { TripSplit } from "@/db/queries/travel";

export interface TripCategory {
  accountId: string;
  accountName: string;
  value: number;
}

export interface TripTransaction {
  id: string;
  date: string;
  description: string;
  value: number;
  categories: string[];
}

export interface Trip {
  /** Raw notes value, unique per trip. */
  key: string;
  /** Notes with the trip prefix stripped. */
  name: string;
  start: DateTime;
  end: DateTime;
  /** Calendar days from first to last transaction, both included. */
  days: number;
  total: number;
  perDay: number;
  categories: TripCategory[];
  transactions: TripTransaction[];
}

/** Groups expense splits by trip. Amounts are absolute, like the other travel charts. */
export const buildTrips = (splits: TripSplit[], tripDesc: string): Trip[] => {
  const byTrip = new Map<string, TripSplit[]>();
  for (const s of splits) {
    const list = byTrip.get(s.trip) ?? [];
    list.push(s);
    byTrip.set(s.trip, list);
  }

  return Array.from(byTrip, ([key, rows]) => {
    const dates = rows.map((r) => r.date).sort();
    const start = DateTime.fromISO(dates[0]);
    const end = DateTime.fromISO(dates[dates.length - 1]);
    const days = Math.max(1, Math.round(end.diff(start, "days").days) + 1);

    const categories = new Map<string, TripCategory>();
    const txs = new Map<string, TripTransaction>();
    let total = 0;
    for (const r of rows) {
      const value = Math.abs(r.value);
      total += value;
      const cat = categories.get(r.accountId) ?? {
        accountId: r.accountId,
        accountName: r.accountName,
        value: 0,
      };
      cat.value += value;
      categories.set(r.accountId, cat);

      const tx = txs.get(r.transactionId) ?? {
        id: r.transactionId,
        date: r.date,
        description: r.description ?? "",
        value: 0,
        categories: [],
      };
      tx.value += value;
      if (!tx.categories.includes(r.accountName)) tx.categories.push(r.accountName);
      txs.set(r.transactionId, tx);
    }

    return {
      key,
      name: key.slice(tripDesc.length).trim() || key,
      start,
      end,
      days,
      total,
      perDay: total / days,
      categories: Array.from(categories.values()).sort((a, b) => b.value - a.value),
      transactions: Array.from(txs.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }).sort((a, b) => b.start.toMillis() - a.start.toMillis());
};
