import { DateTime } from "luxon";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import { BarLoader } from "@/components/ui/BarLoader";

import { parseNum, useIsNarrowViewport } from "@/common/utils.ts";
import { useAuth } from "@/contexts/useAuthContext";
import { travelExpensesDetailedYearMonthOptions } from "@/db/queries/travel";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useQuery } from "@tanstack/react-query";
import { getColor } from "./utils";

interface Data {
  name: string;
  date: string;
  value: number;
}
interface ChartRow {
  date: string;
  dateLabel: string;
  [name: string]: string | number;
}

const marginDesktop = { top: 20, right: 20, bottom: 0, left: 44 };
const marginMobile = { top: 10, right: 10, bottom: 0, left: 32 };
const xf = (d: Data) => DateTime.fromISO(d.date);
const gf = (d: Data) => d.name;

const ChartTooltipContent = ({ active, payload, label }: TooltipContentProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center">
      <span className="text-muted-foreground text-xs">{label}</span>
      {payload.map((entry) => (
        <span key={entry.dataKey} style={{ color: entry.color }}>
          {entry.dataKey}: {parseNum(entry.value as number)}
        </span>
      ))}
    </div>
  );
};

const DrawTravelExpensesPlot = (props: { data: Data[] }) => {
  const isNarrowViewport = useIsNarrowViewport();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;

  const names = useMemo(() => Array.from(new Set(props.data.map(gf))), [props.data]);

  const chartData: ChartRow[] = useMemo(() => {
    const byDate = new Map<string, ChartRow>();
    for (const d of props.data) {
      const row = byDate.get(d.date) ?? {
        date: d.date,
        dateLabel: xf(d).toFormat("LLL yy"),
      };
      row[d.name] = d.value;
      byDate.set(d.date, row);
    }
    return Array.from(byDate.values()).sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [props.data]);

  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={margin}>
          <CartesianGrid strokeOpacity={0.1} vertical={false} />
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
          <RechartsTooltip
            content={(p: TooltipContentProps<number, string>) => <ChartTooltipContent {...p} />}
          />
          {names.map((name) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="travel"
              fill={getColor(name)}
              fillOpacity={0.4}
              stroke={getColor(name)}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TravelExpensesDetailedPlot = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { from, to } = useDomain();

  const { data, isSuccess } = useQuery(
    travelExpensesDetailedYearMonthOptions({ db, user, bookId }),
  );

  if (!isSuccess || from == null || to == null)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader />
      </div>
    );

  return <DrawTravelExpensesPlot data={data} />;
};
