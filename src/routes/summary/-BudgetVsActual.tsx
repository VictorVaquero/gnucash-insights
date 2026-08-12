import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatCurrency } from "@/common/utils.ts";
import { useAuth } from "@/contexts/useAuthContext";
import { transactByAccountOptions } from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "cashpy.budgets.v1";

const readBudgets = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
};

interface Row {
  accountId: string;
  accountName: string;
  spent: number;
  target: number;
}

const BudgetRow = (props: { row: Row; onChangeTarget: (value: number) => void }) => {
  const { row, onChangeTarget } = props;
  const { locale } = useLocale();
  const { t } = useTranslation();
  const pct = row.target > 0 ? (row.spent / row.target) * 100 : 0;
  const barColor = pct > 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500";

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
            onChange={(e) => onChangeTarget(Number(e.target.value) || 0)}
            className="w-14 bg-transparent border border-border rounded px-1 py-0.5 text-right text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
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

  const setTarget = (accountId: string, value: number) => {
    setBudgets((prev) => {
      const next = { ...prev, [accountId]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const { data: rawData } = useQuery(
    transactByAccountOptions({ db, bookId, accountIds: [dbconf.expenses], periodicity: "monthly" }),
  );

  const rows = useMemo<Row[]>(() => {
    if (!rawData || !latestMonth) return [];
    const currentYmd = latestMonth.toISODate();
    const byAccount = new Map<string, { accountName: string; spent: number }>();
    for (const row of rawData) {
      if (row.date !== currentYmd) continue;
      const entry = byAccount.get(row.accountId) ?? { accountName: row.accountName, spent: 0 };
      entry.spent += Math.abs(row.value);
      byAccount.set(row.accountId, entry);
    }
    return Array.from(byAccount.entries())
      .map(([accountId, { accountName, spent }]) => ({
        accountId,
        accountName,
        spent,
        target: budgets[accountId] ?? 0,
      }))
      .filter((r) => r.spent > 0 || r.target > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 8);
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
        <BudgetRow
          key={row.accountId}
          row={row}
          onChangeTarget={(value) => setTarget(row.accountId, value)}
        />
      ))}
    </div>
  );
};
