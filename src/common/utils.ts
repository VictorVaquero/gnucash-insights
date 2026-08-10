import { MutableRefObject, useEffect, useLayoutEffect, useState } from "react";

export const twStyles = getComputedStyle(document.documentElement);

export const useWindowSize = (ref: MutableRefObject<Element | null>) => {
  const [size, setSize] = useState([0, 0]);
  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null) return;

    function updateSize() {
      if (node !== null) {
        const { width, height } = node.getBoundingClientRect();
        setSize([width, height]);
      }
    }
    updateSize();

    // Observes the container itself so charts resize on sidebar
    // open/close and other layout changes, not just window resize.
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return size;
};

export const parseNum = (
  number: number,
  options: { digits?: number; symbol?: string; fixed?: number } = {}
) => {
  const digits = options.digits ?? 2;
  const symbol = options.symbol ?? "€";

  const mappings = new Map([
    [1e6, "M"],
    [1e3, "K"],
    [1, symbol],
  ]);
  for (const [key, symbol] of mappings) {
    if (Math.abs(number) >= key) {
      const mynum =
        Math.round((Math.abs(number) / key) * 10 ** digits) / 10 ** digits;
      let s = mynum.toString();
      if (options.fixed && s.replace(".", "").length > options.fixed)
        s = s.slice(0, s.indexOf(".") > -1 ? options.fixed + 1 : options.fixed);
      return (s[s.length - 1] === "." ? s.slice(0, s.length - 1) : s) + symbol;
    }
  }

  const mynum = Math.round(Math.abs(number) * 10 ** digits) / 10 ** digits;
  let s = mynum.toString();
  if (options.fixed && s.replace(".", "").length > options.fixed)
    s = s.slice(0, s.indexOf(".") > -1 ? options.fixed + 1 : options.fixed);
  return (s[s.length - 1] === "." ? s.slice(0, s.length - 1) : s) + symbol;
};

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return `Type ${error.name}: ${error.message}`;
  return String(error);
};

// Matches Tailwind's default `md` breakpoint (768px) so JS-side layout decisions
// stay in sync with the CSS breakpoint used throughout the app.
const NARROW_VIEWPORT_QUERY = "(max-width: 767px)";
const TOUCH_POINTER_QUERY = "(pointer: coarse)";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// Reflects the device's actual current input capability, and updates live (e.g. a
// touchscreen laptop with a mouse also attached still reports correctly for each
// input type).
export const useIsTouchDevice = () => useMediaQuery(TOUCH_POINTER_QUERY);

// Updates on resize and orientation change.
export const useIsNarrowViewport = () => useMediaQuery(NARROW_VIEWPORT_QUERY);
