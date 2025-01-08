import {MutableRefObject, useContext, useEffect, useMemo, useRef} from "react";
import {BarLoader} from "react-spinners";
import {DateTime} from "luxon";
import * as d3 from 'd3';

import {fullTWConfig, parseNum, useWindowSize} from "@/common/utils.ts";
import {XAxis} from "@/routes/summary/-plots/XAxis.tsx";
import {YAxis} from "@/routes/summary/-plots/YAxis.tsx";
import {Tooltip} from "@/routes/summary/-plots/Tooltip.tsx";
import {chooseTooltipPointLine} from "@/routes/summary/-plots/tooltipFuncs.tsx";
import { getDomainQuery, getIncomeExpensesYearMonthQuery, getProfitLossYearMonthQuery, getTaxesYearMonthQuery } from "@/db/views";
import { BookContext, DBContext } from "@/contexts/GlobalContext";

export interface Data { 
    name: string, 
    yearmonth: string,
    value: number
}

const colorCodes: Record<string, string> = {
    'Ingresos': fullTWConfig.theme.colors.green[500],
    'Gastos': fullTWConfig.theme.colors.red[500],
    'Ganancia': fullTWConfig.theme.colors.emerald[500],
    'Perdida': fullTWConfig.theme.colors.red[500]
}

type MergeObjectTypes<T extends object[]> = T extends [infer F, ...infer R extends object[]] ? F & MergeObjectTypes<R>  : unknown;
function joinArraysByKeys<
  T extends {[K: string|symbol]: unknown}[],
  K extends keyof T,
>(
  arrs: T[], 
  commonKeys: K[]
): MergeObjectTypes<T, K>[] { 
    return arrs[0].map(itemA => {
        return arrs.reduce((acum, arr) => {
            const matchingItem = arr.find(item =>
                commonKeys.every((key) => { return acum[key as never] === item[key]; })
            );
            if (!matchingItem) throw Error('No matching data')
            return { ...acum, ...matchingItem };
        }, itemA as MergeObjectTypes<T, K>)
    });
}

const margin = {'t': 20, 'r': 20, 'b': 20, 'l': 50}
const getColor = (d: string) => d in colorCodes ? colorCodes[d] : fullTWConfig.theme.colors.red[500]
const xf = (d: Data) => DateTime.fromISO(d.yearmonth);
const yf = (d: Data) => d.value;
const orderxf = (a: Data, b: Data) => xf(a) > xf(b) ? 1 : -1;
const orderyf = (a: Data, b: Data) => yf(a) > yf(b) ? 1 : -1;

const DrawMonthlyIncomeExpensesPlot = (props: { data: Data[], profit: Data[], domain: {startDate: DateTime, endDate: DateTime}}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [width, height] = useWindowSize(svgRef)
    const range = useMemo(() => {
        return {'x': [margin.l, width - margin.r], 'y': [height - margin.b, margin.t]}
    }, [width, height])

    const sortedData = [...props.data].sort(orderyf).sort(orderxf);
    const sortedProfit = [...props.profit].sort(orderyf).sort(orderxf);
    const mixin: MergeObjectTypes<object[]> = [sortedData.filter((d)=>d.name==='Gastos').map((d)=>({yearmonth: d.yearmonth, expenses: d.value})), sortedProfit.map((d)=>({...d, net: d.value})), sortedData.filter((d)=>d.name==='Ingresos').map((d)=>({yearmonth: d.yearmonth, income: d.value, value:d.value})) ]
    const joined = joinArraysByKeys(mixin, ['yearmonth']);


    //const xDomain = [d3.min(sortedData, xf)!.minus({'month':1}), d3.max(sortedData, xf)!];
    const xDomain = [props.domain.startDate.minus({'month': 1}), props.domain.endDate];
    const yDomain = [0, Math.max(...sortedData.map(yf))];
    const xScale = d3.scaleUtc(xDomain, range.x);
    const yScale = d3.scaleLinear(yDomain as [number, number], range.y);
    const line = d3.line<Data>()
        .curve(d3.curveLinear)
        .x((d) => xScale(xf(d)))
        .y((d) => yScale(yf(d)));
    const rectWidth = width / sortedProfit.length *0.7

    const choosePoint = chooseTooltipPointLine(joined, xf, yf, xScale, yScale);
    const updateTooltip = (ref: MutableRefObject<HTMLDivElement|null>, d: Data) => {
        if(ref.current !== null) {
            const tooltip = d3.select(ref.current)
            tooltip.select('#title').text(d.yearmonth)
            tooltip.select('#income').text(parseNum(d.income))
            tooltip.select('#expenses').text(parseNum(d.expenses))
            tooltip.select('#net').style('color', getColor(d.name))
            tooltip.select('#net').text(parseNum(d.net))
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
            <g className='rect'>
                {sortedProfit.map((d) =>
                    <rect fill={getColor(d.name)}
                          fillOpacity={0.4}
                          key={d.name+d.yearmonth}
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
                <span className='text-shark-300' id='title'>Title</span>
                <span id='income' className="text-emerald-500">Income</span><span id='expenses' className="text-red-500">Expenses</span><span id='net'>net</span>
            </div>
        </Tooltip>
    </div>
    ;
}


export const MonthlyIncomeExpensesPlot = () => {
    const { db} = useContext(DBContext);
    const { bookId } = useContext(BookContext);

    const dataFull = useMemo( () => !db || !bookId ? null : getIncomeExpensesYearMonthQuery(db, bookId).all(), [db, bookId]);
    const taxes = useMemo( () => !db || !bookId ? null : getTaxesYearMonthQuery(db, bookId).all(), [db, bookId]);
    const data = useMemo(()=> !db||!bookId ? null : dataFull!.map((d)=> ({...d, value: d.value - (taxes!.find((t)=> t.yearmonth === d.yearmonth)?.value || 0)})), [db, bookId, dataFull, taxes]);
    const profit = useMemo( () => !db || !bookId ? null : getProfitLossYearMonthQuery(db, bookId).all(), [db, bookId])!;
    const domain = useMemo( () => !db ? null : getDomainQuery(db).all()[0], [db])!;

    if (!db || !bookId) return <div className='w-full h-full flex flex-row items-center justify-center'><BarLoader color='#36d7b7'/></div>
    if(!domain.startDate || !domain.endDate) return <></> 

    return <DrawMonthlyIncomeExpensesPlot data={data!} profit={profit!} domain={{startDate: domain.startDate, endDate: domain.endDate}}/>
}
