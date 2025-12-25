import { useQuery } from "@tanstack/react-query";
import * as d3 from "d3";
import { DateTime } from "luxon";
import { RefObject, useMemo, useRef } from "react";
import { BarLoader } from "react-spinners";

import { getDefaultColor, getRandomColor } from "@/common/getColors";
import { parseNum, useWindowSize } from "@/common/utils.ts";
import { XAxis } from "@/components/XAxis";
import { YAxis } from "@/components/YAxis";
import { useAuth } from "@/contexts/useAuthContext";
import { transactByAccountOptions } from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { Tooltip } from "@/routes/summary/-plots/Tooltip.tsx";
import { chooseTooltipPointNode } from "@/routes/summary/-plots/tooltipFuncs.tsx";
import { useSummaryPageContext } from "../-summaryPageContext";

export interface Data {
  accountId: string;
  accountName: string;
  date: string;
  dateLabel: string;
  value: number;
}

export function collapseMinorAccounts(data: Data[], limit: number): Data[] {
  // 1. Calculate totals per account to find the "Heavy Hitters"
  const totalByAccount = d3.rollup(
    data,
    (v) => d3.sum(v, (d) => d.value),
    (d) => d.accountId
  );

  // 2. Identify Top Accounts
  const topAccounts = new Set(
    Array.from(totalByAccount.entries())
      .sort(([, sumA], [, sumB]) => sumB - sumA)
      .slice(0, limit)
      .map(([accountId]) => accountId)
  );

  // 3. Roll up data.
  // Note: We group by BOTH date and the "Calculated AccountId"
  const collapsed = d3.flatRollup(
    data,
    (v) => ({
      // Take metadata from the first entry in the group
      dateLabel: v[0].dateLabel,
      // If it's a top account, keep the name; otherwise, call it "Others"
      accountName: topAccounts.has(v[0].accountId)
        ? v[0].accountName
        : DEFAULT_ACCOUNT_NAME,
      value: d3.sum(v, (d) => d.value),
    }),
    (d) => d.date,
    (d) => (topAccounts.has(d.accountId) ? d.accountId : DEFAULT_ACCOUNT_NAME)
  );

  // 4. Map back to your Data structure
  // collapsed is an array of [key1, key2, rollupValue]
  return collapsed.map(([date, accountId, details]) => ({
    date,
    accountId,
    ...details,
  }));
}



const CHART_MARGIN = { top: 20, right: 20, bottom: 20, left: 50 };
const DEFAULT_ACCOUNT_NAME = "Others";

const xf = (d: Data) => DateTime.fromISO(d.date);
const yf = (d: Data) => d.value;
const idf = (d: Data) => d.accountId;

const getColor = (input: Data | string) => {
  const name = typeof input === "string" ? input : input.accountId;
  return name !== DEFAULT_ACCOUNT_NAME
    ? getRandomColor(name)
    : getDefaultColor();
};

