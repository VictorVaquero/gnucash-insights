import { DateTime } from "luxon";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { categoryMonthly, type CategoryTrend, type ExpenseTx } from "@/common/analytics";
import { formatCurrency, intensityCellStyle } from "@/common/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/hooks/useLocale";

const MAX_ROWS = 10;

/**
 * Month × category grid for the last 12 months. Each row is shaded against its own range,
 * so a dark cell means "a lot for this category", which surfaces seasonality (December gifts,
 * summer travel, an annual insurance bill) that yearly totals hide.
 */
export const CategoryHeatmap = (props: {
  txs: ExpenseTx[];
  months: string[];
  trends: CategoryTrend[];
  className?: string;
}) => {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const { rows, monthLabels } = useMemo(() => {
    const byCat = categoryMonthly(props.txs);
    const top = props.trends.filter((r) => r.last12 > 0).slice(0, MAX_ROWS);
    return {
      rows: top.map((r) => {
        const byMonth = byCat.get(r.categoryId);
        const values = props.months.map((m) => Math.max(byMonth?.get(m) ?? 0, 0));
        return { id: r.categoryId, name: r.name, values, max: Math.max(...values, 0) };
      }),
      monthLabels: props.months.map((m) =>
        DateTime.fromISO(`${m}-01`).setLocale(locale).toFormat("LLL"),
      ),
    };
  }, [props.txs, props.months, props.trends, locale]);

  if (rows.length === 0) return null;

  return (
    <Card className={props.className}>
      <CardHeader>
        <CardTitle>{t("expenses.heatmap.title")}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <p className="mb-2 text-xs text-muted-foreground">{t("expenses.heatmap.subtitle")}</p>
        <table className="w-full min-w-[34rem] border-separate border-spacing-1 text-[11px]">
          <thead>
            <tr>
              <th className="w-28 text-left font-normal text-muted-foreground" />
              {monthLabels.map((label, i) => (
                <th key={props.months[i]} className="font-normal text-muted-foreground">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row" className="max-w-28 truncate pr-2 text-left text-xs font-medium">
                  {row.name}
                </th>
                {row.values.map((v, i) => (
                  <td
                    key={props.months[i]}
                    style={v > 0 ? intensityCellStyle(v, 0, row.max) : undefined}
                    className="h-7 rounded-sm bg-muted/40 text-center font-semibold tabular-nums"
                    title={`${row.name} · ${props.months[i]} · ${formatCurrency(v, locale, { digits: 0 })}`}
                  >
                    {v > 0 ? formatCurrency(v, locale, { digits: 0, compact: true }) : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};
