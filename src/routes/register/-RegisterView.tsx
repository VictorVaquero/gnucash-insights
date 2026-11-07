import {
  faArrowDownWideShort,
  faArrowUpWideShort,
  faChevronLeft,
  faChevronRight,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  buildRegister,
  columnKeys,
  accountPath,
  registerCsv,
  registerMatcher,
  registerTotals,
  type RegisterAccount,
  type RegisterRow,
  type RegisterSplit,
} from "@/common/register";
import { SEARCH_FIELDS, type SearchField } from "@/common/search";
import { formatCurrency } from "@/common/utils";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 100;

type ViewMode = "simple" | "detailed";

const inputCls =
  "h-8 rounded border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";
const btnCls =
  "inline-flex h-8 items-center gap-1.5 rounded border border-border px-2.5 text-sm hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent";

const TransferLink = (props: {
  id: string | undefined;
  label: string | undefined;
  onGo: (id: string) => void;
}) =>
  props.id ? (
    <button
      type="button"
      className="text-left hover:underline"
      onClick={(e) => {
        e.stopPropagation();
        props.onGo(props.id as string);
      }}
    >
      {props.label}
    </button>
  ) : (
    <>{props.label}</>
  );

const Reconciled = ({ flag }: { flag: string }) => (
  <span
    className={cn("font-mono text-xs", flag === "y" ? "text-emerald-600" : "text-muted-foreground")}
  >
    {flag === "n" || !flag ? "" : flag.toUpperCase()}
  </span>
);

interface RegisterViewProps {
  splits: RegisterSplit[];
  accounts: RegisterAccount[];
  accountId: string;
  onAccountChange: (id: string) => void;
}

/** A GnuCash-style account register: basic ledger or transaction journal, one account at a time. */
export const RegisterView = ({
  splits,
  accounts,
  accountId,
  onAccountChange,
}: RegisterViewProps) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [mode, setMode] = useState<ViewMode>("simple");
  const [newestFirst, setNewestFirst] = useState(true);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchField>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const account = accountMap.get(accountId);

  // Accounts with at least one split, in tree order (sorted by full path).
  const options = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of splits) counts.set(s.accountId, (counts.get(s.accountId) ?? 0) + 1);
    return accounts
      .filter((a) => a.accountType !== "ROOT" && (counts.get(a.id) ?? 0) > 0)
      .map((a) => ({
        id: a.id,
        type: a.accountType,
        path: accountPath(a.id, accountMap),
        count: counts.get(a.id) ?? 0,
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [accounts, splits, accountMap]);
  const index = options.findIndex((o) => o.id === accountId);

  const register = useMemo(
    () => buildRegister(splits, accountId, accountMap),
    [splits, accountId, accountMap],
  );
  const rows = useMemo(() => {
    const matches = registerMatcher(query, scope);
    const type = account?.accountType ?? "";
    const filtered = register.filter(
      (r) => (!from || r.date >= from) && (!to || r.date <= to) && matches(r, type),
    );
    return newestFirst ? [...filtered].reverse() : filtered;
  }, [register, query, scope, from, to, newestFirst, account]);
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
  const reset = () => setPage(0);
  const goTo = (i: number) => {
    const o = options[i];
    if (o) {
      onAccountChange(o.id);
      reset();
    }
  };
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const showSplits = (r: RegisterRow) => mode === "detailed" || expanded.has(r.splitId);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={btnCls}
              disabled={index <= 0}
              onClick={() => goTo(index - 1)}
              aria-label={t("register.previous")}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <select
              aria-label={t("register.account")}
              className={cn(inputCls, "min-w-0 flex-1 md:max-w-xl")}
              value={accountId}
              onChange={(e) => {
                onAccountChange(e.target.value);
                reset();
              }}
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.path} ({o.count})
                </option>
              ))}
            </select>
            <button
              type="button"
              className={btnCls}
              disabled={index < 0 || index >= options.length - 1}
              onClick={() => goTo(index + 1)}
              aria-label={t("register.next")}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              label={t("register.view")}
              value={mode}
              onChange={setMode}
              options={[
                { value: "simple", label: t("register.simple") },
                { value: "detailed", label: t("register.detailed") },
              ]}
            />
            <button type="button" className={btnCls} onClick={() => setNewestFirst((v) => !v)}>
              <FontAwesomeIcon icon={newestFirst ? faArrowDownWideShort : faArrowUpWideShort} />
              {newestFirst ? t("register.newestFirst") : t("register.oldestFirst")}
            </button>
            <input
              type="search"
              aria-label={t("register.search")}
              placeholder={t("register.search")}
              className={cn(inputCls, "min-w-40 flex-1 md:max-w-xs")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                reset();
              }}
            />
            <select
              aria-label={t("analysis.filters.searchScope")}
              className={inputCls}
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as SearchField);
                reset();
              }}
            >
              {SEARCH_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {t(`analysis.filters.fields.${f}`)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              {t("register.from")}
              <input
                type="date"
                className={inputCls}
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  reset();
                }}
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              {t("register.to")}
              <input
                type="date"
                className={inputCls}
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  reset();
                }}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="mr-2 inline-flex gap-1">
              {mode === "simple" && (
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    setExpanded(
                      expanded.size
                        ? new Set()
                        : new Set(rows.filter((r) => r.isSplit).map((r) => r.splitId)),
                    )
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
                        onGo={onAccountChange}
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
                            onGo={onAccountChange}
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
            onClick={() => setPage(current - 1)}
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
            onClick={() => setPage(current + 1)}
          >
            {t("register.nextPage")}
          </button>
        </div>
      )}
    </div>
  );
};
