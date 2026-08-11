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

// Locale-aware replacement for the old hand-rolled `parseNum`: `Intl.NumberFormat`
// handles digit grouping/decimal-separator/compact-suffix conventions per locale (e.g.
// Spanish groups with "." and uses "," for decimals) instead of hardcoding them.
export const formatCurrency = (
  value: number,
  locale: string,
  options: { digits?: number; compact?: boolean } = {},
) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    notation: options.compact ? "compact" : "standard",
    maximumFractionDigits: options.digits ?? 2,
  }).format(value);

// For non-currency numbers (percentages, counts, durations) that still need
// locale-aware grouping/decimal separators. Callers append their own unit suffix.
export const formatNumber = (
  value: number,
  locale: string,
  options: { digits?: number; compact?: boolean } = {},
) =>
  new Intl.NumberFormat(locale, {
    notation: options.compact ? "compact" : "standard",
    maximumFractionDigits: options.digits ?? 2,
  }).format(value);

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return `Type ${error.name}: ${error.message}`;
  return String(error);
};

// Matches Tailwind's default `md` breakpoint (768px) so JS-side layout decisions
// stay in sync with the CSS breakpoint used throughout the app.
const NARROW_VIEWPORT_QUERY = "(max-width: 767px)";
const TOUCH_POINTER_QUERY = "(pointer: coarse)";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

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
