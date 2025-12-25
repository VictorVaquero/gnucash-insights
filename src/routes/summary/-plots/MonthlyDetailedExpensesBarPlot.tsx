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
import { accountsOptions } from "@/db/queries/global";
import { netCostsYearMonthOptions } from "@/db/queries/summary";
import { Account } from "@/db/schema";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { Tooltip } from "@/routes/summary/-plots/Tooltip.tsx";
import { chooseTooltipPointNode } from "@/routes/summary/-plots/tooltipFuncs.tsx";
import { useSummaryPageContext } from "../-summaryPageContext";

export interface DataPoint {
  account: string;
  date: string;
  value: number;
}

const CHART_MARGIN = { top: 20, right: 20, bottom: 20, left: 50 };
const DEFAULT_ACCOUNT_NAME = "Others";

const getParsedDate = (d: DataPoint) => DateTime.fromISO(d.date);
const getValue = (d: DataPoint) => d.value;
const getAccountId = (d: DataPoint) => d.account;

const sortByDate = (a: DataPoint, b: DataPoint) =>
  getParsedDate(a) > getParsedDate(b) ? 1 : -1;
const sortByValue = (a: DataPoint, b: DataPoint) =>
  getValue(a) > getValue(b) ? 1 : -1;

interface PlotProps {
  data: DataPoint[];
  accounts: Account[];
  hideAccounts: string[];
  domain: { startDate: DateTime; endDate: DateTime };
  setDate: (date: DateTime) => void;
  isYearly: boolean;
}

