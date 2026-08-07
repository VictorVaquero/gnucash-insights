import { BarLoader } from "@/components/ui/BarLoader";
import * as d3 from "d3";
import { DateTime } from "luxon";
import { RefObject, useMemo, useRef } from "react";

import { getRandomColor } from "@/common/getColors";
import {
  parseNum,
  useIsNarrowViewport,
  useWindowSize,
} from "@/common/utils.ts";
import { XAxis } from "@/components/charts/XAxis";
import { YAxis } from "@/components/charts/YAxis";
import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { transactByAccountOptions } from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { Tooltip } from "@/routes/summary/-plots/Tooltip.tsx";
import { chooseTooltipPointNode } from "@/routes/summary/-plots/tooltipFuncs.tsx";
import { useQuery } from "@tanstack/react-query";
import { useSummaryPageContext } from "../-summaryPageContext";

interface Data {
  date: string;
  dateLabel: string;
  accountId: string;
  accountName: string;
  value: number;
}
interface Account {
  id: string;
  name: string;
}

const marginDesktop = { t: 20, r: 20, b: 20, l: 50 };
const marginMobile = { t: 10, r: 10, b: 20, l: 36 };
const xf = (d: Data) => DateTime.fromISO(d.date);
const yf = (d: Data) => Math.abs(d.value);

const DrawMonthlyAccountsPlot = ({
  data,
  accounts,
  domain,
}: {
  data: Data[];
  accounts: Account[];
  domain: { startDate: DateTime; endDate: DateTime };
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, height] = useWindowSize(svgRef);
  const isNarrowViewport = useIsNarrowViewport();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;
  const range = {
    x: [margin.l, width - margin.r],
    y: [height - margin.b, margin.t],
  };
  const xDomain = [domain.startDate.minus({ month: 1 }), domain.endDate];
  const yDomain = [0, d3.max(data, yf) as number];

  const xScale = d3.scaleUtc(xDomain, range.x);
  const yScale = d3.scaleLinear(yDomain, range.y);
  const line = d3
    .line<Data>()
    .curve(d3.curveLinear)
    .x((d) => xScale(xf(d)))
    .y((d) => yScale(yf(d)));

  const findPointById = (id: string): Data | undefined =>
    data.find((d) => "circle" + d.accountId + d.date === id);

  const choosePoint = chooseTooltipPointNode<Data>(findPointById, "circle");
  const updateTooltip = (ref: RefObject<HTMLDivElement | null>, d: Data) => {
    if (ref.current !== null) {
      const tooltip = d3.select(ref.current);
      tooltip.select("#title").text(d.accountName);
      tooltip.select("#date").text(d.dateLabel);
      tooltip.select("#value").style("color", getRandomColor(d.accountId));
      tooltip.select("#value").text(parseNum(yf(d)));
    }
  };

  return (
    <div className="relative w-full h-full">
      <svg className="w-full h-full" ref={svgRef}>
        <XAxis width={width} range={range} xScale={xScale} />
        <YAxis height={height} range={range} scale={yScale} />
        <g className="lines">
          {accounts.map((s) => (
            <path
              fill="none"
              stroke={getRandomColor(s.id)}
              key={"account" + s.id}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="1"
              shapeRendering="geometricPrecision"
              d={line(data.filter((d) => d.accountId === s.id)) as string}
            />
          ))}
        </g>
        <g className="circles">
          {data.map((d) => (
            <circle
              fill={"#00000000"}
              key={"circle" + d.accountId + d.date}
              id={"circle" + d.accountId + d.date}
              strokeWidth="1.5"
              shapeRendering="geometricPrecision"
              r="20"
              cx={xScale(xf(d))}
              cy={yScale(yf(d))}
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
          <span className="text-shark-300" id="date">
            Date
          </span>
          <span id="value">Value</span>
        </div>
      </Tooltip>
    </div>
  );
};

export const AssetAccountsPlot = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { dateRange, chartPeriodicity } = useSummaryPageContext();
  const dbconfig = getConfig(user);

  const { data: rawData } = useQuery(
    transactByAccountOptions({
      db,
      bookId,
      accountIds: [dbconfig.assets],
      periodicity: chartPeriodicity,
      accumulate: true,
    })
  );

  const { data: accounts } = useQuery(
    accountsOptions({ db, bookId, accountIds: [dbconfig.assets] })
  );

  const data = useMemo(() => {
    if (rawData) {
      return rawData
        .sort((a, b) => {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          return timeA - timeB;
        })
        .filter((d) => d.date >= dateRange.from.toString())
        .filter((d) => d.date <= dateRange.to.toString());
    }
  }, [rawData, dateRange]);

  if (!data || !accounts || !dateRange)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader color="#36d7b7" />
      </div>
    );

  return (
    <DrawMonthlyAccountsPlot
      data={data}
      accounts={accounts}
      domain={{ startDate: dateRange.from, endDate: dateRange.to }}
    />
  );
};
