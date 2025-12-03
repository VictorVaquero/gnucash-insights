import * as d3 from "d3";
import { DateTime } from "luxon";
import { MutableRefObject, useMemo, useRef } from "react";
import { BarLoader } from "react-spinners";

import { parseNum, twStyles, useWindowSize } from "@/common/utils.ts";
import { XAxis } from "@/components/XAxis";
import { YAxis } from "@/components/YAxis";
import { useAuth } from "@/contexts/useAuthContext";
import {
  incomeExpensesYearMonthOptions,
  profitLossYearMonthOptions,
  taxesYearMonthOptions,
} from "@/db/queries/summary";
import { useBook, useDB } from "@/hooks/useDB";
import { Tooltip } from "@/routes/summary/-plots/Tooltip.tsx";
import { chooseTooltipPointLine } from "@/routes/summary/-plots/tooltipFuncs.tsx";
import { useQuery } from "@tanstack/react-query";
import { useSummaryPageContext } from "../-summaryPageContext";

type colorType = "g" | "r";
export interface Data {
  name: string;
  type: colorType;
  yearmonth: string;
  value: number;
}
export interface Mixin extends Data {
  expenses: number;
  income: number;
  net: number;
}

const colorCodes: Record<colorType, string> = {
  g: twStyles.getPropertyValue("--color-emerald-500"),
  r: twStyles.getPropertyValue("--color-red-500"),
};

//type MergeObjectTypes<T extends object[]> = T extends [infer F, ...infer R extends object[]] ? F & MergeObjectTypes<R> : unknown;
function joinArraysByKeys<
  T extends Record<string | symbol, unknown>[],
  K extends keyof T
>(arrs: T[], commonKeys: K[]): object[] {
  return arrs[0].map((itemA) => {
    return arrs.reduce((acum, arr) => {
      const matchingItem = arr.find((item) =>
        commonKeys.every((key) => {
          return acum[key as never] === item[key as keyof typeof item];
        })
      );
      if (!matchingItem) {
        console.debug("No matching data");
        return acum;
      }
      return { ...acum, ...matchingItem };
    }, itemA);
  });
}

const margin = { t: 20, r: 20, b: 20, l: 50 };
const getColor = (d: colorType) => colorCodes[d];
const xf = (d: Data) => DateTime.fromISO(d.yearmonth);
const yf = (d: Data) => d.value;
const orderxf = (a: Data, b: Data) => (xf(a) > xf(b) ? 1 : -1);
const orderyf = (a: Data, b: Data) => (yf(a) > yf(b) ? 1 : -1);

