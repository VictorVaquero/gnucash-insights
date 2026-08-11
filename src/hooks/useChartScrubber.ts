import { type RefObject, useEffect, useRef, useState } from "react";

interface UseChartScrubberOptions {
  /** Number of points along the container's width to snap the drag position to. */
  length: number;
  /** Pixel offsets between the container's edges and the chart's plot area (the same
   *  `margin` prop passed to the Recharts chart), so the computed index lines up with the
   *  chart's own axis positions. */
  margin?: { left?: number; right?: number };
}

interface UseChartScrubberResult {
  /** Index into the chart's data array nearest the pointer, or `null` while idle. */
  activeIndex: number | null;
  /** True for the duration of a drag/touch-move gesture. */
  isDragging: boolean;
}

/**
 * Drag-to-scan primitive shared by every chart (chart-component-contract's Touch
 * interaction section): tracks a pointer/touch drag over `containerRef`'s element,
 * mapping the pointer's X position to the nearest data index. Charts use `activeIndex` to
 * render their own crosshair (`ReferenceLine`) and to drive `ChartTooltip`.
 */
export function useChartScrubber(
  containerRef: RefObject<HTMLElement | null>,
  { length, margin }: UseChartScrubberOptions,
): UseChartScrubberResult {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Read via refs inside the event handlers instead of the effect's dependency array, so
  // a `length`/`margin` change (e.g. the date range filter changing the data array) never
  // has to tear down and re-attach the listeners.
  const lengthRef = useRef(length);
  lengthRef.current = length;
  const marginRef = useRef(margin);
  marginRef.current = margin;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const draggingRef = { current: false };
    const pointerIdRef = { current: null as number | null };

    const indexFromClientX = (clientX: number): number => {
      const n = lengthRef.current;
      if (n <= 1) return 0;
      const rect = node.getBoundingClientRect();
      const left = marginRef.current?.left ?? 0;
      const right = marginRef.current?.right ?? 0;
      const plotWidth = Math.max(rect.width - left - right, 1);
      const fraction = (clientX - rect.left - left) / plotWidth;
      const clamped = Math.min(Math.max(fraction, 0), 1);
      return Math.round(clamped * (n - 1));
    };

    const onPointerDown = (e: PointerEvent) => {
      if (draggingRef.current) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      draggingRef.current = true;
      pointerIdRef.current = e.pointerId;
      setIsDragging(true);
      setActiveIndex(indexFromClientX(e.clientX));
      node.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current || e.pointerId !== pointerIdRef.current) return;
      e.preventDefault();
      setActiveIndex(indexFromClientX(e.clientX));
    };
    const endDrag = (e: PointerEvent) => {
      if (!draggingRef.current || e.pointerId !== pointerIdRef.current) return;
      draggingRef.current = false;
      pointerIdRef.current = null;
      setIsDragging(false);
      setActiveIndex(null);
    };

    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove, { passive: false });
    node.addEventListener("pointerup", endDrag);
    node.addEventListener("pointercancel", endDrag);
    return () => {
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", endDrag);
      node.removeEventListener("pointercancel", endDrag);
    };
  }, [containerRef]);

  return { activeIndex, isDragging };
}
