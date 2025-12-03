import { useQuery } from "@tanstack/react-query";
import * as d3 from "d3";
import { DateTime } from "luxon";
import { MutableRefObject, useMemo, useRef, useState } from "react";
import { BarLoader } from "react-spinners";

import { getDefaultColor, getRandomColor } from "@/common/getColors";
import { parseNum, useWindowSize } from "@/common/utils.ts";
import { XAxis } from "@/components/XAxis";
import { YAxis } from "@/components/YAxis";
import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { netCostsYearMonthOptions } from "@/db/queries/summary";
import { Account } from "@/db/schema";
import { useBook, useDB } from "@/hooks/useDB";
import { Tooltip } from "@/routes/summary/-plots/Tooltip.tsx";
import { chooseTooltipPointNode } from "@/routes/summary/-plots/tooltipFuncs.tsx";
import { useSummaryPageContext } from "../-summaryPageContext";

export interface Data {
  account: string;
  date: string;
  value: number;
}

const margin = { t: 20, r: 20, b: 20, l: 50 };
const xf = (d: Data) => DateTime.fromISO(d.date);
const yf = (d: Data) => d.value;
const gf = (d: Data) => d.account;
const orderxf = (a: Data, b: Data) => (xf(a) > xf(b) ? 1 : -1);
const orderyf = (a: Data, b: Data) => (yf(a) > yf(b) ? 1 : -1);
const defaultAccount = "Others";

