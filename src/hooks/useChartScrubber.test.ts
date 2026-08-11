import { act, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { useChartScrubber } from "./useChartScrubber";

function mockRect(node: HTMLElement, rect: Partial<DOMRect>) {
  node.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      ...rect,
      toJSON: () => ({}),
    }) as DOMRect;
}

function firePointer(node: HTMLElement, type: string, clientX: number, pointerId = 1) {
  node.dispatchEvent(
    new PointerEvent(type, { clientX, pointerId, bubbles: true, cancelable: true }),
  );
}

describe("useChartScrubber", () => {
  it("starts idle with no active index and not dragging", () => {
    const ref = createRef<HTMLDivElement>();
    const div = document.createElement("div");
    (ref as { current: HTMLDivElement }).current = div;

    const { result } = renderHook(() => useChartScrubber(ref, { length: 5 }));

    expect(result.current.activeIndex).toBeNull();
    expect(result.current.isDragging).toBe(false);
  });

  it("maps a pointer drag's X position to the nearest data index", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    mockRect(div, { width: 100, left: 0, right: 100 });
    const ref = { current: div };

    const { result } = renderHook(() => useChartScrubber(ref, { length: 5 }));

    act(() => firePointer(div, "pointerdown", 0));
    expect(result.current.isDragging).toBe(true);
    expect(result.current.activeIndex).toBe(0);

    act(() => firePointer(div, "pointermove", 50));
    expect(result.current.activeIndex).toBe(2);

    act(() => firePointer(div, "pointermove", 99));
    expect(result.current.activeIndex).toBe(4);

    act(() => firePointer(div, "pointerup", 99));
    expect(result.current.isDragging).toBe(false);
    expect(result.current.activeIndex).toBeNull();

    document.body.removeChild(div);
  });

  it("clamps out-of-bounds drag positions to the first/last index", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    mockRect(div, { width: 100, left: 0, right: 100 });
    const ref = { current: div };

    const { result } = renderHook(() => useChartScrubber(ref, { length: 3 }));

    act(() => firePointer(div, "pointerdown", -50));
    expect(result.current.activeIndex).toBe(0);

    act(() => firePointer(div, "pointermove", 500));
    expect(result.current.activeIndex).toBe(2);

    document.body.removeChild(div);
  });

  it("accounts for the chart's margin when computing the index", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    mockRect(div, { width: 100, left: 0, right: 100 });
    const ref = { current: div };

    const { result } = renderHook(() =>
      useChartScrubber(ref, { length: 3, margin: { left: 20, right: 20 } }),
    );

    // plot area is [20, 80): clientX=20 -> fraction 0, clientX=80 -> fraction 1
    act(() => firePointer(div, "pointerdown", 20));
    expect(result.current.activeIndex).toBe(0);

    act(() => firePointer(div, "pointermove", 80));
    expect(result.current.activeIndex).toBe(2);

    document.body.removeChild(div);
  });

  it("ignores pointermove/pointerup from a different pointer than the one dragging", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    mockRect(div, { width: 100, left: 0, right: 100 });
    const ref = { current: div };

    const { result } = renderHook(() => useChartScrubber(ref, { length: 5 }));

    act(() => firePointer(div, "pointerdown", 0, 1));
    act(() => firePointer(div, "pointermove", 99, 2));
    expect(result.current.activeIndex).toBe(0);
    expect(result.current.isDragging).toBe(true);

    act(() => firePointer(div, "pointerup", 99, 2));
    expect(result.current.isDragging).toBe(true);

    document.body.removeChild(div);
  });
});