const DrawMonthlyIncomeExpensesPlot = (props: {
  data: Data[];
  profit: Data[];
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

  const sortedData = [...props.data]
    .sort(orderyf)
    .sort(orderxf)
    .filter((d) => d.yearmonth >= props.domain.startDate.toString())
    .filter((d) => d.yearmonth <= props.domain.endDate.toString());
  const sortedProfit = [...props.profit]
    .sort(orderyf)
    .sort(orderxf)
    .filter((d) => d.yearmonth >= props.domain.startDate.toString())
    .filter((d) => d.yearmonth <= props.domain.endDate.toString());

  const mixin = [
    sortedData
      .filter((d) => d.type === "r")
      .map((d) => ({ ...d, expenses: d.value })),
    sortedProfit.map((d) => ({ ...d, net: d.value })),
    sortedData
      .filter((d) => d.type === "g")
      .map((d) => ({ ...d, income: d.value })),
  ];
  const joined = joinArraysByKeys(mixin, ["yearmonth" as never]);

  const xDomain = [
    props.domain.startDate.minus({ month: 1 }),
    props.domain.endDate,
  ];
  const yDomain = [0, Math.max(...sortedData.map(yf))];
  const xScale = d3.scaleUtc(xDomain, range.x);
  const yScale = d3.scaleLinear(yDomain as [number, number], range.y);
  const line = d3
    .line<Data>()
    .curve(d3.curveLinear)
    .x((d) => xScale(xf(d)))
    .y((d) => yScale(yf(d)));
  const rectWidth = (width / sortedProfit.length) * 0.7;

  const choosePoint = chooseTooltipPointLine(
    joined as unknown as Mixin[],
    xf,
    yf,
    xScale,
    yScale
  );
  const updateTooltip = (
    ref: MutableRefObject<HTMLDivElement | null>,
    d: Mixin
  ) => {
    if (ref.current !== null) {
      const tooltip = d3.select(ref.current);
      tooltip.select("#title").text(d.yearmonth);
      tooltip.select("#income").text(parseNum(d.income));
      tooltip.select("#expenses").text(parseNum(d.expenses));
      tooltip.select("#net").style("color", getColor(d.type));
      tooltip.select("#net").text(parseNum(d.net));
    }
  };

  const uniqueAccounts: colorType[] = ["r", "g"];

  return (
    <div className="relative w-full h-full">
      <svg className="w-full h-full" ref={svgRef}>
        <XAxis width={width} range={range} xScale={xScale} />
        <YAxis height={height} range={range} scale={yScale} />
        <g className="rect">
          {sortedProfit.map((d) => (
            <rect
              fill={getColor(d.type)}
              fillOpacity={0.4}
              key={d.name + d.yearmonth}
              strokeWidth="1.5"
              shapeRendering="geometricPrecision"
              stroke={getColor(d.type)}
              x={xScale(xf(d)) - rectWidth / 2}
              y={yScale(yf(d))}
              height={range.y[0] - yScale(yf(d))}
              width={rectWidth}
            />
          ))}
        </g>
        <g className="lines">
          {uniqueAccounts.map((s) => (
            <path
              fill="none"
              stroke={getColor(s)}
              key={s}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="1"
              shapeRendering="geometricPrecision"
              d={line(sortedData.filter((d) => d.type === s)) ?? ""}
            />
          ))}
        </g>
        <g className="circles">
          {sortedData.map((d) => (
            <circle
              fill={getColor(d.type)}
              key={d.name + d.yearmonth}
              strokeWidth="1.5"
              shapeRendering="geometricPrecision"
              stroke="white"
              r="5"
              cx={xScale(new Date(d.yearmonth))}
              cy={yScale(d.value)}
            />
          ))}
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
          <div className="text-shark-500">
            Income:{" "}
            <span id="income" className="text-emerald-500">
              Income
            </span>
          </div>
          <div className="text-shark-500">
            Expenses:{" "}
            <span id="expenses" className="text-red-500">
              Expenses
            </span>
          </div>
          <div className="text-shark-500">
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
  const { dateRange } = useSummaryPageContext();

  const { data: dataFull, isSuccess } = useQuery(
    incomeExpensesYearMonthOptions({ db, user, bookId })
  );
  const { data: taxes, isSuccess: isSuccessTaxes } = useQuery(
    taxesYearMonthOptions({ db, user, bookId })
  );
  const { data: profit, isSuccess: isSuccessProfit } = useQuery(
    profitLossYearMonthOptions({ db, user, bookId })
  );
  const data = useMemo(() => {
    if (isSuccess && isSuccessTaxes)
      return dataFull.map((d) => ({
        ...d,
        value:
          d.value -
          (d.type == "r" ? 1 : 1) *
            (taxes.find((t) => t.yearmonth === d.yearmonth)?.value || 0),
      }));
  }, [dataFull, taxes, isSuccess, isSuccessTaxes]);

  if (!data || !isSuccessProfit || !dateRange)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader color="#36d7b7" />
      </div>
    );

  return (
    <DrawMonthlyIncomeExpensesPlot
      data={data as Data[]}
      profit={profit as Data[]}
      domain={{ startDate: dateRange.from, endDate: dateRange.to }}
    />
  );
};
