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

export const parseNum = (number: number, options: { digits?: number, symbol?: string, fixed?: number } = {}) => {
    const digits = options.digits ?? 2;
    const symbol = options.symbol ?? '€' ;

    const mappings = new Map([[1e6, "M"], [1e3, "K"], [1, symbol]])
    for (const [key, symbol] of mappings) {
        if (number >= key) {
            const mynum = Math.round(number / key * 10 ** digits) / 10 ** digits;
            let s = mynum.toString()
            if (options.fixed && s.replace('.','').length > options.fixed) s = s.slice(0, s.indexOf('.')>-1 ? options.fixed+1 : options.fixed)
            return (s[s.length-1] === '.' ? s.slice(0, s.length-1): s) + symbol 
        }
    }

    const mynum = Math.round(number * 10 ** digits) / 10 ** digits
    let s = mynum.toString()
    if (options.fixed && s.replace('.', '').length > options.fixed) s = s.slice(0, s.indexOf('.') > -1 ? options.fixed + 1 : options.fixed)
    return (s[s.length-1] === '.' ? s.slice(0, s.length-1): s) + symbol 
    return s + symbol
}

export const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return `Type ${error.name}: ${error.message}`
    return String(error)
}


export const areAllUndefined = (arr: unknown[]): boolean => arr.every(item => item == null)
export const areAnyUndefined = (arr: unknown[]): boolean => arr.some(item => item == null)