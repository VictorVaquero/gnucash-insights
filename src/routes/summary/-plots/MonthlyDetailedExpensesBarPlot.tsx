import {MutableRefObject, useContext, useMemo, useRef, useState} from "react";
import { BarLoader } from "react-spinners";
import {DateTime} from 'luxon';
import * as d3 from 'd3';

import {fullTWConfig, parseNum, useWindowSize} from "@/common/utils.ts";
import {chooseTooltipPointNode} from "@/routes/summary/-plots/tooltipFuncs.tsx";
import {XAxis} from "@/routes/summary/-plots/XAxis.tsx";
import {YAxis} from "@/routes/summary/-plots/YAxis.tsx";
import {Tooltip} from "@/routes/summary/-plots/Tooltip.tsx";
import {getDomainQuery} from "@/db/queries/global";
import {getNetCostsYearMonthQuery} from "@/db/queries/summary";
import { Account, accountsTable } from "@/db/schema";
import { BookContext, DBContext } from "@/contexts/GlobalContext";

export interface Data {
    account: string,
    date: string,
    value: number
}

const margin = {'t': 20, 'r': 20, 'b': 20, 'l': 50}
const getColor = (d: string):string => ({
    'Casa': fullTWConfig.theme.colors.rose[500],
    'Alquiler': fullTWConfig.theme.colors.rose[500],
    'Luz': fullTWConfig.theme.colors.rose[500],
    'Viajes': fullTWConfig.theme.colors.blue[500],
    'Compra': fullTWConfig.theme.colors.amber[700],
    'Restaurantes': fullTWConfig.theme.colors.yellow[500],
    'A domicilio': fullTWConfig.theme.colors.yellow[500],
    'Escalada': fullTWConfig.theme.colors.lime[500],
    'Gym': fullTWConfig.theme.colors.lime[500],
    'Recreación': fullTWConfig.theme.colors.green[500],
    'Bar ': fullTWConfig.theme.colors.violet[500],
    'Copas ': fullTWConfig.theme.colors.violet[500],
    'Cerveza': fullTWConfig.theme.colors.purple[500],
    'Transporte público': fullTWConfig.theme.colors.cyan[500],
    'Olvidado': fullTWConfig.theme.colors.orange[500],
}[d]?? fullTWConfig.theme.colors.gray[500])
const xf = (d: Data) => DateTime.fromISO(d.date);
const yf = (d: Data) => d.value;
const gf = (d: Data) => d.account;
const orderxf = (a: Data, b: Data) => xf(a) > xf(b) ? 1 : -1;
const orderyf = (a: Data, b: Data) => yf(a) > yf(b) ? 1 : -1;

const DrawMonthlyDetailedExpenses = (props: {
    data: Data[],
    accounts: Account[],
    hideAccounts: string[],
    domain: {startDate: DateTime, endDate: DateTime},
    setDate: CallableFunction,
    isYearly: boolean
}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [width, height] = useWindowSize(svgRef)
    const range = useMemo(() => {
        return {'x': [margin.l, width - margin.r], 'y': [height - margin.b, margin.t]}
    }, [width, height])

    const findAccount = (s: string) => props.accounts.filter((a)=>a.id === s)[0];
    const name_f = (d: Data) => findAccount(d.account)?.name ?? 'Otros';
    const color_f = (d: Data) => getColor(name_f(d)) 

    const filtered_data = props.data.filter(d => !props.hideAccounts.includes(d.account))
    const stack = d3.stack<[DateTime, d3.InternMap<string, Data>], string>()
        .keys(d3.union(filtered_data.map(gf)))
        .value(([,group], key) => group.get(key)?.value ?? 0)
        .order(d3.stackOrderDescending);
    const series = stack(d3.index(filtered_data, xf, gf));

    const months = props.isYearly ? 9 : 1;
    const xDomain = [props.domain.startDate.minus({'month': months}), props.domain.endDate];
    const yDomain = [0, d3.max(series.map((s)=>s.map((d)=>d[1])).flat())!]; 
    const xScale = d3.scaleUtc(xDomain, range.x);
    const yScale = d3.scaleLinear(yDomain, range.y);
    const numDataPoints = props.isYearly ? props.domain.endDate.diff(props.domain.startDate, ['years']).toObject().years! : props.domain.endDate.diff(props.domain.startDate, ['months']).toObject().months!;

    const getMean = (d: Data) => props.data.filter((n)=>n.account===d.account).reduce((p, c)=>p+c.value,0)/numDataPoints;
    const dataf = (id: string)=>props.data.filter((d)=>(gf(d)+xf(d))===id)[0];
    const choosePoint = chooseTooltipPointNode<Data>(dataf, 'rect');
    const updateTooltip = (ref: MutableRefObject<HTMLDivElement|null>, d: Data) => {
        if(ref.current !== null) {
            const tooltip = d3.select(ref.current)
            tooltip.select('#title').text(name_f(d))
            tooltip.select('#title').style('color', color_f(d))
            tooltip.select('#date').text(d.date)
            tooltip.select('#value').style('color', color_f(d))
            tooltip.select('#value').text(parseNum(d.value))
            tooltip.select('#mean').text(parseNum(getMean(d)))
        }
    }
    const onClick = (d: Data) => props.setDate(DateTime.fromISO(d.date));
    const rectWidth = width / series[0].length *0.7;
    return <div className='relative w-full h-full'>
        <svg className='w-full h-full' ref={svgRef}>
            <XAxis width={width} range={range} xScale={xScale}/>
            <YAxis height={height} range={range} scale={yScale}/>
            <g className='rects'>
                {series.map((s) =>
                    <g className='serie' key={s.key}>
                        {s.map((d)=>
                            <rect fill={getColor(findAccount(s.key)?.name)}
                                  key={s.key+d.data[0]}
                                  id={s.key+d.data[0]}
                                  strokeWidth='1.5'
                                  shapeRendering='geometricPrecision'
                                  stroke='white'
                                  x={xScale(d.data[0]) - rectWidth / 2}
                                  height={yScale(d[0])- yScale(d[1])}
                                  y={yScale(d[1])}
                                  width={rectWidth}
                            />
                        )}
                    </g>
                )}
            </g>
        </svg>
        <Tooltip svgRef={svgRef} choosePoint={choosePoint} updateTooltip={updateTooltip} onClick={onClick}>
            <div className='flex flex-col items-center px-6 py-2'>
                <span className='text-shark-300' id='title'>Title</span>
                <span className='text-shark-300' id='date'>Date</span>
                <div><span id='value'>Value</span> <span className="text-shark-200" id='mean'>Mean</span>
                </div>
            </div>
        </Tooltip>
    </div>;
}

