import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { parseNum } from "@/common/utils.ts";
import { useAuth } from "@/contexts/useAuthContext";
import { transactByAccountOptions } from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { cn } from "@/lib/utils";

interface Mover {
  accountId: string;
  accountName: string;
  current: number;
  previous: number;
  delta: number;
  pct: number | null;
}

export const TopMovers = (props: { className?: string }) => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { user } = useAuth();
  const { latestMonth } = useDomain();
  const dbconf = getConfig(user);

  const { data: rawData } = useQuery(
    transactByAccountOptions({
      db,
      bookId,
      accountIds: [dbconf.expenses],
      periodicity: "monthly",
    }),
  );

  const movers = useMemo<Mover[]>(() => {
    if (!rawData || !latestMonth) return [];
    const currentYmd = latestMonth.toISODate();
    const previousYmd = latestMonth.minus({ months: 1 }).toISODate();

    const byAccount = new Map<string, { accountName: string; current: number; previous: number }>();
    for (const row of rawData) {
      if (row.date !== currentYmd && row.date !== previousYmd) continue;
      const entry = byAccount.get(row.accountId) ?? {
        accountName: row.accountName,
        current: 0,
        previous: 0,
      };
      if (row.date === currentYmd) entry.current += Math.abs(row.value);
      else entry.previous += Math.abs(row.value);
      byAccount.set(row.accountId, entry);
    }

    return Array.from(byAccount.entries())
      .map(([accountId, { accountName, current, previous }]) => ({
        accountId,
        accountName,
        current,
        previous,
        delta: current - previous,
        pct: previous > 0 ? ((current - previous) / previous) * 100 : null,
      }))
      .filter((m) => m.current > 0 || m.previous > 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 5);
  }, [rawData, latestMonth]);

  if (movers.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", props.className)}>Not enough data yet.</p>
    );
  }

  return (
    <div className={cn("flex flex-col", props.className)}>
      {movers.map((m) => (
        <div
          key={m.accountId}
          className="flex items-center justify-between gap-3 py-1.5 border-b border-border/60 last:border-b-0"
        >
          <span className="text-sm text-muted-foreground truncate">{m.accountName}</span>
          <div className="flex items-center gap-2 shrink-0 tabular-nums">
            <span className="text-sm font-medium">{parseNum(m.current, { digits: 0 })}</span>
            <span className={cn("text-xs", m.delta > 0 ? "text-red-600" : "text-green-600")}>
              {m.delta > 0 ? "▲" : "▼"}{" "}
              {m.pct != null ? parseNum(Math.abs(m.pct), { digits: 0, symbol: "%" }) : "New"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