const MonthlyExpensesChart = ({
  data,
  domain,
  setDate,
}: {
  data: Data[];
  domain: { startDate: DateTime; endDate: DateTime };
  setDate: (date: DateTime) => void;
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, height] = useWindowSize(svgRef);

  const range = {
    x: [CHART_MARGIN.left, width - CHART_MARGIN.right],
    y: [height - CHART_MARGIN.bottom, CHART_MARGIN.top],
  };

  // Set data as a stack to draw them each above each other
  const stackGenerator = d3
    .stack<[DateTime, d3.InternMap<string, Data>], string>()
    .keys(d3.union(data.map(idf)))
    .value(([, group], key) => group.get(key)?.value ?? 0)
    .order(d3.stackOrderDescending);
  const stackedData = stackGenerator(d3.index(data, xf, idf));

  const xDomain = [domain.startDate.minus({ month: 1 }), domain.endDate];
  const yMax = d3.max(stackedData.flatMap((s) => s.map((d) => d[1]))) ?? 0;
  const xScale = d3.scaleUtc(xDomain, range.x);
  const yScale = d3.scaleLinear([0, yMax], range.y);

  const pointsInSeries = stackedData[0]?.length ?? 1;
  const rectConstant = pointsInSeries > 20 ? 0.86 : pointsInSeries > 10 ? 0.8 : 0.7;
  const calculatedRectWidth = (width / pointsInSeries) * rectConstant;

  const getAccountAverage = (targetAccount: string) => {
    const accountData = data.filter((d) => d.accountId === targetAccount);
    const diff = domain.endDate.diff(domain.startDate, "months").months;

    const periodCount = Math.max(1, diff || 0);
    return d3.sum(accountData, yf) / periodCount;
  };
  const findPointById = (id: string): Data | undefined =>
    data.find((d) => idf(d) + xf(d).toISO() === id);

  const updateTooltip = (
    ref: RefObject<HTMLDivElement | null>,
    d: Data | undefined
  ) => {
    // Guard: if the tooltip container or the data point is missing, do nothing
    const containerNode = ref.current;
    if (!containerNode || !d) return;

    const container = d3.select(containerNode);
    const color = getColor(d);

    container.select("#title").text(d.accountName).style("color", color);
    container.select("#date").text(d.dateLabel);
    container.select("#value").text(parseNum(d.value)).style("color", color);
    container.select("#mean").text(parseNum(getAccountAverage(d.accountId)));
  };

  return (
    <div className="relative w-full h-full">
      <svg className="w-full h-full" ref={svgRef}>
        <XAxis width={width} range={range} xScale={xScale} />
        <YAxis height={height} range={range} scale={yScale} />
        <g className="bars cursor-pointer">
          {stackedData.map((layer) => (
            <g key={layer.key} fill={getColor(layer.key)}>
              {layer.map((d) => (
                <rect
                  key={`${layer.key}-${d.data[0].toISO()}`}
                  id={layer.key + d.data[0].toISO()}
                  x={xScale(d.data[0]) - calculatedRectWidth / 2}
                  y={yScale(d[1])}
                  height={Math.max(0, yScale(d[0]) - yScale(d[1]))}
                  width={calculatedRectWidth}
                  stroke="white"
                  strokeWidth="1"
                  shapeRendering="geometricPrecision"
                />
              ))}
            </g>
          ))}
        </g>
      </svg>

      <Tooltip
        svgRef={svgRef}
        choosePoint={chooseTooltipPointNode<Data | undefined>(
          findPointById,
          "rect"
        )}
        updateTooltip={updateTooltip}
        onClick={(d) => {
          if (d) {
            setDate(DateTime.fromISO(d.date));
          }
        }}
      >
        <div className="flex flex-col items-center px-6 py-2">
          <span id="title" className="text-shark-300">
            Title
          </span>
          <span id="date" className="text-shark-300">
            Date
          </span>
          <div className="flex gap-2">
            <span id="value">Value</span>
            <span id="mean" className="text-shark-200">
              Mean
            </span>
          </div>
        </div>
      </Tooltip>
    </div>
  );
};

export const MonthlyDetailedExpensesBarPlot = () => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { user } = useAuth();
  const dbconfig = getConfig(user);
  const { hideAccounts, setDetailedDate, dateRange, chartPeriodicity } =
    useSummaryPageContext();

  const { data: rawData } = useQuery(
    transactByAccountOptions({
      db,
      bookId,
      accountIds: [dbconfig.expenses],
      periodicity: chartPeriodicity,
      hideAccounts
    })
  );

  const data = useMemo(() => {
    if (rawData)
      return collapseMinorAccounts(
        rawData
        .filter((d) => d.date >= dateRange.from.toString())
        .filter((d) => d.date <= dateRange.to.toString())
        ,
        14
      )
        .sort((a: Data, b: Data) => (yf(a) > yf(b) ? 1 : -1))
        .sort((a: Data, b: Data) => (xf(a) > xf(b) ? 1 : -1));
  }, [rawData]);

  if (!data || !dateRange) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <BarLoader color="#36d7b7" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <MonthlyExpensesChart
        data={data}
        domain={{ startDate: dateRange.from, endDate: dateRange.to }}
        setDate={setDetailedDate}
      />
    </div>
  );
};
