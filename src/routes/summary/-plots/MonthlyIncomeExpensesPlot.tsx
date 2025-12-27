import * as d3 from "d3";
import { DateTime } from "luxon";
import { RefObject, useMemo, useRef } from "react";
import { BarLoader } from '@/components/ui/BarLoader'

import { parseNum, twStyles, useWindowSize } from "@/common/utils.ts";
import { XAxis } from "@/components/XAxis";
import { YAxis } from "@/components/YAxis";
import { useAuth } from "@/contexts/useAuthContext";
import { transactsSumOptions } from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { Tooltip } from "@/routes/summary/-plots/Tooltip.tsx";
import { chooseTooltipPointLine } from "@/routes/summary/-plots/tooltipFuncs.tsx";
import { useQuery } from "@tanstack/react-query";
import { useSummaryPageContext } from "../-summaryPageContext";

type colorType = "g" | "r";
export interface InputData {
  date: string;
  dateLabel: string;
  value: number;
}
export interface PlotData {
  date: string;
  dateLabel: string;
  expenses: number;
  income: number;
  net: number;
}

const colorCodes: Record<colorType, string> = {
  g: twStyles.getPropertyValue("--color-emerald-500"),
  r: twStyles.getPropertyValue("--color-red-500"),
};

const margin = { t: 20, r: 20, b: 20, l: 50 };
const getColor = (d: colorType) => colorCodes[d];
const xf = (d: PlotData) => DateTime.fromISO(d.date);
const yf = (d: PlotData) => Math.max(d.income, d.expenses, d.net);

const DrawMonthlyIncomeExpensesPlot = ({
  data,
  domain,
}: {
  data: PlotData[];
  domain: { startDate: DateTime; endDate: DateTime };
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, height] = useWindowSize(svgRef);
  const range = useMemo(() => {
    return {
      x: [margin.l, width - margin.r],
      y: [height - margin.b, margin.t],
    };
  }, [width, height]);

  const xDomain = [domain.startDate.minus({ month: 1 }), domain.endDate];
  const yDomain = [0, Math.max(...data.map(yf))];
  const xScale = d3.scaleUtc(xDomain, range.x);
  const yScale = d3.scaleLinear(yDomain as [number, number], range.y);
  const lineIncome = d3
    .line<PlotData>()
    .curve(d3.curveLinear)
    .x((d) => xScale(xf(d)))
    .y((d) => yScale(d.income));
  const lineExpenses = d3
    .line<PlotData>()
    .curve(d3.curveLinear)
    .x((d) => xScale(xf(d)))
    .y((d) => yScale(d.expenses));
  const rectWidth = (width / data.length) * 0.7;

  const choosePoint = chooseTooltipPointLine(data, xf, yf, xScale, yScale);
  const updateTooltip = (
    ref: RefObject<HTMLDivElement | null>,
    d: PlotData
  ) => {
    if (ref.current !== null) {
      const tooltip = d3.select(ref.current);
      tooltip.select("#title").text(d.dateLabel);
      tooltip.select("#income").text(parseNum(d.income));
      tooltip.select("#expenses").text(parseNum(d.expenses));
      tooltip.select("#net").style("color", getColor(d.net > 0 ? "g" : "r"));
      tooltip.select("#net").text(parseNum(d.net));
    }
  };

  return (
    <div className="relative w-full h-full">
      <svg className="w-full h-full" ref={svgRef}>
        <XAxis width={width} range={range} xScale={xScale} />
        <YAxis height={height} range={range} scale={yScale} />
        <g className="rect">
          {data.map((d) => (
            <rect
              fill={getColor(d.net > 0 ? "g" : "r")}
              fillOpacity={0.4}
              key={"rect" + d.date}
              strokeWidth="1.5"
              shapeRendering="geometricPrecision"
              stroke={getColor(d.net > 0 ? "g" : "r")}
              x={xScale(xf(d)) - rectWidth / 2}
              y={yScale(Math.abs(d.net))}
              height={range.y[0] - yScale(Math.abs(d.net))}
              width={rectWidth}
            />
          ))}
        </g>
        <g className="lineExpenses">
          <path
            fill="none"
            stroke={getColor("r")}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="1"
            shapeRendering="geometricPrecision"
            d={lineExpenses(data) ?? ""}
          />
        </g>
        <g className="lineIncome">
          <path
            fill="none"
            stroke={getColor("g")}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="1"
            shapeRendering="geometricPrecision"
            d={lineIncome(data) ?? ""}
          />
        </g>
      </svg>
      <Tooltip
        svgRef={svgRef}
        choosePoint={choosePoint}
        updateTooltip={updateTooltip}
      >
        <div className="flex flex-col items-center px-6 py-2">
          <span className="text-shark-300" id="title">
            Title
          </span>
          <div className="text-shark-400">
            Income:{" "}
            <span id="income" className="text-emerald-500">
              Income
            </span>
          </div>
          <div className="text-shark-400">
            Expenses:{" "}
            <span id="expenses" className="text-red-500">
              Expenses
            </span>
          </div>
          <div className="text-shark-400">
            Net: <span id="net">net</span>
          </div>
        </div>
      </Tooltip>
    </div>
  );
};

export const MonthlyIncomeExpensesPlot = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const {
    dateRange,
    hideAccounts,
    chartPeriodicity: charMode,
  } = useSummaryPageContext();
  const dbconf = getConfig(user);

  const { data: expenses } = useQuery(
    transactsSumOptions({
      db,
      bookId,
      accountIds: [dbconf.expenses],
      periodicity: charMode,
      hideAccounts,
    })
  );
  const { data: income } = useQuery(
    transactsSumOptions({
      db,
      bookId,
      accountIds: [dbconf.income, dbconf.taxes],
      periodicity: charMode,
      hideAccounts,
    })
  );
  const { data: net } = useQuery(
    transactsSumOptions({
      db,
      bookId,
      accountIds: [dbconf.expenses, dbconf.income, dbconf.taxes],
      periodicity: charMode,
      hideAccounts,
    })
  );

  const data = useMemo(() => {
    if (net && income && expenses) {
      const registry = new Map<string, PlotData>();

      /**
       * Internal helper to ensure we always work with a
       * fully initialized PlotData object.
       */
      const getEntry = (date: string, dateLabel: string): PlotData => {
        let entry = registry.get(date);
        if (!entry) {
          entry = { date, dateLabel, net: 0, income: 0, expenses: 0 };
          registry.set(date, entry);
        }
        return entry;
      };

      // Populate the Map
      net.forEach((d) => (getEntry(d.date, d.dateLabel).net = -d.value));
      income.forEach(
        (d) => (getEntry(d.date, d.dateLabel).income = Math.abs(d.value))
      );
      expenses.forEach(
        (d) => (getEntry(d.date, d.dateLabel).expenses = Math.abs(d.value))
      );

      // Convert to array and sort by date chronologically
      return Array.from(registry.values())
        .filter((d) => d.date >= dateRange.from.toString())
        .filter((d) => d.date <= dateRange.to.toString())
        .sort((a, b) => {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          return timeA - timeB;
        })
    }
  }, [net, income, expenses, dateRange]);

  if (!data || !dateRange)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader color="#36d7b7" />
      </div>
    );

  return (
    <DrawMonthlyIncomeExpensesPlot
      data={data}
      domain={{ startDate: dateRange.from, endDate: dateRange.to }}
    />
  );
};
