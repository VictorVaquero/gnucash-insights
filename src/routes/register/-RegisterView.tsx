import {
  faArrowDownWideShort,
  faArrowUpWideShort,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DateTime } from "luxon";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  buildRegister,
  columnKeys,
  registerCsv,
  registerMatcher,
  registerTotals,
  sideTone,
  type Tone,
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

/** Rows rendered per chunk; more are added as the list is scrolled. */
const CHUNK = 80;

const inputCls =
  "h-8 rounded border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";
const btnCls =
  "inline-flex h-8 items-center gap-1.5 rounded border border-border px-2.5 text-sm hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent";

const TONE: Record<Tone, string> = {
  good: "text-emerald-700 dark:text-emerald-400",
  bad: "text-red-700 dark:text-red-400",
  neutral: "text-foreground",
};

const TYPE_DOT: Record<string, string> = {
  INCOME: "bg-emerald-500",
  EXPENSE: "bg-red-500",
  BANK: "bg-sky-500",
  CASH: "bg-sky-500",
  ASSET: "bg-sky-500",
  STOCK: "bg-violet-500",
  MUTUAL: "bg-violet-500",
  LIABILITY: "bg-amber-500",
  CREDIT: "bg-amber-500",
  PAYABLE: "bg-amber-500",
  RECEIVABLE: "bg-teal-500",
  EQUITY: "bg-slate-400",
};

const monthLabel = (date: string, locale: string) =>
  DateTime.fromISO(date).setLocale(locale).toFormat("LLLL yyyy");
const dayLabel = (date: string, locale: string) =>
  DateTime.fromISO(date).setLocale(locale).toFormat("dd LLL yyyy");

/** Account path with the leaf name emphasised and a dot coloured by account type. */
const AccountLabel = (props: {
  path: string | undefined;
  type: string | undefined;
  id: string | undefined;
  onGo: (id: string, opts?: { newTab?: boolean }) => void;
}) => {
  const path = props.path ?? "";
  const cut = path.lastIndexOf(":");
  const parent = cut >= 0 ? path.slice(0, cut + 1) : "";
  const leaf = cut >= 0 ? path.slice(cut + 1) : path;
  return (
    <span className="inline-flex items-baseline gap-2">
      <span
        aria-hidden
        className={cn(
          "inline-block size-2 shrink-0 translate-y-px rounded-full",
          TYPE_DOT[props.type ?? ""] ?? "bg-slate-400",
        )}
      />
      <TransferLink
        id={props.id}
        label={
          <>
            <span className="text-xs text-muted-foreground">{parent}</span>
            <span className="font-medium text-foreground">{leaf}</span>
          </>
        }
        onGo={props.onGo}
      />
    </span>
  );
};

