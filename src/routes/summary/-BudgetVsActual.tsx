import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

import { formatCurrency } from "@/common/utils.ts";
import { useAuth } from "@/contexts/useAuthContext";
import { transactByAccountOptions } from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "cashpy.budgets.v1";

// Targets live in the browser (the dashboard has no write access to the database), keyed by
// account id so they survive every re-import of the ledger.
const readBudgets = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0,
      ),
    );
  } catch {
    return {};
  }
};

const writeBudgets = (budgets: Record<string, number>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
  } catch {
    // Storage full or blocked: the target still applies for this session.
  }
};

const MAX_UNBUDGETED_ROWS = 8;

interface Row {
  accountId: string;
  accountName: string;
  spent: number;
  target: number;
}

const BudgetRow = (props: {
  row: Row;
  onChangeTarget: (accountId: string, value: number) => void;
}) => {
  const { row, onChangeTarget } = props;
  const { locale } = useLocale();
  const { t } = useTranslation();
  const pct = row.target > 0 ? (row.spent / row.target) * 100 : 0;
  const barColor = pct > 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500";

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChangeTarget(row.accountId, Number(e.target.value) || 0);
    },
    [onChangeTarget, row.accountId],
  );

  const barStyle = useMemo(() => ({ width: `${Math.min(pct, 100)}%` }), [pct]);

  return (
    <div className="flex flex-col gap-1 py-1.5 border-b border-border/60 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground truncate">{row.accountName}</span>
        <div className="flex items-center gap-1 shrink-0 tabular-nums">
          <span className="text-sm font-medium">
            {formatCurrency(row.spent, locale, { digits: 0, compact: true })}
          </span>
          <span className="text-xs text-muted-foreground">/</span>
          <input
            type="number"
            min={0}
            value={row.target || ""}
            placeholder={t("summary.budget.setPlaceholder")}
            onChange={handleChange}
            className="w-14 bg-transparent border border-border rounded px-1 py-0.5 text-right text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={barStyle} />
      </div>
    </div>
  );
};

export const BudgetVsActual = (props: { className?: string }) => {
  const { t } = useTranslation();
  const { db } = useDB();
  const { bookId } = useBook();
  const { user } = useAuth();
  const { latestMonth } = useDomain();
  const dbconf = getConfig(user);

  const [budgets, setBudgets] = useState<Record<string, number>>(readBudgets);

  const setTarget = useCallback((accountId: string, value: number) => {
    setBudgets((prev) => {
      const rest = Object.entries(prev).filter(([id]) => id !== accountId);
      const next = Object.fromEntries(value > 0 ? [...rest, [accountId, value]] : rest);
      writeBudgets(next);
      return next;
    });
  }, []);

  const { data: rawData } = useQuery(
    transactByAccountOptions({ db, bookId, accountIds: [dbconf.expenses], periodicity: "monthly" }),
  );

  const rows = useMemo<Row[]>(() => {
    if (!rawData || !latestMonth) return [];
    const currentYmd = latestMonth.toISODate();
    const names = new Map<string, string>();
    const spentByAccount = new Map<string, number>();
    for (const row of rawData) {
      names.set(row.accountId, row.accountName);
      if (row.date !== currentYmd) continue;
      spentByAccount.set(
        row.accountId,
        (spentByAccount.get(row.accountId) ?? 0) + Math.abs(row.value),
      );
    }
    const toRow = (accountId: string): Row => ({
      accountId,
      accountName: names.get(accountId) ?? accountId,
      spent: spentByAccount.get(accountId) ?? 0,
      target: budgets[accountId] ?? 0,
    });

    // Every account with a target stays listed even when nothing was spent on it this month
    // (a month that has just started would otherwise hide all of them). The remaining room
    // goes to the biggest spenders so a new target can be set on them.
    const budgeted = Object.keys(budgets)
      .filter((id) => names.has(id))
      .map(toRow)
      .sort((a, b) => b.spent - a.spent);
    const unbudgeted = Array.from(spentByAccount.keys())
      .filter((id) => !(id in budgets))
      .map(toRow)
      .filter((r) => r.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, MAX_UNBUDGETED_ROWS);
    return [...budgeted, ...unbudgeted];
  }, [rawData, latestMonth, budgets]);

  if (rows.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", props.className)}>
        {t("summary.budget.empty")}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col", props.className)}>
      {rows.map((row) => (
        <BudgetRow key={row.accountId} row={row} onChangeTarget={setTarget} />
      ))}
    </div>
  );
};
