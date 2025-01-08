import {MutableRefObject, useLayoutEffect, useState} from "react";
import resolveConfig from 'tailwindcss/resolveConfig'
// @ts-expect-error Really I think this is bullshit
import tailwindConfig from "/tailwind.config.js"

export const fullTWConfig = resolveConfig(tailwindConfig)

export const useWindowSize = (ref: MutableRefObject<Element | null>) => {
    const [size, setSize] = useState([0, 0]);
    useLayoutEffect(() => {
        function updateSize() {
            if (ref.current !== null) {
                const {width, height} = ref.current.getBoundingClientRect();
                console.debug('Current Window Range: ', [width, height])
                setSize([width, height])
            }
        }
        window.addEventListener('resize', updateSize);
        updateSize();
        return () => window.removeEventListener('resize', updateSize);
    }, [ref]);
    return size;
}

export const parseNum = (number: number, digits: number = 2, symbol: string = '€') => {
    const mappings  = { 1e6: "M", 1e3: "K" }
    for (const key in mappings) {
        const ckey = (key as unknown) as keyof typeof mappings
        if (number >= ckey) {
            const mynum = Math.round(number / ckey * 10 ** digits) / 10 ** digits;
            return mynum.toString() + mappings[ckey]
        }
    }
    const mynum = Math.round(number * 10 ** digits) / 10 ** digits
    return mynum.toString() + symbol
}

export const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return `Type ${error.name}: ${error.message}`
    return String(error)
}