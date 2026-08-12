import { MutableRefObject, useLayoutEffect, useState, useSyncExternalStore } from "react";

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

// Maps a value's position within [min, max] to a brand-tinted background (light = low,
// dark = high) plus a matching foreground, for heatmap-style intensity cells. Mixing against
// `--background`/`--brand` keeps it theme-aware instead of hardcoding a light-mode ramp.
export const intensityCellStyle = (value: number, min: number, max: number) => {
  const range = max - min;
  const ratio = range > 0 ? (value - min) / range : max > 0 ? 1 : 0;
  const mixPct = Math.round(12 + ratio * 66);
  return {
    backgroundColor: `color-mix(in srgb, var(--brand) ${mixPct}%, var(--background))`,
    color: ratio > 0.45 ? "white" : "var(--foreground)",
  };
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
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

// Reflects the device's actual current input capability, and updates live (e.g. a
// touchscreen laptop with a mouse also attached still reports correctly for each
// input type).
export const useIsTouchDevice = () => useMediaQuery(TOUCH_POINTER_QUERY);

// Updates on resize and orientation change.
export const useIsNarrowViewport = () => useMediaQuery(NARROW_VIEWPORT_QUERY);