const DrawMonthlyDetailedExpenses = (props: {
  data: Data[];
  accounts: Account[];
  hideAccounts: string[];
  domain: { startDate: DateTime; endDate: DateTime };
  setDate: CallableFunction;
  isYearly: boolean;
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, height] = useWindowSize(svgRef);
  const range = useMemo(() => {
    return {
      x: [margin.l, width - margin.r],
      y: [height - margin.b, margin.t],
    };
  }, [width, height]);

  const findAccount = (s: string) =>
    props.accounts.filter((a) => a.id === s)[0];
  const name_f = (d: Data | string) =>
    (typeof d === "string"
      ? findAccount(d)?.name
      : findAccount(d.account)?.name) ?? defaultAccount;
  const color_f = (d: Data | string) =>
    name_f(d) !== defaultAccount
      ? getRandomColor(name_f(d))
      : getDefaultColor();

  const filtered_data = props.data
    .filter((d) => d.date >= props.domain.startDate.toString())
    .filter((d) => d.date <= props.domain.endDate.toString())
    .filter((d) => !props.hideAccounts.includes(d.account));
  const stack = d3
    .stack<[DateTime, d3.InternMap<string, Data>], string>()
    .keys(d3.union(filtered_data.map(gf)))
    .value(([, group], key) => group.get(key)?.value ?? 0)
    .order(d3.stackOrderDescending);
  const series = stack(d3.index(filtered_data, xf, gf));

  const months = props.isYearly ? 9 : 1;
  const xDomain = [
    props.domain.startDate.minus({ month: months }),
    props.domain.endDate,
  ];
  const yDomain = [
    0,
    d3.max(series.map((s) => s.map((d) => d[1])).flat()) as number,
  ];
  const xScale = d3.scaleUtc(xDomain, range.x);
  const yScale = d3.scaleLinear(yDomain, range.y);
  const numDataPoints =
    (props.isYearly
      ? props.domain.endDate.diff(props.domain.startDate, ["years"]).toObject()
          .years
      : props.domain.endDate.diff(props.domain.startDate, ["months"]).toObject()
          .months) ?? 1;

  const getMean = (d: Data) =>
    props.data
      .filter((n) => n.account === d.account)
      .reduce((p, c) => p + c.value, 0) / numDataPoints;
  const dataf = (id: string) =>
    props.data.filter((d) => gf(d) + xf(d) === id)[0];
  const choosePoint = chooseTooltipPointNode<Data>(dataf, "rect");
  const updateTooltip = (
    ref: MutableRefObject<HTMLDivElement | null>,
    d: Data
  ) => {
    if (ref.current !== null) {
      const tooltip = d3.select(ref.current);
      tooltip.select("#title").text(name_f(d));
      tooltip.select("#title").style("color", color_f(d));
      tooltip.select("#date").text(d.date);
      tooltip.select("#value").style("color", color_f(d));
      tooltip.select("#value").text(parseNum(d.value));
      tooltip.select("#mean").text(parseNum(getMean(d)));
    }
  };
  const onClick = (d: Data) => props.setDate(DateTime.fromISO(d.date));
  const rectWidth = (width / (series.length ? series[0] : []).length) * 0.7;
  return (
    <div className="relative w-full h-full">
      <svg className="w-full h-full" ref={svgRef}>
        <XAxis width={width} range={range} xScale={xScale} />
        <YAxis height={height} range={range} scale={yScale} />
        <g className="rects cursor-pointer">
          {series.map((s) => (
            <g className="serie" key={s.key}>
              {s.map((d) => (
                <rect
                  fill={color_f(s.key)}
                  key={s.key + d.data[0]}
                  id={s.key + d.data[0]}
                  strokeWidth="1.5"
                  shapeRendering="geometricPrecision"
                  stroke="white"
                  x={xScale(d.data[0]) - rectWidth / 2}
                  height={yScale(d[0]) - yScale(d[1])}
                  y={yScale(d[1])}
                  width={rectWidth}
                />
              ))}
            </g>
          ))}
        </g>
      </svg>
      <Tooltip
        svgRef={svgRef}
        choosePoint={choosePoint}
        updateTooltip={updateTooltip}
        onClick={onClick}
      >
        <div className="flex flex-col items-center px-6 py-2">
          <span className="text-shark-300" id="title">
            Title
          </span>
          <span className="text-shark-300" id="date">
            Date
          </span>
          <div>
            <span id="value">Value</span>{" "}
            <span className="text-shark-200" id="mean">
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
  const { hideAccounts, setDetailedDate, dateRange } = useSummaryPageContext();

  const [isYearly, setIsYearly] = useState<boolean>(false);

  const { data: accounts, isSuccess: isSuccessAccounts } = useQuery(
    accountsOptions(db, bookId)
  );
  const { data, isSuccess } = useQuery(
    netCostsYearMonthOptions({ db, bookId, user, isYearly })
  );

  const collapsedData = useMemo(
    () =>
      !data ? null : [...nestCollapse(data, 14)].sort(orderyf).sort(orderxf),
    [data]
  );

  if (!isSuccessAccounts || !isSuccess || !collapsedData || !dateRange)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader color="#36d7b7" />
      </div>
    );

  return (
    <div className="h-full flex flex-col">
      <button
        className="inline m-2 p-4 group hover:bg-shark-600 rounded font-light text-white group-hover:text-white"
        onClick={() => setIsYearly((prev) => !prev)}
      >
        <span className="">Yearly/Monthly</span>
      </button>
      <div className="h-full">
        <DrawMonthlyDetailedExpenses
          data={collapsedData}
          accounts={accounts}
          hideAccounts={hideAccounts}
          domain={{ startDate: dateRange.from, endDate: dateRange.to }}
          setDate={setDetailedDate}
          isYearly={isYearly}
        />
      </div>
    </div>
  );
};

function nestCollapse(data: Data[], limit: number): Data[] {
  interface Collapsed {
    key: string;
    group: string;
    value: number;
  }
  function groupCollapse<Type>(
    data: Type[],
    limit: number,
    value_f: (t: Type) => number,
    group_f: (t: Type) => string,
    key_f: (t: Type) => string,
    default_group = "AccountRest"
  ): Collapsed[] {
    const grouped_data = d3.groupSort<Type, string>(
      data,
      (elem) => -d3.sum(elem, value_f),
      group_f
    );
    const biggest_groups = grouped_data.slice(0, limit);
    const get_collapsed_group = (d: Type) =>
      biggest_groups.includes(group_f(d)) ? group_f(d) : default_group;
    const out_data = d3.flatRollup(
      data,
      (elem) => d3.sum(elem, value_f),
      key_f,
      get_collapsed_group
    );
    return out_data.map((d) => ({ key: d[0], group: d[1], value: d[2] }));
  }
  const collapsed_data = groupCollapse<Data>(
    data,
    limit,
    (d) => d.value,
    (d) => d.account,
    (d) => d.date
  );
  return collapsed_data.map((d) => ({
    date: d.key,
    account: d.group,
    value: d.value,
  }));
}
