import * as d3 from 'd3';
import { DateTime } from "luxon";
import { MutableRefObject, useMemo, useRef } from "react";
import { BarLoader } from '@/components/ui/BarLoader'

import {
    parseNum,
    useIsNarrowViewport,
    useWindowSize,
} from "@/common/utils.ts";
import { XAxis } from "@/components/charts/XAxis";
import { YAxis } from '@/components/charts/YAxis';
import { useAuth } from '@/contexts/useAuthContext';
import { travelExpensesDetailedYearMonthOptions } from "@/db/queries/travel";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { Tooltip } from "@/routes/summary/-plots/Tooltip.tsx";
import { chooseTooltipPointNode } from "@/routes/summary/-plots/tooltipFuncs.tsx";
import { useQuery } from "@tanstack/react-query";
import { getColor } from "./utils";

interface Data {
    name: string,
    date: string,
    value: number
}


const marginDesktop = { 't': 20, 'r': 20, 'b': 20, 'l': 50 }
const marginMobile = { 't': 10, 'r': 10, 'b': 20, 'l': 36 }
const xf = (d: Data) => DateTime.fromISO(d.date);
const yf = (d: Data) => d.value;
const gf = (d: Data) => d.name;
const orderxf = (a: Data, b: Data) => xf(a) > xf(b) ? 1 : -1;
const orderyf = (a: Data, b: Data) => yf(a) > yf(b) ? 1 : -1;

const DrawTravelExpensesPlot = (props: { data: Data[], domain: { startDate: DateTime, endDate: DateTime } }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [width, height] = useWindowSize(svgRef)
    const isNarrowViewport = useIsNarrowViewport();
    const margin = isNarrowViewport ? marginMobile : marginDesktop;
    const range = useMemo(() => {
        return { 'x': [margin.l, width - margin.r], 'y': [height - margin.b, margin.t] }
    }, [width, height, margin])

    const sortedData = [...props.data].sort(orderyf).sort(orderxf);
    const stack = d3.stack<[DateTime, d3.InternMap<string, Data>], string>()
        .keys(d3.union(sortedData.map(gf)))
        .value(([, group], key) => group.get(key)?.value ?? 0)
        .order(d3.stackOrderDescending);
    const series = stack(d3.index(sortedData, xf, gf));

    const xDomain = [props.domain.startDate.minus({ 'month': 4 }), props.domain.endDate];
    const yDomain = [0, d3.max(series.map((s) => s.map((d) => d[1])).flat())];
    const xScale = d3.scaleUtc(xDomain, range.x);
    const yScale = d3.scaleLinear(yDomain as [number, number], range.y);
    const rectWidth = width / series.length * 1.4

    const findAccount = (s: string) => sortedData.filter((a) => a.name === s)[0];

    const dataf = (id: string) => props.data.filter((d) => (gf(d) + xf(d)) === id)[0];
    const choosePoint = chooseTooltipPointNode<Data>(dataf, 'rect');
    const updateTooltip = (ref: MutableRefObject<HTMLDivElement | null>, d: Data) => {
        if (ref.current !== null) {
            const tooltip = d3.select(ref.current)
            tooltip.select('#title').text(d.date)
            tooltip.select('#name').text(d.name)
            tooltip.select('#name').style('color', getColor(d.name))
            tooltip.select('#value').text(parseNum(d.value))
        }
    }

    return <div className='relative w-full h-full'>
        <svg className='w-full h-full' ref={svgRef}>
            <XAxis width={width} range={range} xScale={xScale} />
            <YAxis height={height} range={range} scale={yScale} />
            <g className='rects'>
                {series.map((s) =>
                    <g className='serie' key={s.key}>
                        {s.map((d) =>
                            <rect fill={getColor(findAccount(s.key)?.name)}
                                fillOpacity={0.4}
                                key={s.key + d.data[0]}
                                id={s.key + d.data[0]}
                                strokeWidth='1.5'
                                shapeRendering='geometricPrecision'
                                stroke={getColor(findAccount(s.key)?.name)}
                                x={xScale(d.data[0]) - rectWidth / 2}
                                height={yScale(d[0]) - yScale(d[1])}
                                y={yScale(d[1])}
                                width={rectWidth}
                            />
                        )}
                    </g>
                )}
            </g>
        </svg>
        <Tooltip svgRef={svgRef} choosePoint={choosePoint} updateTooltip={updateTooltip}>
            <div className='flex flex-col items-center px-6 py-2'>
                <span className='text-shark-300' id='title'>Title</span>
                <span id='name' >name</span>
                <span id='value' className="text-gray-400">Value</span>
            </div>
        </Tooltip>
    </div>
        ;
}


export const TravelExpensesDetailedPlot = () => {
    const { user } = useAuth()
    const { db } = useDB();
    const { bookId } = useBook();
    const { from,  to } = useDomain()

    const { data, isSuccess } = useQuery(travelExpensesDetailedYearMonthOptions({ db, user, bookId }));

    if (!isSuccess || from == null || to == null) return <div className='w-full h-full flex flex-row items-center justify-center'><BarLoader color='#36d7b7' /></div>

    return <DrawTravelExpensesPlot data={data} domain={{ startDate: from, endDate: to }} />
}
