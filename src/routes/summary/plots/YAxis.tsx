import * as d3 from "d3";

export const YAxis = (props: {
    height: number,
    range: { x: number[], y: number[] },
    scale: d3.ScaleLinear<number, number>
}) => {
    return <g className='yaxis text-white' textAnchor='end' transform={'translate(' + props.range.x[0] + ',0)'}>
        {props.scale.ticks(props.height / 70).map((value) =>
            <g className='tick' fontSize="10" key={props.scale(value)}
               transform={'translate(0,' + props.scale(value) + ')'}>
                <line className='notch' stroke='currentColor' x2='6'></line>
                <line className='cross' stroke='currentColor' strokeOpacity='0.1' x2={props.range.x[1]}></line>
                <text x='-9' dy="0.32em" fill='currentColor'>{props.scale.tickFormat()(value)}</text>
            </g>
        )}
    </g>
}