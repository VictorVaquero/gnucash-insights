import { BarLoader } from "@/components/ui/BarLoader";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useMemo, useRef } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import { parseNum, twStyles, useIsNarrowViewport } from "@/common/utils.ts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useAuth } from "@/contexts/useAuthContext";
import { travelExpensesYearMonthOptions, travelExpensesYearOptions } from "@/db/queries/travel";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useChartScrubber } from "@/hooks/useChartScrubber";

interface Data {
  date: string;
  value: number;
}
interface ChartRow extends Data {
  dateLabel: string;
}
interface YearBand {
  year: string;
  x1: string;
  x2: string;
  value: number;
}

const redColor = twStyles.getPropertyValue("--color-red-500");

const marginDesktop = { top: 20, right: 20, bottom: 0, left: 44 };
const marginMobile = { top: 10, right: 10, bottom: 0, left: 32 };
const getColor = () => redColor;
const xf = (d: Data) => DateTime.fromISO(d.date);

const ChartTooltipContent = ({ payload }: Pick<TooltipContentProps<number, string>, "payload">) => {
  const d = payload[0].payload as ChartRow;
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center">
      <span className="text-muted-foreground text-xs">{d.dateLabel}</span>
      <span className="text-red-500">{parseNum(d.value)}</span>
    </div>
  );
};

const DrawTravelExpensesMonthlyPlot = (props: { data: Data[]; dataYearly: Data[] }) => {
  const isNarrowViewport = useIsNarrowViewport();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;

  const chartData: ChartRow[] = useMemo(
    () =>
      [...props.data]
        .sort((a, b) => (xf(a) > xf(b) ? 1 : -1))
        .map((d) => ({ ...d, dateLabel: xf(d).toFormat("LLL yy") })),
    [props.data],
  );

  const yearBands: YearBand[] = useMemo(() => {
    const bands: YearBand[] = [];
    for (const y of props.dataYearly) {
      const year = xf(y).toFormat("yyyy");
      const monthsInYear = chartData.filter((d) => d.date.startsWith(year));
      if (monthsInYear.length === 0) continue;
      bands.push({
        year,
        x1: monthsInYear[0].dateLabel,
        x2: monthsInYear[monthsInYear.length - 1].dateLabel,
        value: y.value,
      });
    }
    return bands;
  }, [props.dataYearly, chartData]);

  const containerRef = useRef<HTMLDivElement>(null);
  const { activeIndex } = useChartScrubber(containerRef, {
    length: chartData.length,
    margin: { left: margin.left, right: margin.right },
  });
  const scrubbedPoint = activeIndex != null ? chartData[activeIndex] : undefined;

  return (
    <div ref={containerRef} className="relative w-full h-64 md:h-full touch-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={margin}>
          <CartesianGrid strokeOpacity={0.1} vertical={false} />
          {scrubbedPoint && (
            <ReferenceLine
              x={scrubbedPoint.dateLabel}
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              ifOverflow="extendDomain"
            />
          )}
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-gray-500"
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-gray-500"
            tickLine={false}
            tickFormatter={(value: number) => parseNum(value)}
            width={margin.left}
          />
          {yearBands.map((b) => (
            <ReferenceArea
              key={b.year}
              x1={b.x1}
              x2={b.x2}
              y1={0}
              y2={b.value}
              fill={getColor()}
              fillOpacity={0.2}
              stroke="none"
              ifOverflow="visible"
            />
          ))}
          <RechartsTooltip
            content={(tprops: TooltipContentProps<number, string>) => (
              <ChartTooltip {...tprops}>
                {({ payload }) => <ChartTooltipContent payload={payload} />}
              </ChartTooltip>
            )}
          />
          <Bar
            dataKey="value"
            fill={getColor()}
            fillOpacity={0.4}
            stroke={getColor()}
            strokeWidth={1.5}
            barSize={isNarrowViewport ? 8 : 14}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TravelExpensesMonthlyPlot = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { from, to } = useDomain();

  const { data, isSuccess } = useQuery(travelExpensesYearMonthOptions({ db, user, bookId }));
  const { data: dataYearly, isSuccess: isSuccessYearly } = useQuery(
    travelExpensesYearOptions({ db, user, bookId }),
  );

  if (!isSuccess || !isSuccessYearly || !from || !to)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader />
      </div>
    );

  return <DrawTravelExpensesMonthlyPlot data={data} dataYearly={dataYearly} />;
};
