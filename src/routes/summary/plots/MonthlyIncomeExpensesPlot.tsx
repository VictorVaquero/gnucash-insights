import {MutableRefObject, useEffect, useMemo, useRef} from "react";
import * as d3 from 'd3';

import {IncomeExpenses} from "@/services/entities";
import {fullTWConfig, parseNum, useWindowSize} from "@/common/utils.ts";
import {XAxis} from "@/routes/summary/plots/XAxis.tsx";
import {YAxis} from "@/routes/summary/plots/YAxis.tsx";
import {Tooltip} from "@/routes/summary/plots/Tooltip.tsx";
import {chooseTooltipPointLine} from "@/routes/summary/plots/tooltipFuncs.tsx";
import {DateTime} from "luxon";
import {StateHandler} from "@/components/StateHandler.tsx";
import {useIncomeExpenses} from "@/services/apiQueryFunctions.tsx";


const margin = {'t': 20, 'r': 20, 'b': 20, 'l': 50}
const getColor = (d: string) => d === 'Ingresos' ? fullTWConfig.theme.colors.green[500] : fullTWConfig.theme.colors.red[500]
const xf = (d: IncomeExpenses) => DateTime.fromISO(d.yearmonth);
const yf = (d: IncomeExpenses) => d.value;
const orderxf = (a: IncomeExpenses, b: IncomeExpenses) => xf(a) > xf(b) ? 1 : -1;
const orderyf = (a: IncomeExpenses, b: IncomeExpenses) => yf(a) > yf(b) ? 1 : -1;

const DrawMonthlyIncomeExpensesPlot = (props: { data: IncomeExpenses[], domain: DateTime[] }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [width, height] = useWindowSize(svgRef)
    const range = useMemo(() => {
        return {'x': [margin.l, width - margin.r], 'y': [height - margin.b, margin.t]}
    }, [width, height])

    const sortedData = [...props.data].sort(orderyf).sort(orderxf);

    //const xDomain = [d3.min(sortedData, xf)!.minus({'month':1}), d3.max(sortedData, xf)!];
    const xDomain = [props.domain[0].minus({'month':1}), props.domain[1]];
    const yDomain = [0, Math.max(...sortedData.map(yf))];
    const xScale = d3.scaleUtc(xDomain, range.x);
    const yScale = d3.scaleLinear(yDomain as [number, number], range.y);
    const line = d3.line<IncomeExpenses>()
        .curve(d3.curveLinear)
        .x((d) => xScale(xf(d)))
        .y((d) => yScale(yf(d)));

    const choosePoint = chooseTooltipPointLine<IncomeExpenses>(sortedData, xf, yf, xScale, yScale);
    const updateTooltip = (ref: MutableRefObject<HTMLDivElement|null>, d: IncomeExpenses) => {
        if(ref.current !== null) {
            const tooltip = d3.select(ref.current)
            tooltip.select('#title').text(d.yearmonth)
            tooltip.select('#value').style('color', getColor(d.name))
            tooltip.select('#value').text(parseNum(d.value))
        }
    }

    const uniqueAccounts = useMemo(()=>[...new Set(sortedData.map((d)=>d.name))], [sortedData])
    const paths = uniqueAccounts.map((s)=> line(sortedData.filter((d) => d.name === s)))
    useEffect(() => {
        d3.select(svgRef.current)
            .select('g.lines')
            .selectAll('path')
            .data(uniqueAccounts)
            .transition()
            .delay(100)
            .duration(1000)
            .ease(d3.easeQuadOut)
            .attr('d', (_s, i)=>paths[i])
        d3.select(svgRef.current)
            .select('g.circles')
            .selectAll('circle')
            .data(sortedData)
            .transition()
            .delay(100)
            .duration(1000)
            .ease(d3.easeQuadOut)
            .attr('cy', (d)=>yScale(yf(d)))
    }, [paths, uniqueAccounts, sortedData, yScale]);

    return <div className='relative w-full h-full'>
        <svg className='w-full h-full' ref={svgRef}>
            <XAxis width={width} range={range} xScale={xScale}/>
            <YAxis height={height} range={range} scale={yScale}/>
            <g className='lines'>
                {uniqueAccounts.map((s) =>
                    <path fill="none"
                          stroke={getColor(s)}
                          key={s}
                          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                          strokeOpacity="1" shapeRendering="geometricPrecision"
                          d={line(sortedData.filter((d)=>d.name===s).map((d)=>({...d,'value': 0})))!}
                    />
                )}
            </g>
            <g className='circles'>
                {sortedData.map((d) =>
                    <circle fill={getColor(d.name)}
                            key={d.name+d.yearmonth}
                            strokeWidth='1.5' shapeRendering='geometricPrecision' stroke='white' r='5'
                            cx={xScale(new Date(d.yearmonth))} cy={yScale(range.y[1])}
                    />
                )}
            </g>
        </svg>
        <Tooltip svgRef={svgRef} choosePoint={choosePoint} updateTooltip={updateTooltip}>
            <div className='flex flex-col items-center px-6 py-2'>
                <span className='text-shark-300' id='title'>Title</span><span id='value'>Value</span>
            </div>
        </Tooltip>
    </div>
    ;
}


export const MonthlyIncomeExpensesPlot = (props: {bookId: string, domain: DateTime[]}) => {
    const incomeExpenses = useIncomeExpenses(props.bookId);

    return <StateHandler dependencies={[incomeExpenses]}>
        <DrawMonthlyIncomeExpensesPlot data={incomeExpenses.data!} domain={props.domain}/>
    </StateHandler>
}