const TransferLink = (props: {
  id: string | undefined;
  label: ReactNode;
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

const Reconciled = ({ flag }: { flag: string }) =>
  flag === "n" || !flag ? null : (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-full text-[11px] font-bold",
        flag === "y"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
      )}
    >
      {flag === "y" ? "✓" : flag.toUpperCase()}
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

const RegisterRowGroup = memo(function RegisterRowGroup(props: {
  r: RegisterRow;
  newMonth: boolean;
  odd: boolean;
  mode: ViewMode;
  open: boolean;
  accountType: string;
  accountMap: Map<string, RegisterAccount>;
  locale: string;
  onToggle: (id: string) => void;
  onOpenAccount: (id: string, opts?: { newTab?: boolean }) => void;
}) {
  const { r, newMonth, odd, mode, open, accountType, accountMap, locale, onToggle, onOpenAccount } =
    props;
  const { t } = useTranslation();
  const money = (v: number) => (v ? formatCurrency(v, locale) : "");
  const typeOf = (id: string | undefined) => accountMap.get(id ?? "")?.accountType;
  const other = r.splits.find((x) => !x.isThis);
  return (
    <tbody>
      {newMonth && (
        <tr className="bg-primary/10">
          <td
            colSpan={8}
            className="border-t border-border px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary"
          >
            {monthLabel(r.date, locale)}
          </td>
        </tr>
      )}
      <tr
        className={cn(
          "border-t border-border/70 align-top hover:bg-accent/60",
          odd && "bg-muted/40",
          mode === "simple" && "cursor-pointer",
          open && "border-b-0",
          r.unbalanced && "bg-red-50 dark:bg-red-950/30",
        )}
        onClick={mode === "simple" ? () => onToggle(r.splitId) : undefined}
      >
        <td className="whitespace-nowrap px-3 py-2.5 font-medium tabular-nums">
          {dayLabel(r.date, locale)}
        </td>
        <td className="px-2 py-2.5 text-muted-foreground">{r.num}</td>
        <td className="px-3 py-2.5">
          <span className="font-semibold text-foreground">{r.description}</span>
          {r.unbalanced && (
            <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
              {t("register.unbalanced")}
            </span>
          )}
        </td>
        <td className="px-3 py-2.5">
          {r.isSplit ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-sm italic text-foreground/80">
              {t("register.splitTransaction")} · {r.splits.length}
            </span>
          ) : (
            <AccountLabel
              path={r.transfers[0]}
              type={typeOf(other?.accountId)}
              id={other?.accountId}
              onGo={onOpenAccount}
            />
          )}
        </td>
        <td className="px-2 py-2.5 text-center">
          <Reconciled flag={r.reconciled} />
        </td>
        <td
          className={cn(
            "whitespace-nowrap px-3 py-2.5 text-right text-base font-semibold tabular-nums",
            TONE[sideTone(accountType, "left")],
          )}
        >
          {money(r.debit)}
        </td>
        <td
          className={cn(
            "whitespace-nowrap px-3 py-2.5 text-right text-base font-semibold tabular-nums",
            TONE[sideTone(accountType, "right")],
          )}
        >
          {money(r.credit)}
        </td>
        <td
          className={cn(
            "whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums",
            r.balance < 0 ? "text-red-600 dark:text-red-400" : "text-foreground",
          )}
        >
          {formatCurrency(r.balance, locale)}
        </td>
      </tr>
      {open && (
        <tr className="bg-muted/30 text-sm">
          <td className="border-l-4 border-primary/50" />
          <td />
          <td colSpan={6} className="px-3 py-1.5 pl-6 text-muted-foreground">
            {r.notes && <span className="italic">{r.notes}</span>}
            <span className="ml-3 font-mono text-[11px]">{r.transactionId}</span>
          </td>
        </tr>
      )}
      {open &&
        r.splits.map((s) => (
          <tr key={s.splitId} className={cn("text-sm", s.isThis ? "bg-primary/10" : "bg-muted/30")}>
            <td className="border-l-4 border-primary/50" />
            <td className="px-2 py-1.5 text-muted-foreground">{s.action}</td>
            <td className="px-3 py-1.5 pl-6 italic text-muted-foreground">{s.memo}</td>
            <td className="px-3 py-1.5">
              {s.isThis ? (
                <span className="font-semibold text-foreground">{s.accountPath}</span>
              ) : (
                <AccountLabel
                  path={s.accountPath}
                  type={typeOf(s.accountId)}
                  id={s.accountId}
                  onGo={onOpenAccount}
                />
              )}
            </td>
            <td className="px-2 py-1.5 text-center">
              <Reconciled flag={s.reconciled} />
            </td>
            <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-foreground/80">
              {money(s.debit)}
            </td>
            <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-foreground/80">
              {money(s.credit)}
            </td>
            <td />
          </tr>
        ))}
    </tbody>
  );
});

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
  const { mode, newestFirst, query, from, to, recon } = state;
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

  // Infinite scroll: render a chunk, add another when the sentinel nears the viewport. The
  // count restarts whenever the row set changes (filters, account, sort).
  const [grown, setGrown] = useState<{ rows: RegisterRow[]; n: number }>({ rows, n: CHUNK });
  const shown = grown.rows === rows ? grown.n : CHUNK;
  const visible = useMemo(() => rows.slice(0, shown), [rows, shown]);
  const hasMore = shown < rows.length;
  const scroller = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting))
          setGrown({ rows, n: Math.min(rows.length, shown + CHUNK) });
      },
      { root: scroller.current, rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, shown, rows]);

  const [leftKey, rightKey] = columnKeys(account?.accountType ?? "");
  const endBalance = register[register.length - 1]?.balance ?? 0;
  const setFilter = (patch: Partial<RegisterViewState>) => onState(patch);
  // Stable toggle so memoised row groups are not re-rendered when only another row changes.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);
  const onToggle = useCallback(
    (id: string) => {
      const cur = latest.current.expanded;
      onState({ expanded: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
    },
    [onState],
  );
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
                      expanded: expanded.size ? [] : rows.map((r) => r.splitId),
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

      <div
        ref={scroller}
        className="max-h-[78vh] overflow-auto rounded-lg border border-border bg-card shadow-sm"
      >
        <table
          className="w-full min-w-[56rem] table-fixed border-collapse text-[15px]"
          data-testid="register-table"
        >
          <colgroup>
            <col className="w-32" />
            <col className="w-16" />
            <col />
            <col className="w-[22rem]" />
            <col className="w-12" />
            <col className="w-32" />
            <col className="w-32" />
            <col className="w-36" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-muted text-xs font-semibold uppercase tracking-wide text-foreground/70 shadow-[0_1px_0_var(--color-border)]">
            <tr>
              <th className="px-3 py-2.5 text-left">{t("register.date")}</th>
              <th className="px-2 py-2.5 text-left">{t("register.num")}</th>
              <th className="px-3 py-2.5 text-left">{t("register.description")}</th>
              <th className="px-3 py-2.5 text-left">{t("register.transfer")}</th>
              <th className="px-2 py-2.5 text-center">R</th>
              <th className="px-3 py-2.5 text-right">{t(`register.cols.${leftKey}`)}</th>
              <th className="px-3 py-2.5 text-right">{t(`register.cols.${rightKey}`)}</th>
              <th className="px-3 py-2.5 text-right">{t("register.balance")}</th>
            </tr>
          </thead>
          {visible.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={8} className="px-2 py-8 text-center text-muted-foreground">
                  {t("register.empty")}
                </td>
              </tr>
            </tbody>
          )}
          {visible.map((r, i) => (
            <RegisterRowGroup
              key={r.splitId}
              r={r}
              newMonth={i === 0 || visible[i - 1].date.slice(0, 7) !== r.date.slice(0, 7)}
              odd={i % 2 === 1}
              mode={mode}
              open={showSplits(r)}
              accountType={account?.accountType ?? ""}
              accountMap={accountMap}
              locale={locale}
              onToggle={onToggle}
              onOpenAccount={onOpenAccount}
            />
          ))}
        </table>
        {rows.length > 0 && (
          <div
            ref={sentinel}
            className="py-2 text-center text-xs text-muted-foreground tabular-nums"
          >
            {t("register.shownOf", { shown: visible.length, total: rows.length })}
          </div>
        )}
      </div>
    </div>
  );
};
