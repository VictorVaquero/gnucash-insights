import {
  faArrowDownWideShort,
  faArrowUpWideShort,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DateTime } from "luxon";
import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  buildRegister,
  columnKeys,
  registerCsv,
  registerMatcher,
  registerTotals,
  type RegisterAccount,
  type RegisterRow,
  type RegisterSplit,
} from "@/common/register";
import { formatCurrency } from "@/common/utils";
import { SearchFilters } from "@/components/SearchFilters";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 100;

const inputCls =
  "h-8 rounded border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";
const btnCls =
  "inline-flex h-8 items-center gap-1.5 rounded border border-border px-2.5 text-sm hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent";

const TransferLink = (props: {
  id: string | undefined;
  label: string | undefined;
  onGo: (id: string, opts?: { newTab?: boolean }) => void;
}) => {
  const { t } = useTranslation();
  return props.id ? (
    <button
      type="button"
      className="text-left hover:underline"
      title={t("register.openAccountHint")}
      onClick={(e) => {
        e.stopPropagation();
        props.onGo(props.id as string, { newTab: e.ctrlKey || e.metaKey || e.shiftKey });
      }}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          e.stopPropagation();
          props.onGo(props.id as string, { newTab: true });
        }
      }}
    >
      {props.label}
    </button>
  ) : (
    <>{props.label}</>
  );
};

const Reconciled = ({ flag }: { flag: string }) => (
  <span
    className={cn("font-mono text-xs", flag === "y" ? "text-emerald-600" : "text-muted-foreground")}
  >
    {flag === "n" || !flag ? "" : flag.toUpperCase()}
  </span>
);

export type ViewMode = "simple" | "detailed";

/** Everything the user can tweak on one register tab. */
export interface RegisterViewState {
  mode: ViewMode;
  newestFirst: boolean;
  query: string;
  from: string;
  to: string;
  page: number;
  expanded: string[];
  /** "all" | "unreconciled" | "reconciled" */
  recon: ReconFilter;
}

export type ReconFilter = "all" | "unreconciled" | "reconciled";

export const initialRegisterState: RegisterViewState = {
  mode: "simple",
  newestFirst: true,
  query: "",
  from: "",
  to: "",
  page: 0,
  expanded: [],
  recon: "all",
};

interface RegisterViewProps {
  splits: RegisterSplit[];
  accounts: RegisterAccount[];
  accountId: string;
  state: RegisterViewState;
  onState: (patch: Partial<RegisterViewState>) => void;
  /** Open another account (normally in this tab; `newTab` keeps this one open). */
  onOpenAccount: (id: string, opts?: { newTab?: boolean }) => void;
}

const presetRange = (id: "month" | "3m" | "year" | "1y"): { from: string; to: string } => {
  const now = DateTime.now();
  const iso = (d: DateTime) => d.toISODate() ?? "";
  switch (id) {
    case "month":
      return { from: iso(now.startOf("month")), to: iso(now.endOf("month")) };
    case "3m":
      return { from: iso(now.minus({ months: 3 })), to: iso(now) };
    case "year":
      return { from: iso(now.startOf("year")), to: iso(now.endOf("year")) };
    default:
      return { from: iso(now.minus({ years: 1 })), to: iso(now) };
  }
};

