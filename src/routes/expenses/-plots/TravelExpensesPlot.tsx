import {MutableRefObject, useContext, useMemo, useRef} from "react";
import {BarLoader} from "react-spinners";
import {DateTime} from "luxon";
import * as d3 from 'd3';

import {fullTWConfig, parseNum, useWindowSize} from "@/common/utils.ts";
import {XAxis} from "@/routes/summary/-plots/XAxis.tsx";
import {YAxis} from "@/routes/summary/-plots/YAxis.tsx";
import {Tooltip} from "@/routes/summary/-plots/Tooltip.tsx";
import {chooseTooltipPointLine} from "@/routes/summary/-plots/tooltipFuncs.tsx";
import { getDomainQuery, getTravelExpensesYearMonthQuery } from "@/db/views";
import { BookContext, DBContext } from "@/contexts/GlobalContext";

export interface Data { 
    name: string, 
    date: string,
    value: number
}

const colorCodes: Record<string, string> = {
    'Ingresos': fullTWConfig.theme.colors.green[500],
    'Gastos': fullTWConfig.theme.colors.red[500],
    'Ganancia': fullTWConfig.theme.colors.emerald[500],
    'Perdida': fullTWConfig.theme.colors.red[500]
}

const margin = {'t': 20, 'r': 20, 'b': 20, 'l': 50}
const getColor = (d: string) => d in colorCodes ? colorCodes[d] : fullTWConfig.theme.colors.red[500]
const xf = (d: Data) => DateTime.fromISO(d.date);
const yf = (d: Data) => d.value;
const orderxf = (a: Data, b: Data) => xf(a) > xf(b) ? 1 : -1;
const orderyf = (a: Data, b: Data) => yf(a) > yf(b) ? 1 : -1;

const DrawTravelExpensesPlot = (props: { data: Data[], domain: {startDate: DateTime, endDate: DateTime}}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [width, height] = useWindowSize(svgRef)
    const range = useMemo(() => {
        return {'x': [margin.l, width - margin.r], 'y': [height - margin.b, margin.t]}
    }, [width, height])

    const sortedData = [...props.data].sort(orderyf).sort(orderxf);

    const xDomain = [props.domain.startDate.minus({'month': 1}), props.domain.endDate];
    const yDomain = [0, Math.max(...sortedData.map(yf))];
    const xScale = d3.scaleUtc(xDomain, range.x);
    const yScale = d3.scaleLinear(yDomain as [number, number], range.y);
    const rectWidth = width / sortedData.length *0.7

    const choosePoint = chooseTooltipPointLine(sortedData, xf, yf, xScale, yScale);
    const updateTooltip = (ref: MutableRefObject<HTMLDivElement|null>, d: Data) => {
        if(ref.current !== null) {
            const tooltip = d3.select(ref.current)
            tooltip.select('#title').text(d.date)
            tooltip.select('#value').style('color', getColor(d.name))
            tooltip.select('#value').text(parseNum(d.value))
        }
    }


    return <div className='relative w-full h-full'>
        <svg className='w-full h-full' ref={svgRef}>
            <XAxis width={width} range={range} xScale={xScale}/>
            <YAxis height={height} range={range} scale={yScale}/>
            <g className='rect'>
                {sortedData.map((d) =>
                    <rect fill={getColor(d.name)}
                          fillOpacity={0.4}
                          key={d.name+d.date}
                          strokeWidth='1.5'
                          shapeRendering='geometricPrecision'
                          stroke={getColor(d.name)}
                          x={xScale(xf(d))-rectWidth/2}
                          y={yScale(yf(d))}
                          height={range.y[0]-yScale(yf(d))}
                          width={rectWidth}
                    />
                )}
            </g>
        </svg>
        <Tooltip svgRef={svgRef} choosePoint={choosePoint} updateTooltip={updateTooltip}>
            <div className='flex flex-col items-center px-6 py-2'>
                <span className='text-shark-300' id='title'>Title</span>
                <span id='income' className="text-emerald-500">Income</span><span id='expenses' className="text-red-500">Expenses</span><span id='net'>net</span>
            </div>
        </Tooltip>
    </div>
    ;
}


export const TravelExpensesPlot = () => {
    const { db } = useContext(DBContext);
    const { bookId } = useContext(BookContext);

    const data = useMemo( () => !db || !bookId ? null : getTravelExpensesYearMonthQuery(db, bookId).all(), [db, bookId]);
    const domain = useMemo( () => !db ? null : getDomainQuery(db).all()[0], [db])!;

    if (!db || !bookId) return <div className='w-full h-full flex flex-row items-center justify-center'><BarLoader color='#36d7b7'/></div>
    if(!domain.startDate || !domain.endDate) return <></> 

    return <DrawTravelExpensesPlot data={data!} domain={{startDate: domain.startDate, endDate: domain.endDate}}/>
}
