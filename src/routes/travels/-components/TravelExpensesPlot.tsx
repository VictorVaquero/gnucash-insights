import { BarLoader } from "@/components/ui/BarLoader";
import { DateTime } from "luxon";
import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  Tooltip as RechartsTooltip,
  TooltipContentProps,
  usePlotArea,
  XAxis,
  YAxis,
} from "recharts";

import { parseNum, useIsNarrowViewport } from "@/common/utils.ts";
import { ChartKeyValue } from "@/components/charts/ChartKeyValue";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useAuth } from "@/contexts/useAuthContext";
import { travelExpensesDetailedOptions } from "@/db/queries/travel";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useQuery } from "@tanstack/react-query";
import { getColor } from "./utils";

interface Data {
  name: string;
  ini: string;
  fin: string;
  value: number;
}
interface ChartRow extends Data {
  finLabel: string;
  finMillis: number;
}

const marginDesktop = { top: 20, right: 20, bottom: 0, left: 44 };
const marginMobile = { top: 10, right: 10, bottom: 0, left: 32 };
const xf = (d: Data) => DateTime.fromISO(d.fin);

// Minimum touch hit-area per chart-component-contract (44x44px), independent of the
// visible bar's drawn width.
const MIN_HIT_SIZE = 44;

const ChartTooltipContent = ({ payload }: Pick<TooltipContentProps<number, string>, "payload">) => {
  const d = payload[0].payload as ChartRow;
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center">
      <span style={{ color: getColor(d.name) }}>{d.name}</span>
      <span className="text-muted-foreground text-xs">
        {d.ini} | {d.fin}
      </span>
      <span className="text-red-500">{parseNum(d.value)}</span>
    </div>
  );
};

/**
 * Draws each travel as a rect positioned by its actual end-date on a continuous time
 * axis (via `Scatter` + the plot area's pixel geometry) instead of Recharts' categorical
 * `Bar` layout, so travels close together in time visually overlap under transparency --
 * reproducing the original D3 chart's effect, which a categorical Bar can't.
 */
const OverlappingBars = ({ data }: { data: ChartRow[] }) => {
  const plotArea = usePlotArea();
  const rectWidth = plotArea ? Math.max((plotArea.width / data.length) * 1.4, 6) : 8;

  return (
    <Scatter
      data={data}
      dataKey="value"
      isAnimationActive={false}
      shape={(props: { cx?: number; cy?: number; payload?: ChartRow }) => {
        const { cx, cy, payload } = props;
        if (cx == null || cy == null || !payload || !plotArea) return <g />;
        const color = getColor(payload.name);
        const baselineY = plotArea.y + plotArea.height;
        const height = Math.max(baselineY - cy, 0);
        const hitWidth = Math.max(rectWidth, MIN_HIT_SIZE);
        const hitHeight = Math.max(height, MIN_HIT_SIZE);
        const hitY = Math.min(cy, baselineY - hitHeight);
        return (
          <g>
            <rect
              x={cx - hitWidth / 2}
              y={hitY}
              width={hitWidth}
              height={baselineY - hitY}
              fill="transparent"
            />
            <rect
              x={cx - rectWidth / 2}
              y={cy}
              width={rectWidth}
              height={height}
              fill={color}
              fillOpacity={0.4}
              stroke={color}
              strokeWidth={1.5}
            />
          </g>
        );
      }}
    />
  );
};

const DrawTravelExpensesPlot = (props: {
  data: Data[];
  domain: { startDate: DateTime; endDate: DateTime };
}) => {
  const isNarrowViewport = useIsNarrowViewport();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;

  const chartData: ChartRow[] = useMemo(
    () =>
      [...props.data]
        .sort((a, b) => (xf(a) > xf(b) ? 1 : -1))
        .map((d) => ({ ...d, finLabel: xf(d).toFormat("LLL yy"), finMillis: xf(d).toMillis() })),
    [props.data],
  );

  const xDomain = useMemo((): [number, number] => {
    const start = props.domain.startDate.minus({ month: 4 });
    return [start.toMillis(), props.domain.endDate.toMillis()];
  }, [props.domain]);

  const xTicks = useMemo(() => {
    const start = DateTime.fromMillis(xDomain[0]).startOf("month");
    const end = DateTime.fromMillis(xDomain[1]);
    const totalMonths = Math.max(1, Math.round(end.diff(start, "months").months));
    const step = Math.max(1, Math.ceil(totalMonths / (isNarrowViewport ? 4 : 8)));
    const ticks: number[] = [];
    for (let cursor = start; cursor <= end; cursor = cursor.plus({ months: step })) {
      ticks.push(cursor.toMillis());
    }
    return ticks;
  }, [xDomain, isNarrowViewport]);

  const yMax = Math.max(...chartData.map((d) => d.value), 0);
  const latest = chartData[chartData.length - 1];

  return (
    <div className="relative w-full h-64 md:h-full">
      {latest && (
        <ChartKeyValue
          label={latest.name}
          value={<span style={{ color: getColor(latest.name) }}>{parseNum(latest.value)}</span>}
        />
      )}
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={margin}>
          <CartesianGrid strokeOpacity={0.1} vertical={false} />
          <XAxis
            type="number"
            dataKey="finMillis"
            domain={xDomain}
            ticks={xTicks}
            tickFormatter={(ms: number) => DateTime.fromMillis(ms).toFormat("LLL yy")}
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-gray-500"
            tickLine={false}
          />
          <YAxis
            domain={[0, yMax]}
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-gray-500"
            tickLine={false}
            tickFormatter={(value: number) => parseNum(value)}
            width={margin.left}
          />
          <RechartsTooltip
            content={(tprops: TooltipContentProps<number, string>) => (
              <ChartTooltip {...tprops}>
                {({ payload }) => <ChartTooltipContent payload={payload} />}
              </ChartTooltip>
            )}
          />
          <OverlappingBars data={chartData} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TravelExpensesPlot = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { from, to } = useDomain();

  const { data, isSuccess } = useQuery(travelExpensesDetailedOptions({ db, user, bookId }));

  if (!isSuccess || from == null || to == null)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader />
      </div>
    );

  return <DrawTravelExpensesPlot data={data as Data[]} domain={{ startDate: from, endDate: to }} />;
};
