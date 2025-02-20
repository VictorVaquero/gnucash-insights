import { isMobile } from "@/common/utils";
import * as d3 from "d3";
import { MutableRefObject, PointerEvent, PropsWithChildren, useRef } from "react";

interface TooltipProps<D,> {
    svgRef: MutableRefObject<SVGSVGElement | null>,
    choosePoint: (arg0: PointerEvent) => [number, number, D | null],
    updateTooltip: (arg0: MutableRefObject<HTMLDivElement | null>, arg1: D) => void,
    onClick?: (arg0: D) => void
}
export const Tooltip = <D,>(props: PropsWithChildren<TooltipProps<D>>) => {
    const tooltipRef = useRef<HTMLDivElement | null>(null)
    const pointermove = function (event: PointerEvent) {
        const [x, y, d] = props.choosePoint(event)
        if (tooltipRef.current !== null && d !== null) {
            const tooltip = d3.select(tooltipRef.current)
            const { width, height } = tooltipRef.current.getBoundingClientRect();
            tooltip.style("visibility", 'visible');
            tooltip.style("transform", `translate(${(x - width / 2)}px,${(y - height - 15)}px)`);
            props.updateTooltip(tooltipRef, d)
        } else {
            if (tooltipRef.current !== null) setTimeout(() => { d3.select(tooltipRef.current).style('visibility', 'hidden'); }, 1000);
        }
    }
    const pointerleave = () => {
        if (tooltipRef.current !== null) {
            if (!isMobile()) d3.select(tooltipRef.current).style('visibility', 'hidden');
            else setTimeout(() => { d3.select(tooltipRef.current).style('visibility', 'hidden'); }, 1000);
        }
    }

    d3.select(props.svgRef.current)
        .on('onClick pointerenter pointermove', pointermove)
        .on('pointerleave', pointerleave)

    if (props.onClick) {
        const onClick = (event: PointerEvent) => {
            const [, , d] = props.choosePoint(event)
            if (d && !!props.onClick) props.onClick(d)
        }
        d3.select(props.svgRef.current).on('click', onClick)
    }

    return <div className='tooltip
                        bg-shark-800 text-white stroke-1 stroke-white opacity-95
                        rounded invisible
                        absolute top-[0px] left-[0px] z-10
                        pointer-events-none
                        before:absolute before:w-5 before:h-5 before:left-1/2 before:bottom-0
                        before:bg-shark-800 before:content-[""]
                        before:transform before:origin-center
                        before:-translate-x-1/2 before:translate-y-1/2 before:rotate-45'
        ref={tooltipRef}>
        {props.children}
    </div>
}