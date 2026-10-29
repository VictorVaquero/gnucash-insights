import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { getColor } from "./utils";
import { formatCurrency, formatNumber } from "@/common/utils.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/useAuthContext";
import { tripSplitsOptions } from "@/db/queries/travel";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/types/domain";
import { DateRangePresets } from "../../summary/-DateRangePresets";
import { buildTrips, type Trip } from "./trips";

type SortKey = "date" | "total" | "perDay";

const SORTS: SortKey[] = ["date", "total", "perDay"];

const chipClass = (active: boolean) =>
  cn(
    "text-xs px-3 py-1.5 rounded-full border transition-colors font-medium",
    active
      ? "bg-brand/10 text-brand border-brand"
      : "bg-background text-muted-foreground border-border hover:text-foreground",
  );

const SortChip = (props: { sort: SortKey; active: boolean; onSelect: (s: SortKey) => void }) => {
  const { t } = useTranslation();
  const handleClick = useCallback(() => props.onSelect(props.sort), [props]);
  return (
    <button type="button" onClick={handleClick} className={chipClass(props.active)}>
      {t(`travel.explorer.sort.${props.sort}`)}
    </button>
  );
};

const TripRow = (props: {
  trip: Trip;
  selected: boolean;
  onSelect: (key: string) => void;
  fmtDate: (d: DateTime) => string;
}) => {
  const { trip, selected, onSelect, fmtDate } = props;
  const { locale } = useLocale();
  const handleClick = useCallback(() => onSelect(trip.key), [onSelect, trip.key]);
  return (
    <tr
      onClick={handleClick}
      className={cn(
        "cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-accent/50",
        selected && "bg-accent",
      )}
    >
      <td className="py-2 pr-4 font-medium">{trip.name}</td>
      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{fmtDate(trip.start)}</td>
      <td className="py-2 pr-4 text-right tabular-nums">{trip.days}</td>
      <td className="py-2 pr-4 text-right tabular-nums text-red-600">
        {formatCurrency(trip.perDay, locale, { compact: true })}
      </td>
      <td className="py-2 text-right tabular-nums font-medium">
        {formatCurrency(trip.total, locale, { compact: true })}
      </td>
    </tr>
  );
};

const Stat = (props: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{props.label}</p>
    <p className="font-medium">{props.value}</p>
  </div>
);

const TripDetail = (props: { trip: Trip; fmtDate: (d: DateTime) => string }) => {
  const { trip, fmtDate } = props;
  const { t } = useTranslation();
  const { locale } = useLocale();
  const top = trip.categories[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{trip.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
          <Stat label={t("travel.explorer.start")} value={fmtDate(trip.start)} />
          <Stat label={t("travel.explorer.end")} value={fmtDate(trip.end)} />
          <Stat label={t("travel.explorer.days")} value={String(trip.days)} />
          <Stat
            label={t("travel.explorer.total")}
            value={formatCurrency(trip.total, locale, { compact: true })}
          />
          <Stat
            label={t("travel.explorer.perDay")}
            value={formatCurrency(trip.perDay, locale, { compact: true })}
          />
          <Stat
            label={t("travel.explorer.transactions")}
            value={formatNumber(trip.transactions.length, locale, { digits: 0 })}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("travel.explorer.byCategory")}
            </p>
            <ul className="flex flex-col gap-2">
              {trip.categories.map((c) => (
                <li key={c.accountId} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span>{c.accountName}</span>
                    <span className="tabular-nums">
                      {formatCurrency(c.value, locale, { compact: true })}
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatNumber((c.value / (top.value ? trip.total : 1)) * 100, locale, {
                          digits: 0,
                        })}
                        %
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded bg-secondary mt-1">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${(c.value / top.value) * 100}%`,
                        backgroundColor: getColor(c.accountName),
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-auto max-h-96">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("travel.explorer.transactionsHeading")}
            </p>
            <table className="w-full text-sm">
              <tbody>
                {trip.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/60 last:border-b-0 align-top">
                    <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">
                      {fmtDate(DateTime.fromISO(tx.date))}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span>{tx.description}</span>
                      <span className="block text-xs text-muted-foreground">
                        {tx.categories.join(", ")}
                      </span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums whitespace-nowrap">
                      {formatCurrency(tx.value, locale, { digits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const TripExplorer = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const dbconf = getConfig(user);

  const { data: splits } = useQuery(tripSplitsOptions({ db, user, bookId }));
  const trips = useMemo(() => buildTrips(splits ?? [], dbconf.tripDesc), [splits, dbconf.tripDesc]);

  const domain = useMemo(() => {
    if (trips.length === 0) return undefined;
    return {
      from: trips.reduce((m, tr) => (tr.start < m ? tr.start : m), trips[0].start),
      to: trips.reduce((m, tr) => (tr.end > m ? tr.end : m), trips[0].end),
    };
  }, [trips]);

  const [range, setRange] = useState<DateRange | null>(null);
  const [sort, setSort] = useState<SortKey>("date");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const activeRange = range ?? domain;
  const visible = useMemo(() => {
    if (!activeRange) return [];
    // Presets end at the last trip day, so compare on whole days.
    const from = activeRange.from.startOf("day");
    const to = activeRange.to.endOf("day");
    return trips
      .filter((tr) => tr.end >= from && tr.start <= to)
      .sort((a, b) =>
        sort === "date"
          ? b.start.toMillis() - a.start.toMillis()
          : sort === "total"
            ? b.total - a.total
            : b.perDay - a.perDay,
      );
  }, [trips, activeRange, sort]);

  const fmtDate = useCallback(
    (d: DateTime) => d.setLocale(locale).toLocaleString(DateTime.DATE_MED),
    [locale],
  );

  const selected = visible.find((tr) => tr.key === selectedKey) ?? null;
  const totalShown = visible.reduce((s, tr) => s + tr.total, 0);

  if (!domain || !activeRange) return null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-row flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex flex-row flex-wrap items-center gap-2">
            {SORTS.map((s) => (
              <SortChip key={s} sort={s} active={sort === s} onSelect={setSort} />
            ))}
          </div>
          <DateRangePresets
            domainFrom={domain.from}
            domainTo={domain.to}
            dateRange={activeRange}
            onChange={setRange}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("travel.explorer.title")}
            <span className="ml-3 text-xs font-normal text-muted-foreground">
              {t("travel.explorer.summary", {
                count: visible.length,
                total: formatCurrency(totalShown, locale, { compact: true }),
              })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("travel.explorer.empty")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">{t("travel.explorer.trip")}</th>
                  <th className="py-2 pr-4 font-medium">{t("travel.explorer.start")}</th>
                  <th className="py-2 pr-4 font-medium text-right">{t("travel.explorer.days")}</th>
                  <th className="py-2 pr-4 font-medium text-right">
                    {t("travel.explorer.perDay")}
                  </th>
                  <th className="py-2 font-medium text-right">{t("travel.explorer.total")}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((tr) => (
                  <TripRow
                    key={tr.key}
                    trip={tr}
                    selected={tr.key === selected?.key}
                    onSelect={setSelectedKey}
                    fmtDate={fmtDate}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {selected && <TripDetail trip={selected} fmtDate={fmtDate} />}
    </div>
  );
};
