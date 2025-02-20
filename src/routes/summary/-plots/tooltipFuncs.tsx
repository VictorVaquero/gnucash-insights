import * as d3 from "d3";
import {PointerEvent} from "react";
import {DateTime} from "luxon";

export function chooseTooltipPointLine<D>(
    data: D[], xf: (d: D) => DateTime, yf: (d: D) => number,
    xScale: d3.ScaleTime<number, number>, yScale: d3.ScaleContinuousNumeric<number, number>) {

    const dates = Array.from(d3.group(data, xf));
    // @ts-expect-error Don't know how to fix
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const bisectX = d3.bisector(([date, d]) => date).center;
    const bisectY = d3.bisector(yf).center;

    function choose(event: PointerEvent): [number, number, D|null] {
        const [x, y] = [xScale.invert(d3.pointer(event)[0]), yScale.invert(d3.pointer(event)[1])]
        const u = bisectX(dates, x);
        const split = dates[u][1];
        const i = bisectY(split, y);
        const d = split[i];
        //console.debug('Event pointer: ', event, d3.pointer(event), 'X,Y: ', x, y, 'Dates: ', split, 'Selection: ', d);
        return [xScale(xf(d)), yScale(yf(d)), d];
    }

    return choose;
}

export function chooseTooltipPointNode<D>(
    dataf: (id: string) => D,
    node: string) {
    function choose(event: PointerEvent): [number, number, D|null] {
        if(event.target instanceof Element && event.target.nodeName === node){
            const [x, y] = [d3.pointer(event)[0], d3.pointer(event)[1]]
            const d = dataf(event.target.id);
            //console.debug('Event pointer: ', d3.pointer(event), 'X,Y: ', x, y, 'Selection: ', d);
            return [x, y, d];
        }
        return [0,0, null]
    }
    return choose;
}