/** A GnuCash-style account register: basic ledger or transaction journal, one account. */
export const RegisterView = ({
  splits,
  accounts,
  accountId,
  state,
  onState,
  onOpenAccount,
}: RegisterViewProps) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { mode, newestFirst, query, from, to, page, recon } = state;
  const expanded = useMemo(() => new Set(state.expanded), [state.expanded]);

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const account = accountMap.get(accountId);

  const register = useMemo(
    () => buildRegister(splits, accountId, accountMap),
    [splits, accountId, accountMap],
  );
  const rows = useMemo(() => {
    const matches = registerMatcher(query);
    const type = account?.accountType ?? "";
    const filtered = register.filter(
      (r) =>
        (!from || r.date >= from) &&
        (!to || r.date <= to) &&
        (recon === "all" || (recon === "reconciled") === (r.reconciled === "y")) &&
        matches(r, type),
    );
    return newestFirst ? [...filtered].reverse() : filtered;
  }, [register, query, from, to, newestFirst, recon, account]);
  const totals = useMemo(() => registerTotals(rows), [rows]);
  const exportCsv = () => {
    const blob = new Blob([registerCsv([...rows].sort((a, b) => a.date.localeCompare(b.date)))], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `register-${(account?.name ?? "account").replace(/\W+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  const [leftKey, rightKey] = columnKeys(account?.accountType ?? "");
  const money = (v: number) => (v ? formatCurrency(v, locale) : "");
  const endBalance = register[register.length - 1]?.balance ?? 0;
  // Any change to a filter sends the table back to its first page.
  const setFilter = (patch: Partial<RegisterViewState>) => onState({ ...patch, page: 0 });
  const toggle = (id: string) =>
    onState({
      expanded: expanded.has(id) ? state.expanded.filter((x) => x !== id) : [...state.expanded, id],
    });
  const filtersActive = Boolean(query || from || to || recon !== "all");

  const showSplits = (r: RegisterRow) => mode === "detailed" || expanded.has(r.splitId);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              label={t("register.view")}
              value={mode}
              onChange={(m) => onState({ mode: m })}
              options={[
                { value: "simple", label: t("register.simple") },
                { value: "detailed", label: t("register.detailed") },
              ]}
            />
            <button
              type="button"
              className={btnCls}
              onClick={() => onState({ newestFirst: !newestFirst })}
            >
              <FontAwesomeIcon icon={newestFirst ? faArrowDownWideShort : faArrowUpWideShort} />
              {newestFirst ? t("register.newestFirst") : t("register.oldestFirst")}
            </button>
            <SegmentedControl
              label={t("register.reconFilter")}
              value={recon}
              onChange={(v) => setFilter({ recon: v })}
              options={[
                { value: "all", label: t("register.recon.all") },
                { value: "unreconciled", label: t("register.recon.unreconciled") },
                { value: "reconciled", label: t("register.recon.reconciled") },
              ]}
            />
          </div>
          <SearchFilters
            idPrefix="register-search"
            value={query}
            onChange={(q) => setFilter({ query: q })}
          />
          <div className="flex flex-wrap items-center gap-2">
            {(["month", "3m", "year", "1y"] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={btnCls}
                onClick={() => setFilter(presetRange(id))}
              >
                {t(`register.preset.${id}`)}
              </button>
            ))}
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              {t("register.from")}
              <input
                type="date"
                className={inputCls}
                value={from}
                onChange={(e) => setFilter({ from: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              {t("register.to")}
              <input
                type="date"
                className={inputCls}
                value={to}
                onChange={(e) => setFilter({ to: e.target.value })}
              />
            </label>
            {filtersActive && (
              <button
                type="button"
                className="text-xs underline text-muted-foreground"
                onClick={() => setFilter({ query: "", from: "", to: "", recon: "all" })}
              >
                {t("register.resetFilters")}
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="mr-2 inline-flex gap-2">
              {mode === "simple" && (
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    onState({
                      expanded: expanded.size
                        ? []
                        : rows.filter((r) => r.isSplit).map((r) => r.splitId),
                    })
                  }
                >
                  {expanded.size ? t("register.collapseAll") : t("register.expandAll")}
                </button>
              )}
              <button
                type="button"
                className="inline-flex items-center gap-1 underline"
                onClick={exportCsv}
              >
                <FontAwesomeIcon icon={faDownload} />
                {t("register.exportCsv")}
              </button>
            </span>
            {t("register.summary", {
              count: rows.length,
              total: register.length,
              type: account?.accountType ?? "",
            })}{" "}
            · {t(`register.cols.${leftKey}`)}: {formatCurrency(totals.debit, locale)} ·{" "}
            {t(`register.cols.${rightKey}`)}: {formatCurrency(totals.credit, locale)} ·{" "}
            {t("register.balance")}:{" "}
            <span className={cn("font-medium tabular-nums", endBalance < 0 && "text-red-600")}>
              {formatCurrency(endBalance, locale)}
            </span>
          </p>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table
          className="w-full min-w-[44rem] border-collapse text-sm"
          data-testid="register-table"
        >
          <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">{t("register.date")}</th>
              <th className="px-2 py-1.5 text-left font-medium">{t("register.num")}</th>
              <th className="px-2 py-1.5 text-left font-medium">{t("register.description")}</th>
              <th className="px-2 py-1.5 text-left font-medium">{t("register.transfer")}</th>
              <th className="px-2 py-1.5 text-center font-medium">R</th>
              <th className="px-2 py-1.5 text-right font-medium">
                {t(`register.cols.${leftKey}`)}
              </th>
              <th className="px-2 py-1.5 text-right font-medium">
                {t(`register.cols.${rightKey}`)}
              </th>
              <th className="px-2 py-1.5 text-right font-medium">{t("register.balance")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">
                  {t("register.empty")}
                </td>
              </tr>
            )}
            {visible.map((r, i) => (
              <Fragment key={r.splitId}>
                <tr
                  className={cn(
                    "border-t border-border align-top",
                    i % 2 === 1 && "bg-muted/30",
                    mode === "detailed" && "bg-muted/50 font-medium",
                    r.isSplit && mode === "simple" && "cursor-pointer hover:bg-accent/60",
                  )}
                  onClick={mode === "simple" && r.isSplit ? () => toggle(r.splitId) : undefined}
                >
                  <td className="whitespace-nowrap px-2 py-1 tabular-nums">{r.date}</td>
                  <td className="px-2 py-1 text-muted-foreground">{r.num}</td>
                  <td className="px-2 py-1">
                    {r.description}
                    {mode === "detailed" && r.notes && (
                      <span className="block text-xs font-normal italic text-muted-foreground">
                        {r.notes}
                      </span>
                    )}
                    {mode === "detailed" && (
                      <span className="block font-mono text-[10px] font-normal text-muted-foreground">
                        {r.transactionId}
                        {r.unbalanced && (
                          <span className="ml-2 font-sans text-red-600">
                            {t("register.unbalanced")}
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {r.isSplit ? (
                      <span className="italic">{t("register.splitTransaction")}</span>
                    ) : (
                      <TransferLink
                        id={r.splits.find((x) => !x.isThis)?.accountId}
                        label={r.transfers[0]}
                        onGo={onOpenAccount}
                      />
                    )}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <Reconciled flag={r.reconciled} />
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">{money(r.debit)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{money(r.credit)}</td>
                  <td
                    className={cn(
                      "px-2 py-1 text-right tabular-nums",
                      r.balance < 0 && "text-red-600",
                    )}
                  >
                    {formatCurrency(r.balance, locale)}
                  </td>
                </tr>
                {showSplits(r) &&
                  (r.isSplit || mode === "detailed") &&
                  r.splits.map((s) => (
                    <tr
                      key={s.splitId}
                      className={cn(
                        "text-xs",
                        s.isThis ? "bg-primary/5" : "bg-muted/20",
                        "text-muted-foreground",
                      )}
                    >
                      <td />
                      <td className="px-2 py-0.5">{s.action}</td>
                      <td className="px-2 py-0.5 pl-6 italic">{s.memo}</td>
                      <td className={cn("px-2 py-0.5", s.isThis && "font-medium text-foreground")}>
                        {s.isThis ? (
                          s.accountPath
                        ) : (
                          <TransferLink
                            id={s.accountId}
                            label={s.accountPath}
                            onGo={onOpenAccount}
                          />
                        )}
                      </td>
                      <td className="px-2 py-0.5 text-center">
                        <Reconciled flag={s.reconciled} />
                      </td>
                      <td className="px-2 py-0.5 text-right tabular-nums">{money(s.debit)}</td>
                      <td className="px-2 py-0.5 text-right tabular-nums">{money(s.credit)}</td>
                      <td />
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            className={btnCls}
            disabled={current === 0}
            onClick={() => onState({ page: current - 1 })}
          >
            {t("register.prevPage")}
          </button>
          <span className="text-muted-foreground tabular-nums">
            {current + 1} / {pages}
          </span>
          <button
            type="button"
            className={btnCls}
            disabled={current >= pages - 1}
            onClick={() => onState({ page: current + 1 })}
          >
            {t("register.nextPage")}
          </button>
        </div>
      )}
    </div>
  );
};
