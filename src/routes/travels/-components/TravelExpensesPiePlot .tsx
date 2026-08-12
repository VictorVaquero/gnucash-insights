import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipContentProps,
} from "recharts";
import { BarLoader } from "@/components/ui/BarLoader";

import { sum } from "@/common/aggregate";
import { getDefaultColor, getRandomColor } from "@/common/getColors";
import { formatCurrency, formatNumber } from "@/common/utils.ts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useAuth } from "@/contexts/useAuthContext";
import { travelExpensesByAccountOptions } from "@/db/queries/travel";
import { useBook, useDB } from "@/hooks/useDB";
import { useChartScrubber } from "@/hooks/useChartScrubber";
import { useLocale } from "@/hooks/useLocale";

interface Data {
  key: string;
  name: string;
  value: number;
  [key: string]: unknown;
}

const yf = (d: Data) => d.value;
const gf = (d: Data) => d.key;
const namef = (d: Data) => d.name;
const color_f = (d: Data, defaultAccount: string) =>
  namef(d) !== defaultAccount ? getRandomColor(namef(d)) : getDefaultColor();
const orderyf = (a: Data, b: Data) => (yf(a) > yf(b) ? 1 : -1);

// `color_f` returns a stable string per account, so a small cache keeps the resulting
// style object referentially stable across renders for the same color.
const colorStyleCache = new Map<string, { color: string }>();
const colorStyle = (color: string) => {
  let style = colorStyleCache.get(color);
  if (!style) {
    style = { color };
    colorStyleCache.set(color, style);
  }
  return style;
};

const ChartTooltipContent = ({
  payload,
  sumTotal,
  defaultAccount,
}: Pick<TooltipContentProps<number, string>, "payload"> & {
  sumTotal: number;
  defaultAccount: string;
}) => {
  const d = payload[0].payload as Data;
  const { locale } = useLocale();
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center">
      <span className="text-muted-foreground text-xs">{namef(d)}</span>
      <span style={colorStyle(color_f(d, defaultAccount))}>
        {formatCurrency(yf(d), locale, { compact: true })}
      </span>
      <span className="text-muted-foreground text-xs">
        {formatNumber((yf(d) / sumTotal) * 100, locale, { digits: 0 })}%
      </span>
    </div>
  );
};

interface PieTooltipContentProps extends TooltipContentProps<number, string> {
  sumTotal: number;
  defaultAccount: string;
}

const PieTooltipContent = ({ sumTotal, defaultAccount, ...p }: PieTooltipContentProps) => (
  <ChartTooltip {...p}>
    {({ payload }) => (
      <ChartTooltipContent payload={payload} sumTotal={sumTotal} defaultAccount={defaultAccount} />
    )}
  </ChartTooltip>
);

const DrawTravelExpensesPiePlot = (props: { data: Data[] }) => {
  const { locale } = useLocale();
  const { t } = useTranslation();
  const defaultAccount = t("summary.plots.others");
  const sortedData = useMemo(() => [...props.data].sort(orderyf), [props.data]);
  const sumTotal = useMemo(() => sum(sortedData, yf), [sortedData]);

  // Same scrubber-adjacent deviation as MonthDetailedExpensesPiePlot: a horizontal drag
  // cycles through wedges by draw-order index rather than tracking a literal x position,
  // since a pie has no linear axis (see chart-component-contract.md's non-goal on
  // pixel-identical behavior).
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeIndex } = useChartScrubber(containerRef, { length: sortedData.length });
  const scrubbed = activeIndex != null ? sortedData[activeIndex] : undefined;

  const renderTooltipContent = useCallback(
    (p: TooltipContentProps<number, string>) => (
      <PieTooltipContent {...p} sumTotal={sumTotal} defaultAccount={defaultAccount} />
    ),
    [sumTotal, defaultAccount],
  );

  return (
    <div ref={containerRef} className="relative w-full h-64 md:h-full touch-none">
      <div className="absolute left-0 top-0 w-full h-full flex flex-col justify-center items-center pointer-events-none">
        {scrubbed ? (
          <>
            <p className="text-muted-foreground text-sm">{namef(scrubbed)}</p>
            <p style={colorStyle(color_f(scrubbed, defaultAccount))}>
              {formatCurrency(yf(scrubbed), locale, { compact: true })}
            </p>
          </>
        ) : (
          <p className="text-red-500">{formatCurrency(sumTotal, locale, { compact: true })}</p>
        )}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <RechartsTooltip content={renderTooltipContent} />
          <Pie
            data={sortedData}
            dataKey="value"
            nameKey="key"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="white"
            strokeWidth={1.5}
            isAnimationActive={false}
          >
            {sortedData.map((d, i) => (
              <Cell
                key={gf(d)}
                fill={color_f(d, defaultAccount)}
                stroke={i === activeIndex ? "var(--color-foreground)" : "white"}
                strokeWidth={i === activeIndex ? 3 : 1.5}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TravelExpensesPiePlot = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();

  const { data, isSuccess } = useQuery(travelExpensesByAccountOptions({ db, user, bookId }));

  if (!isSuccess)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        {" "}
        <BarLoader />{" "}
      </div>
    );

  return <DrawTravelExpensesPiePlot data={data} />;
};
