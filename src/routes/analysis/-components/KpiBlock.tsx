import { groupBy, sum } from "@/common/aggregate";
import { formatCurrency } from "@/common/utils.ts";
import { KpiCard } from "@/components/KpiCard.tsx";
import { useDomain } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { useTranslation } from "react-i18next";
import { FullTransaction } from "..";

export const KpiBlock = (props: { data: FullTransaction[] }) => {
  const { numMonths, latestMonth } = useDomain();
  const { locale } = useLocale();
  const { t } = useTranslation();

  if (!latestMonth) return <></>;

  const xf = (d: FullTransaction) => d.datePosted;
  const groupedData = Array.from(groupBy(props.data, (d) => xf(d).toFormat("yyyy-LL"))).map(
    ([, data]) => ({
      date: xf(data[0]),
      value: sum(data, (d) => d.value),
    }),
  );
  const sortedData = [...groupedData].sort((a, b) => (a.date > b.date ? 1 : -1));

  const total_value_all_time = props.data.reduce((v, d) => v + d.value, 0);
  const meanAllTime = props.data.reduce((v, d) => v + d.value, 0) / (numMonths ?? 1);
  const meanLastMonth = sortedData
    .filter((d) => d.date === latestMonth)
    .reduce((v, d) => v + d.value, 0);
  const meanLast3Months =
    sortedData
      .filter((d) => d.date < latestMonth && d.date >= latestMonth.minus({ month: 3 }))
      .reduce((v, d) => v + d.value, 0) / 3;
  const meanLast6Months =
    sortedData
      .filter((d) => d.date < latestMonth && d.date >= latestMonth.minus({ month: 6 }))
      .reduce((v, d) => v + d.value, 0) / 6;
  const meanLastYear =
    sortedData
      .filter((d) => d.date < latestMonth && d.date >= latestMonth.minus({ month: 12 }))
      .reduce((v, d) => v + d.value, 0) / 12;

  return (
    <section
      className={"grid grid-cols-2 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2"}
    >
      <KpiCard
        name={t("analysis.kpi.mean")}
        value={formatCurrency(meanAllTime, locale, { compact: true })}
        title={formatCurrency(meanAllTime, locale, { compact: true })}
      />
      <KpiCard
        name={t("analysis.kpi.lastMonth")}
        value={formatCurrency(meanLastMonth, locale, { compact: true })}
        title={formatCurrency(meanLastMonth, locale, { compact: true })}
      />
      <KpiCard
        name={t("analysis.kpi.last3")}
        value={formatCurrency(meanLast3Months, locale, { compact: true })}
        title={formatCurrency(meanLast3Months, locale, { compact: true })}
      />
      <KpiCard
        name={t("analysis.kpi.last6")}
        value={formatCurrency(meanLast6Months, locale, { compact: true })}
        title={formatCurrency(meanLast6Months, locale, { compact: true })}
      />
      <KpiCard
        name={t("analysis.kpi.lastYear")}
        value={formatCurrency(meanLastYear, locale, { compact: true })}
        title={formatCurrency(meanLastYear, locale, { compact: true })}
      />
      <KpiCard
        name={t("analysis.kpi.total")}
        value={formatCurrency(total_value_all_time, locale, { compact: true })}
        title={formatCurrency(total_value_all_time, locale, { compact: true })}
      />
    </section>
  );
};