const MonthlyExpensesChart = ({
  data,
  accounts,
  hideAccounts,
  domain,
  setDate,
  isYearly,
}: PlotProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, height] = useWindowSize(svgRef);

  const range = useMemo(
    () => ({
      x: [CHART_MARGIN.left, width - CHART_MARGIN.right],
      y: [height - CHART_MARGIN.bottom, CHART_MARGIN.top],
    }),
    [width, height]
  );

  const accountHelpers = useMemo(() => {
    const findAccount = (id: string) => accounts.find((a) => a.id === id);

    const getName = (input: DataPoint | string) => {
      const id = typeof input === "string" ? input : input.account;
      return findAccount(id)?.name ?? DEFAULT_ACCOUNT_NAME;
    };

    const getColor = (input: DataPoint | string) => {
      const name = getName(input);
      return name !== DEFAULT_ACCOUNT_NAME
        ? getRandomColor(name)
        : getDefaultColor();
    };

    return { getName, getColor };
  }, [accounts]);

  const { series, xScale, yScale, rectWidth } = useMemo(() => {
    const startIso = domain.startDate.toISODate() ?? "";
    const endIso = domain.endDate.toISODate() ?? "";

    const filtered = data.filter(
      (d) =>
        d.date >= startIso &&
        d.date <= endIso &&
        !hideAccounts.includes(d.account)
    );

    const stackGenerator = d3
      .stack<[DateTime, d3.InternMap<string, DataPoint>], string>()
      .keys(d3.union(filtered.map(getAccountId)))
      .value(([, group], key) => group.get(key)?.value ?? 0)
      .order(d3.stackOrderDescending);

    const stackedData = stackGenerator(
      d3.index(filtered, getParsedDate, getAccountId)
    );

    const xPaddingMonths = isYearly ? 9 : 1;
    const xDomain = [
      domain.startDate.minus({ month: xPaddingMonths }),
      domain.endDate,
    ];
    const yMax = d3.max(stackedData.flatMap((s) => s.map((d) => d[1]))) ?? 0;

    const xS = d3.scaleUtc(xDomain, range.x);
    const yS = d3.scaleLinear([0, yMax], range.y);

    const pointsInSeries = stackedData[0]?.length ?? 1;
    const calculatedRectWidth = (width / pointsInSeries) * 0.7;

    return {
      series: stackedData,
      xScale: xS,
      yScale: yS,
      rectWidth: calculatedRectWidth,
    };
  }, [data, domain, hideAccounts, isYearly, range, width]);

  const tooltipHelpers = useMemo(() => {
    const getAccountAverage = (targetAccount: string) => {
      const accountData = data.filter((d) => d.account === targetAccount);
      const diff = isYearly
        ? domain.endDate.diff(domain.startDate, "years").years
        : domain.endDate.diff(domain.startDate, "months").months;

      const periodCount = Math.max(1, diff || 0);
      return d3.sum(accountData, getValue) / periodCount;
    };

    const findPointById = (id: string): DataPoint | undefined =>
      data.find((d) => getAccountId(d) + getParsedDate(d).toISO() === id);

    return { getAccountAverage, findPointById };
  }, [data, domain, isYearly]);

  const updateTooltip = (
    ref: RefObject<HTMLDivElement | null>,
    d: DataPoint | undefined
  ) => {
    // Guard: if the tooltip container or the data point is missing, do nothing
    const containerNode = ref.current;
    if (!containerNode || !d) return;

    const container = d3.select(containerNode);
    const color = accountHelpers.getColor(d);

    container
      .select("#title")
      .text(accountHelpers.getName(d))
      .style("color", color);
    container.select("#date").text(d.date);
    container.select("#value").text(parseNum(d.value)).style("color", color);
    container
      .select("#mean")
      .text(parseNum(tooltipHelpers.getAccountAverage(d.account)));
  };

  return (
    <div className="relative w-full h-full">
      <svg className="w-full h-full" ref={svgRef}>
        <XAxis width={width} range={range} xScale={xScale} />
        <YAxis height={height} range={range} scale={yScale} />
        <g className="bars cursor-pointer">
          {series.map((layer) => (
            <g key={layer.key} fill={accountHelpers.getColor(layer.key)}>
              {layer.map((d) => (
                <rect
                  key={`${layer.key}-${d.data[0].toISO()}`}
                  id={layer.key + d.data[0].toISO()}
                  x={xScale(d.data[0]) - rectWidth / 2}
                  y={yScale(d[1])}
                  height={Math.max(0, yScale(d[0]) - yScale(d[1]))}
                  width={rectWidth}
                  stroke="white"
                  strokeWidth="1.5"
                  shapeRendering="geometricPrecision"
                />
              ))}
            </g>
          ))}
        </g>
      </svg>

      <Tooltip
        svgRef={svgRef}
        choosePoint={chooseTooltipPointNode<DataPoint | undefined>(
          tooltipHelpers.findPointById,
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
  const dbconf = getConfig(user);
  const { hideAccounts, setDetailedDate, dateRange, isYearly } =
    useSummaryPageContext();

  const { data: accounts, isSuccess: accountsLoaded } = useQuery(
    accountsOptions(db, bookId, [dbconf.expenses])
  );
  const { data: rawData, isSuccess: dataLoaded } = useQuery(
    netCostsYearMonthOptions({ db, bookId, user, isYearly })
  );

  const processedData = useMemo(() => {
    if (!rawData) return null;
    return collapseMinorAccounts(rawData, 14)
      .sort(sortByValue)
      .sort(sortByDate);
  }, [rawData]);

  if (!accountsLoaded || !dataLoaded || !processedData || !dateRange) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <BarLoader color="#36d7b7" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <MonthlyExpensesChart
        data={processedData}
        accounts={accounts}
        hideAccounts={hideAccounts}
        domain={{ startDate: dateRange.from, endDate: dateRange.to }}
        setDate={setDetailedDate}
        isYearly={isYearly}
      />
    </div>
  );
};

function collapseMinorAccounts(data: DataPoint[], limit: number): DataPoint[] {
  const totalByAccount = d3.rollup(
    data,
    (v) => d3.sum(v, (d) => d.value),
    (d) => d.account
  );

  const topAccounts = Array.from(totalByAccount.keys())
    .sort((a, b) => (totalByAccount.get(b) ?? 0) - (totalByAccount.get(a) ?? 0))
    .slice(0, limit);

  const collapsed = d3.flatRollup(
    data,
    (v) => d3.sum(v, (d) => d.value),
    (d) => d.date,
    (d) => (topAccounts.includes(d.account) ? d.account : "AccountRest")
  );

  return collapsed.map(([date, account, value]) => ({ date, account, value }));
}
