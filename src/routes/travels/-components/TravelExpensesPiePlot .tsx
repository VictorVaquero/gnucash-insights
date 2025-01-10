import {MutableRefObject, useContext, useMemo, useRef} from "react";
import { BarLoader } from "react-spinners";
import * as d3 from 'd3';

import {fullTWConfig, parseNum, useWindowSize} from "@/common/utils.ts";
import {chooseTooltipPointNode} from "@/routes/summary/-plots/tooltipFuncs.tsx";
import {Tooltip} from "@/routes/summary/-plots/Tooltip.tsx";
import { Account, accountsTable } from "@/db/schema";
import { getTravelExpensesByAccountQuery } from "@/db/views";
import { BookContext, DBContext } from "@/contexts/GlobalContext";

export interface Data {
    name: string,
    value: number
}

const margin = { 't': 5, 'r': 5, 'b': 5, 'l': 5 }
// TODO: Refactor
const getColor = (d: string, v: number = 0): string => ({
    'Casa': fullTWConfig.theme.colors.rose[500 + v],
    'Alquiler': fullTWConfig.theme.colors.rose[500 + v],
    'Luz': fullTWConfig.theme.colors.rose[500 + v],
    'Viajes': fullTWConfig.theme.colors.blue[500 + v],
    'Compra': fullTWConfig.theme.colors.amber[700 + v],
    'Restaurantes': fullTWConfig.theme.colors.yellow[500 + v],
    'A domicilio': fullTWConfig.theme.colors.yellow[500 + v],
    'Escalada': fullTWConfig.theme.colors.lime[500 + v],
    'Gym': fullTWConfig.theme.colors.lime[500 + v],
    'Recreación': fullTWConfig.theme.colors.green[500 + v],
    'Bar ': fullTWConfig.theme.colors.violet[500 + v],
    'Copas ': fullTWConfig.theme.colors.violet[500 + v],
    'Cerveza': fullTWConfig.theme.colors.purple[500 + v],
    'Transporte público': fullTWConfig.theme.colors.cyan[500 + v],
    'Gas': fullTWConfig.theme.colors.cyan[500 + v],
    'Olvidado': fullTWConfig.theme.colors.orange[500 + v],
}[d] ?? fullTWConfig.theme.colors.gray[500 + v])
const yf = (d: Data) => d.value;
const gf = (d: Data) => d.name;
const orderyf = (a: Data, b: Data) => yf(a) > yf(b) ? 1 : -1;

const DrawTravelExpensesPiePlot = (props: { data: Data[]}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [width, height] = useWindowSize(svgRef)
    const range = useMemo(() => {
        return { 'x': [margin.l, width - margin.r], 'y': [height - margin.b, margin.t] }
    }, [width, height])

    const color_f = (d: Data, v: number = 0) => getColor(d.name, v)

    const sortedData = [...props.data].sort(orderyf);
    const sumTotal = d3.sum(sortedData.map(yf));

    const radius = Math.min(...[range.x[1] - range.x[0], range.y[0] - range.y[1]]) / 2
    const pie_generator = d3.pie<Data>().value(yf);
    const arcGenerator = d3.arc<d3.PieArcDatum<Data>>().innerRadius(radius - 25).outerRadius(radius).padAngle(0.03)

    const dataf = (id: string) => sortedData.filter((d) => (gf(d)) === id)[0];
    const choosePoint = chooseTooltipPointNode<Data>(dataf, 'path');
    const updateTooltip = (ref: MutableRefObject<HTMLDivElement | null>, d: Data) => {
        if (ref.current !== null) {
            const tooltip = d3.select(ref.current)
            tooltip.select('#title').text(d.name)
            tooltip.select('#value').style('color', color_f(d))
            tooltip.select('#value').text(parseNum(d.value))
            tooltip.select('#percentage').text(parseNum(d.value/sumTotal*100, 0, '%'))
        }
    }
    return <div className='relative w-full h-full'>
        <div className="absolute left-0 top-0 w-full h-full flex flex-col justify-center items-center pointer-events-none">
            <p className="text-red-500">{parseNum(sumTotal)}</p>
        </div>
        <svg className='w-full h-full' ref={svgRef}>
            <g className='paths' transform={'translate(' + width / 2 + ',' + height / 2 + ')'}>
                {pie_generator(sortedData).map((d) =>
                    <path fill={color_f(d.data)}
                        key={gf(d.data)}
                        id={gf(d.data)}
                        strokeWidth='1.5'
                        shapeRendering='geometricPrecision'
                        stroke='white'
                        d={arcGenerator(d)!}
                    />
                )}
            </g>
        </svg>
        <Tooltip svgRef={svgRef} choosePoint={choosePoint} updateTooltip={updateTooltip}>
            <div className='flex flex-col items-center px-6 py-2'>
                <span className='text-shark-300' id='title'>Title</span>
                <span id='value'>Value</span>
                <span id='percentage'>Percentage</span>
            </div>
        </Tooltip>
    </div>;
}

export const TravelExpensesPiePlot = () => {
    const { db } = useContext(DBContext);
    const { bookId } = useContext(BookContext);

    const data = useMemo(() => !db || !bookId ? null : getTravelExpensesByAccountQuery(db, bookId).all(), [db, bookId]);

    if (!db || !bookId)
        return <div className='w-full h-full flex flex-row items-center justify-center'>
            <BarLoader color='#36d7b7' />
        </div>

    return <DrawTravelExpensesPiePlot data={data!} />
}
