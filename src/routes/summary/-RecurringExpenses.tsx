import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { parseNum } from "@/common/utils.ts";
import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions, fullTransactionsOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { cn } from "@/lib/utils";

const WINDOW_MONTHS = 6;
const MIN_MONTHS_SEEN = 3;
const MAX_COEFFICIENT_OF_VARIATION = 0.2;

interface Recurring {
  key: string;
  description: string;
  accountName: string;
  avgAmount: number;
  monthsSeen: number;
  lastDate: string;
}

export const RecurringExpenses = (props: { className?: string }) => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { user } = useAuth();
  const { latestMonth } = useDomain();
  const dbconf = getConfig(user);

  const { data: expenseAccounts } = useQuery(
    accountsOptions({ db, bookId, accountIds: [dbconf.expenses] }),
  );
  const { data: transactions } = useQuery(fullTransactionsOptions(db, bookId));

  const recurring = useMemo<Recurring[]>(() => {
    if (!transactions || !expenseAccounts || !latestMonth) return [];
    const expenseAccountIds = new Set(expenseAccounts.map((a) => a.id));
    const cutoff = latestMonth.minus({ months: WINDOW_MONTHS }).toISODate();
    if (!cutoff) return [];

    const groups = new Map<
      string,
      {
        description: string;
        accountName: string;
        amounts: number[];
        months: Set<string>;
        lastDate: string;
      }
    >();

    for (const tx of transactions) {
      if (!expenseAccountIds.has(tx.accountId)) continue;
      const description = tx.description?.trim();
      if (!description) continue;
      if (!tx.ymdPosted || tx.ymdPosted < cutoff) continue;

      const key = description.toLowerCase();
      const entry = groups.get(key) ?? {
        description,
        accountName: tx.accountName,
        amounts: [],
        months: new Set<string>(),
        lastDate: tx.ymdPosted,
      };
      entry.amounts.push(Math.abs(tx.value));
      entry.months.add(tx.ymdPosted.slice(0, 7));
      if (tx.ymdPosted > entry.lastDate) {
        entry.lastDate = tx.ymdPosted;
        entry.description = description;
        entry.accountName = tx.accountName;
      }
      groups.set(key, entry);
    }

    const results: Recurring[] = [];
    for (const [key, entry] of groups) {
      if (entry.months.size < MIN_MONTHS_SEEN) continue;
      const mean = entry.amounts.reduce((a, b) => a + b, 0) / entry.amounts.length;
      if (mean <= 0) continue;
      const variance =
        entry.amounts.reduce((sum, v) => sum + (v - mean) ** 2, 0) / entry.amounts.length;
      const stddev = Math.sqrt(variance);
      if (stddev / mean > MAX_COEFFICIENT_OF_VARIATION) continue;

      results.push({
        key,
        description: entry.description,
        accountName: entry.accountName,
        avgAmount: mean,
        monthsSeen: entry.months.size,
        lastDate: entry.lastDate,
      });
    }

    return results.sort((a, b) => b.avgAmount - a.avgAmount).slice(0, 8);
  }, [transactions, expenseAccounts, latestMonth]);

  if (recurring.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", props.className)}>
        No recurring charges detected yet.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col", props.className)}>
      {recurring.map((r) => (
        <div
          key={r.key}
          className="flex items-center justify-between gap-3 py-1.5 border-b border-border/60 last:border-b-0"
        >
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground truncate">{r.description}</p>
            <p className="text-xs text-muted-foreground/70 truncate">{r.accountName}</p>
          </div>
          <div className="flex flex-col items-end shrink-0 tabular-nums">
            <span className="text-sm font-medium">{parseNum(r.avgAmount, { digits: 0 })}</span>
            <span className="text-xs text-muted-foreground">
              {r.monthsSeen}/{WINDOW_MONTHS} mo
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