export const MonthlyDetailedExpensesBarPlot = (props: { setDate: CallableFunction, hideAccounts: string[]}) => {
    const { db} = useContext(DBContext);
    const { bookId } = useContext(BookContext);
    
    const [isYearly, setIsYearly] = useState<boolean>(false);

    const data = useMemo( () => !db || !bookId ? null : getNetCostsYearMonthQuery(db, bookId, isYearly).all(), [db, bookId, isYearly]);
    const collapsed_data = useMemo(()=> !data ? null : [...nestCollapse(data, 14)].sort(orderyf).sort(orderxf), [data])!;
    const domain = useMemo( () => !db ? null : getDomainQuery(db).all()[0], [db])!;
    const accounts = useMemo( () => !db ? null : db.select().from(accountsTable).all(), [db])!;

    if (!db || !bookId) return <div className='w-full h-full flex flex-row items-center justify-center'><BarLoader color='#36d7b7'/></div>
    if(!domain.startDate || !domain.endDate) return <></> 

    return <div className="h-full flex flex-col">
        <button
            className="inline m-2 p-4 group hover:bg-shark-600 rounded font-light text-white group-hover:text-white"
            onClick={() => setIsYearly((prev) => !prev)} >
            <span className="">Anual/Mensual</span>
        </button>
        <div className="h-full">
            <DrawMonthlyDetailedExpenses
                data={collapsed_data}
                accounts={accounts}
                hideAccounts={props.hideAccounts}
                domain={{ startDate: domain.startDate, endDate: domain.endDate }}
                setDate={props.setDate}
                isYearly={isYearly}
            />
        </div>
    </div>
}


function nestCollapse(data: Data[], limit: number): Data[] {
    interface Collapsed {
        'key': string,
        'group': string,
        'value': number
    }
    function groupCollapse<Type>(
        data: Type[], limit: number,
        value_f: (t: Type) => number, group_f: (t: Type) => string, key_f: (t: Type) => string,
        default_group: string = 'AccountRest'): Collapsed[] {
        const grouped_data = d3.groupSort<Type, string>(data, (elem) => -d3.sum(elem, value_f), group_f);
        const biggest_groups = grouped_data.slice(0, limit)
        const get_collapsed_group = (d: Type) => biggest_groups.includes(group_f(d)) ? group_f(d) : default_group;
        const out_data = d3.flatRollup(data, (elem) => d3.sum(elem, value_f), key_f, get_collapsed_group)
        return out_data.map((d) => ({ 'key': d[0], 'group': d[1], 'value': d[2] }))
    }
    const collapsed_data = groupCollapse<Data>(data, limit, (d) => d.value, (d) => d.account, (d) => d.date)
    return collapsed_data.map((d) => ({ 'date': d.key, 'account': d.group, 'value': d.value }))
}
