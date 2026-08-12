import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";

import { groupBy, netTransactionValue, sum } from "@/common/aggregate";
import { formatCurrency, formatNumber } from "@/common/utils.ts";
import { KpiCard } from "@/components/KpiCard.tsx";
import { useDomain } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { FullTransaction } from "..";

// Mirrors summary's `-KpiBlock.tsx` DeltaChip: every metric here is a net-value sum (income
// positive, expense negative) in the same unit, so a higher value is always the "good"
// direction -- unlike summary's page there's no standalone pure-expense card that would need
// the direction flipped.
const DeltaChip = (props: { current: number; previous: number }) => {
  const { current, previous } = props;
  const { locale } = useLocale();
  const { t } = useTranslation();
  if (!previous) return null;

  const diff = current - previous;
  const pct = (diff / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.5) {
    return <span className="text-xs text-muted-foreground">{t("analysis.kpi.deltaFlat")}</span>;
  }

  const isUp = diff > 0;
  return (
    <span className={cn("text-xs font-medium", isUp ? "text-green-600" : "text-red-600")}>
      {isUp ? "▲" : "▼"} {formatNumber(Math.abs(pct), locale, { digits: 0 })}%{" "}
      {t("analysis.kpi.vsPreviousPeriod")}
    </span>
  );
};

export const KpiBlock = (props: { data: FullTransaction[] }) => {
  const { numMonths, latestMonth } = useDomain();
  const { locale } = useLocale();
  const { t } = useTranslation();

  if (!latestMonth) return <></>;

  const xf = (d: FullTransaction) => d.datePosted;
  const groupedData = Array.from(groupBy(props.data, (d) => xf(d).toFormat("yyyy-LL"))).map(
    ([, data]) => ({
      date: xf(data[0]),
      value: sum(data, netTransactionValue),
    }),
  );
  const sortedData = [...groupedData].sort((a, b) => (a.date > b.date ? 1 : -1));

  // Half-open [from, to) sum over the monthly buckets above.
  const sumInRange = (from: DateTime, to: DateTime) =>
    sortedData.filter((d) => d.date >= from && d.date < to).reduce((v, d) => v + d.value, 0);

  const total_value_all_time = props.data.reduce((v, d) => v + netTransactionValue(d), 0);
  const meanAllTime = total_value_all_time / (numMonths ?? 1);

  const meanLastMonth = sumInRange(latestMonth, latestMonth.plus({ month: 1 }));
  const prevMonth = sumInRange(latestMonth.minus({ month: 1 }), latestMonth);

  const meanLast3Months = sumInRange(latestMonth.minus({ month: 3 }), latestMonth) / 3;
  const prevLast3Months =
    sumInRange(latestMonth.minus({ month: 6 }), latestMonth.minus({ month: 3 })) / 3;

  const meanLast6Months = sumInRange(latestMonth.minus({ month: 6 }), latestMonth) / 6;
  const prevLast6Months =
    sumInRange(latestMonth.minus({ month: 12 }), latestMonth.minus({ month: 6 })) / 6;

  const meanLastYear = sumInRange(latestMonth.minus({ month: 12 }), latestMonth) / 12;
  const prevLastYear =
    sumInRange(latestMonth.minus({ month: 24 }), latestMonth.minus({ month: 12 })) / 12;

  return (
    <section
      className={"grid grid-cols-2 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2"}
    >
      <KpiCard
        name={t("analysis.kpi.mean")}
        value={formatCurrency(Math.abs(meanAllTime), locale, { compact: true })}
        title={formatCurrency(Math.abs(meanAllTime), locale, { compact: true })}
      />
      <KpiCard
        name={t("analysis.kpi.lastMonth")}
        value={formatCurrency(Math.abs(meanLastMonth), locale, { compact: true })}
        title={formatCurrency(Math.abs(meanLastMonth), locale, { compact: true })}
        delta={<DeltaChip current={meanLastMonth} previous={prevMonth} />}
      />
      <KpiCard
        name={t("analysis.kpi.last3")}
        value={formatCurrency(Math.abs(meanLast3Months), locale, { compact: true })}
        title={formatCurrency(Math.abs(meanLast3Months), locale, { compact: true })}
        delta={<DeltaChip current={meanLast3Months} previous={prevLast3Months} />}
      />
      <KpiCard
        name={t("analysis.kpi.last6")}
        value={formatCurrency(Math.abs(meanLast6Months), locale, { compact: true })}
        title={formatCurrency(Math.abs(meanLast6Months), locale, { compact: true })}
        delta={<DeltaChip current={meanLast6Months} previous={prevLast6Months} />}
      />
      <KpiCard
        name={t("analysis.kpi.lastYear")}
        value={formatCurrency(Math.abs(meanLastYear), locale, { compact: true })}
        title={formatCurrency(Math.abs(meanLastYear), locale, { compact: true })}
        delta={<DeltaChip current={meanLastYear} previous={prevLastYear} />}
      />
      <KpiCard
        name={t("analysis.kpi.total")}
        value={formatCurrency(Math.abs(total_value_all_time), locale, { compact: true })}
        title={formatCurrency(Math.abs(total_value_all_time), locale, { compact: true })}
      />
    </section>
  );
};
