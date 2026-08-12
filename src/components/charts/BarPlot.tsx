// Tremor BarChart [v1.0.0]
/* eslint-disable */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

import { RechartsDevtools } from "@recharts/devtools";
import { IconDefinition, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import {
  Bar,
  CartesianGrid,
  Label,
  BarChart as RechartsBarChart,
  Legend as RechartsLegend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AxisDomain } from "recharts/types/util/types";

import { useWindowSize } from "@/common/utils.ts";
import { ChartKeyValue } from "@/components/charts/ChartKeyValue";
import { ChartTooltip as TouchChartTooltip } from "@/components/charts/ChartTooltip";
import { useChartScrubber } from "@/hooks/useChartScrubber";
import {
  AvailableChartColors,
  constructCategoryColors,
  getColorClassName,
  getYAxisDomain,
} from "@/components/charts/utils";
import { cn } from "@/lib/utils";

//#region Shape

function deepEqual<T>(obj1: T, obj2: T): boolean {
  if (obj1 === obj2) return true;

  if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 === null || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1) as (keyof T)[];
  const keys2 = Object.keys(obj2) as (keyof T)[];

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

const renderShape = (
  props: any,
  activeBar: any | undefined,
  activeLegend: string | undefined,
  layout: string,
) => {
  const { fillOpacity, name, payload, value } = props;
  let { x, width, y, height } = props;

  if (layout === "horizontal" && height < 0) {
    y += height;
    height = Math.abs(height); // height must be a positive number
  } else if (layout === "vertical" && width < 0) {
    x += width;
    width = Math.abs(width); // width must be a positive number
  }

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      opacity={
        activeBar || (activeLegend && activeLegend !== name)
          ? deepEqual(activeBar, { ...payload, value })
            ? fillOpacity
            : 0.3
          : fillOpacity
      }
    />
  );
};

//#region Legend

interface LegendItemProps {
  name: string;
  color: AvailableChartColorsKeys;
  onClick?: (name: string, color: AvailableChartColorsKeys) => void;
  activeLegend?: string;
}

const LegendItem = ({ name, color, onClick, activeLegend }: LegendItemProps) => {
  const hasOnValueChange = !!onClick;
  return (
    <li
      className={cn(
        // base
        "group inline-flex flex-nowrap items-center gap-1.5 rounded-sm px-2 py-1 whitespace-nowrap transition",
        hasOnValueChange
          ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          : "cursor-default",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(name, color);
      }}
    >
      <span
        className={cn(
          "size-2 shrink-0 rounded-xs",
          getColorClassName(color, "bg"),
          activeLegend && activeLegend !== name ? "opacity-40" : "opacity-100",
        )}
        aria-hidden={true}
      />
      <p
        className={cn(
          // base
          "truncate text-xs whitespace-nowrap",
          // text color
          "text-gray-700 dark:text-gray-300",
          hasOnValueChange && "group-hover:text-shark-900 dark:group-hover:text-gray-50",
          activeLegend && activeLegend !== name ? "opacity-40" : "opacity-100",
        )}
      >
        {name}
      </p>
    </li>
  );
};

interface ScrollButtonProps {
  icon: IconDefinition;
  onClick?: () => void;
  disabled?: boolean;
}

const ScrollButton = ({ icon, onClick, disabled }: ScrollButtonProps) => {
  const [isPressed, setIsPressed] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (isPressed) {
      intervalRef.current = setInterval(() => {
        onClick?.();
      }, 300);
    } else {
      clearInterval(intervalRef.current as NodeJS.Timeout);
    }
    return () => clearInterval(intervalRef.current as NodeJS.Timeout);
  }, [isPressed, onClick]);

  React.useEffect(() => {
    if (disabled) {
      clearInterval(intervalRef.current as NodeJS.Timeout);
      setIsPressed(false);
    }
  }, [disabled]);

  return (
    <button
      type="button"
      className={cn(
        // base
        "group inline-flex size-5 items-center truncate rounded-sm transition",
        disabled
          ? "cursor-not-allowed text-gray-400 dark:text-gray-600"
          : "cursor-pointer text-shark-700 hover:bg-gray-100 hover:text-shark-900 dark:text-gray-300 dark:hover:bg-shark-800 dark:hover:text-gray-50",
      )}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        setIsPressed(true);
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        setIsPressed(false);
      }}
    >
      <FontAwesomeIcon icon={icon} className="size-full" aria-hidden="true" />
    </button>
  );
};

interface LegendProps extends React.OlHTMLAttributes<HTMLOListElement> {
  categories: string[];
  colors?: AvailableChartColorsKeys[];
  onClickLegendItem?: (category: string, color: string) => void;
  activeLegend?: string;
  enableLegendSlider?: boolean;
}

interface HasScrollProps {
  left: boolean;
  right: boolean;
}

const Legend = React.forwardRef<HTMLOListElement, LegendProps>((props, ref) => {
  const {
    categories,
    colors = AvailableChartColors,
    className,
    onClickLegendItem,
    activeLegend,
    enableLegendSlider = false,
    ...other
  } = props;
  const scrollableRef = React.useRef<HTMLInputElement>(null);
  const scrollButtonsRef = React.useRef<HTMLDivElement>(null);
  const [hasScroll, setHasScroll] = React.useState<HasScrollProps | null>(null);
  const [isKeyDowned, setIsKeyDowned] = React.useState<string | null>(null);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const checkScroll = React.useCallback(() => {
    const scrollable = scrollableRef?.current;
    if (!scrollable) return;

    const hasLeftScroll = scrollable.scrollLeft > 0;
    const hasRightScroll = scrollable.scrollWidth - scrollable.clientWidth > scrollable.scrollLeft;

    setHasScroll({ left: hasLeftScroll, right: hasRightScroll });
  }, [setHasScroll]);

  const scrollToTest = React.useCallback(
    (direction: "left" | "right") => {
      const element = scrollableRef?.current;
      const scrollButtons = scrollButtonsRef?.current;
      const scrollButtonsWith = scrollButtons?.clientWidth ?? 0;
      const width = element?.clientWidth ?? 0;

      if (element && enableLegendSlider) {
        element.scrollTo({
          left:
            direction === "left"
              ? element.scrollLeft - width + scrollButtonsWith
              : element.scrollLeft + width - scrollButtonsWith,
          behavior: "smooth",
        });
        setTimeout(() => {
          checkScroll();
        }, 400);
      }
    },
    [enableLegendSlider, checkScroll],
  );

  React.useEffect(() => {
    const keyDownHandler = (key: string) => {
      if (key === "ArrowLeft") {
        scrollToTest("left");
      } else if (key === "ArrowRight") {
        scrollToTest("right");
      }
    };
    if (isKeyDowned) {
      keyDownHandler(isKeyDowned);
      intervalRef.current = setInterval(() => {
        keyDownHandler(isKeyDowned);
      }, 300);
    } else {
      clearInterval(intervalRef.current as NodeJS.Timeout);
    }
    return () => clearInterval(intervalRef.current as NodeJS.Timeout);
  }, [isKeyDowned, scrollToTest]);

  const keyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setIsKeyDowned(e.key);
    }
  };
  const keyUp = (e: KeyboardEvent) => {
    e.stopPropagation();
    setIsKeyDowned(null);
  };

  React.useEffect(() => {
    const scrollable = scrollableRef?.current;
    if (enableLegendSlider) {
      checkScroll();
      scrollable?.addEventListener("keydown", keyDown);
      scrollable?.addEventListener("keyup", keyUp);
    }

    return () => {
      scrollable?.removeEventListener("keydown", keyDown);
      scrollable?.removeEventListener("keyup", keyUp);
    };
  }, [checkScroll, enableLegendSlider]);

  return (
    <ol ref={ref} className={cn("relative overflow-hidden", className)} {...other}>
      <div
        ref={scrollableRef}
        tabIndex={0}
        className={cn(
          "flex h-full",
          enableLegendSlider
            ? hasScroll?.right || hasScroll?.left
              ? "snap-mandatory items-center overflow-auto pr-12 pl-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : ""
            : "flex-wrap",
        )}
      >
        {categories.map((category, index) => (
          <LegendItem
            key={`item-${index}`}
            name={category}
            color={colors[index] as AvailableChartColorsKeys}
            onClick={onClickLegendItem}
            activeLegend={activeLegend}
          />
        ))}
      </div>
      {enableLegendSlider && (hasScroll?.right || hasScroll?.left) ? (
        <>
          <div
            className={cn(
              // base
              "absolute top-0 right-0 bottom-0 flex h-full items-center justify-center pr-1",
              // background color
              "bg-white dark:bg-gray-950",
            )}
          >
            <ScrollButton
              icon={faChevronLeft}
              onClick={() => {
                setIsKeyDowned(null);
                scrollToTest("left");
              }}
              disabled={!hasScroll?.left}
            />
            <ScrollButton
              icon={faChevronRight}
              onClick={() => {
                setIsKeyDowned(null);
                scrollToTest("right");
              }}
              disabled={!hasScroll?.right}
            />
          </div>
        </>
      ) : null}
    </ol>
  );
});

Legend.displayName = "Legend";

const ChartLegend = (
  { payload }: any,
  categoryColors: Map<string, AvailableChartColorsKeys>,
  setLegendHeight: React.Dispatch<React.SetStateAction<number>>,
  activeLegend: string | undefined,
  containerRef: React.RefObject<HTMLDivElement | null>,
  onClick?: (category: string, color: string) => void,
  enableLegendSlider?: boolean,
  legendPosition?: "left" | "center" | "right",
  yAxisWidth?: number,
) => {
  const legendRef = React.useRef<HTMLDivElement>(null);
  // Recalculates off the *outer chart container*'s size (via ResizeObserver, not just
  // `window.resize`), not the legend's own box -- observing the legend's own height would
  // feed back into itself once `legendHeight` changes the space Recharts allots it.
  const [containerWidth] = useWindowSize(containerRef);

  React.useEffect(() => {
    const height = legendRef.current?.clientHeight;
    setLegendHeight(height ? height + 15 : 60);
  }, [containerWidth, setLegendHeight]);

  const filteredPayload = payload.filter((item: any) => item.type !== "none");

  const paddingLeft = legendPosition === "left" && yAxisWidth ? yAxisWidth - 8 : 0;

  return (
    <div
      style={{ paddingLeft: paddingLeft }}
      ref={legendRef}
      className={cn(
        "flex items-center",
        { "justify-center": legendPosition === "center" },
        {
          "justify-start": legendPosition === "left",
        },
        { "justify-end": legendPosition === "right" },
      )}
    >
      <Legend
        categories={filteredPayload.map((entry: any) => entry.value)}
        colors={filteredPayload.map((entry: any) => categoryColors.get(entry.value))}
        onClickLegendItem={onClick}
        activeLegend={activeLegend}
        enableLegendSlider={enableLegendSlider}
      />
    </div>
  );
};

//#region Tooltip

type TooltipProps = Pick<ChartTooltipProps, "active" | "payload" | "label">;

interface PayloadItem {
  category: string;
  value: number;
  index: string;
  color: AvailableChartColorsKeys;
  type?: string;
  payload: any;
}

interface ChartTooltipProps {
  active: boolean | undefined;
  payload: PayloadItem[];
  label: string;
  valueFormatter: (value: number) => string;
}

const ChartTooltip = ({ active, payload, label, valueFormatter }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div
        className={cn(
          // base
          "rounded-md border text-sm shadow-md",
          // border color
          "border-gray-200 dark:border-gray-800",
          // background color
          "bg-white dark:bg-shark-900",
          // CUSTOM: Max height
        )}
      >
        <div className={cn("border-b border-inherit px-4 py-2")}>
          <p
            className={cn(
              // base
              "font-medium",
              // text color
              "text-shark-900 dark:text-gray-50",
            )}
          >
            {label}
          </p>
        </div>
        <div className={cn("grid grid-cols-2 gap-y-1 gap-x-4 px-4 py-2")}>
          {payload.map(({ value, category, color }, index) => (
            <div
              key={`id-${index}`}
              className="flex min-w-0 items-center justify-between space-x-2"
            >
              <div className="flex min-w-0 items-center space-x-2">
                <span
                  aria-hidden="true"
                  className={cn("size-2 shrink-0 rounded-xs", getColorClassName(color, "bg"))}
                />
                <p
                  className={cn(
                    // base
                    "min-w-0 text-right",
                    // text color
                    "text-gray-700 dark:text-gray-300",
                  )}
                >
                  {category}
                </p>
              </div>
              <p
                className={cn(
                  // base
                  "shrink-0 text-right font-medium whitespace-nowrap tabular-nums",
                  // text color
                  "text-shark-900 dark:text-gray-50",
                )}
              >
                {valueFormatter(value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

//#region BarChart

interface BaseEventProps {
  eventType: "category" | "bar";
  categoryClicked: string;
  [key: string]: number | string;
}

type BarChartEventProps = BaseEventProps | null | undefined;

interface BarChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Record<string, any>[];
  index: string;
  categories: string[];
  colors?: AvailableChartColorsKeys[];
  valueFormatter?: (value: number) => string;
  startEndOnly?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGridLines?: boolean;
  yAxisWidth?: number;
  intervalType?: "preserveStartEnd" | "equidistantPreserveStart";
  showTooltip?: boolean;
  showLegend?: boolean;
  autoMinValue?: boolean;
  minValue?: number;
  maxValue?: number;
  allowDecimals?: boolean;
  onValueChange?: (value: BarChartEventProps) => void;
  enableLegendSlider?: boolean;
  tickGap?: number;
  barCategoryGap?: string | number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  layout?: "vertical" | "horizontal";
  type?: "default" | "stacked" | "percent";
  legendPosition?: "left" | "center" | "right";
  tooltipCallback?: (tooltipCallbackContent: TooltipProps) => void;
  customTooltip?: React.ComponentType<TooltipProps>;
}

const BarChart = React.forwardRef<HTMLDivElement, BarChartProps>((props, forwardedRef) => {
  const {
    data = [],
    categories = [],
    index,
    colors = AvailableChartColors,
    valueFormatter = (value: number) => value.toString(),
    startEndOnly = false,
    showXAxis = true,
    showYAxis = true,
    showGridLines = true,
    yAxisWidth = 56,
    intervalType = "equidistantPreserveStart",
    showTooltip = true,
    showLegend = true,
    autoMinValue = false,
    minValue,
    maxValue,
    allowDecimals = true,
    className,
    onValueChange,
    enableLegendSlider = false,
    barCategoryGap,
    tickGap = 5,
    xAxisLabel,
    yAxisLabel,
    layout = "horizontal",
    type = "default",
    legendPosition = "right",
    tooltipCallback,
    customTooltip,
    ...other
  } = props;
  const CustomTooltip = customTooltip;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const setContainerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );
  const paddingValue = (!showXAxis && !showYAxis) || (startEndOnly && !showYAxis) ? 0 : 20;
  const [containerWidth, containerHeight] = useWindowSize(containerRef);
  const [legendHeight, setLegendHeight] = React.useState(60);
  const [activeLegend, setActiveLegend] = React.useState<string | undefined>(undefined);
  const categoryColors = constructCategoryColors(categories, colors);
  const [activeBar, setActiveBar] = React.useState<any | undefined>(undefined);
  const yAxisDomain = getYAxisDomain(autoMinValue, minValue, maxValue);
  const hasOnValueChange = !!onValueChange;
  const stacked = type === "stacked" || type === "percent";

  // A summed "primary value" is only meaningful when categories stack into a single
  // total; grouped/percent bars have no one coherent number to surface.
  const latestRow = type === "stacked" ? data[data.length - 1] : undefined;
  const latestKeyValue = latestRow
    ? categories.reduce((acc, category) => acc + (Number(latestRow[category]) || 0), 0)
    : undefined;

  const prevActiveRef = React.useRef<boolean | undefined>(undefined);
  const prevLabelRef = React.useRef<string | undefined>(undefined);

  // Mirrors the RechartsBarChart `margin` prop below, plus the YAxis's own width (which
  // eats into the plot area whenever it's shown) -- the vertical `layout` variant has no
  // live callers in this codebase (confirmed via a repo-wide grep), so only the default
  // horizontal, category-x-axis case is wired for the drag-to-scan crosshair.
  const { activeIndex } = useChartScrubber(containerRef, {
    length: data.length,
    margin: {
      left: (yAxisLabel ? 20 : 0) + (showYAxis ? yAxisWidth : 0),
      right: yAxisLabel ? 5 : 0,
    },
  });
  const scrubbedLabel =
    layout !== "vertical" && activeIndex != null ? data[activeIndex]?.[index] : undefined;

  function valueToPercent(value: number) {
    return `${(value * 100).toFixed(0)}%`;
  }

  function onBarClick(data: any, _: any, event: React.MouseEvent) {
    event.stopPropagation();
    if (!onValueChange) return;
    if (deepEqual(activeBar, { ...data.payload, value: data.value })) {
      setActiveLegend(undefined);
      setActiveBar(undefined);
      onValueChange?.(null);
    } else {
      setActiveLegend(data.tooltipPayload?.[0]?.dataKey);
      setActiveBar({
        ...data.payload,
        value: data.value,
      });
      onValueChange?.({
        eventType: "bar",
        categoryClicked: data.tooltipPayload?.[0]?.dataKey,
        ...data.payload,
      });
    }
  }

  function onCategoryClick(dataKey: string) {
    if (!hasOnValueChange) return;
    if (dataKey === activeLegend && !activeBar) {
      setActiveLegend(undefined);
      onValueChange?.(null);
    } else {
      setActiveLegend(dataKey);
      onValueChange?.({
        eventType: "category",
        categoryClicked: dataKey,
      });
    }
    setActiveBar(undefined);
  }

  return (
    <div
      ref={setContainerRef}
      className={cn("relative h-64 md:h-full w-full touch-none", className)}
      tremor-id="tremor-raw"
      {...other}
    >
      {latestKeyValue != null && (
        <ChartKeyValue
          label={latestRow?.[index] as string}
          value={valueFormatter(latestKeyValue)}
          className={showLegend && legendPosition === "right" ? "top-8" : undefined}
        />
      )}
      <ResponsiveContainer>
        <RechartsBarChart
          accessibilityLayer
          data={data}
          onClick={
            hasOnValueChange && (activeLegend || activeBar)
              ? () => {
                  setActiveBar(undefined);
                  setActiveLegend(undefined);
                  onValueChange?.(null);
                }
              : undefined
          }
          margin={{
            bottom: xAxisLabel ? 30 : undefined,
            left: yAxisLabel ? 20 : undefined,
            right: yAxisLabel ? 5 : undefined,
            top: 5,
          }}
          stackOffset={type === "percent" ? "expand" : undefined}
          layout={layout}
          barCategoryGap={barCategoryGap}
        >
          {showGridLines ? (
            <CartesianGrid
              className={cn("stroke-gray-200 stroke-1 dark:stroke-gray-800")}
              horizontal={layout !== "vertical"}
              vertical={layout === "vertical"}
            />
          ) : null}
          {scrubbedLabel != null && (
            <ReferenceLine
              x={scrubbedLabel}
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              ifOverflow="extendDomain"
            />
          )}
          <XAxis
            hide={!showXAxis}
            tick={{
              transform: layout !== "vertical" ? "translate(0, 6)" : undefined,
            }}
            className={cn(
              // base
              "text-xs",
              // text fill
              "fill-gray-500 dark:fill-gray-500",
              { "mt-4": layout !== "vertical" },
            )}
            tickLine={false}
            axisLine={false}
            minTickGap={tickGap}
            {...(layout !== "vertical"
              ? {
                  padding: {
                    left: paddingValue,
                    right: paddingValue,
                  },
                  dataKey: index,
                  interval: startEndOnly ? "preserveStartEnd" : intervalType,
                  ticks: startEndOnly ? [data[0][index], data[data.length - 1][index]] : undefined,
                }
              : {
                  type: "number",
                  domain: yAxisDomain as AxisDomain,
                  tickFormatter: type === "percent" ? valueToPercent : valueFormatter,
                  allowDecimals: allowDecimals,
                })}
          >
            {xAxisLabel && (
              <Label
                position="insideBottom"
                offset={-20}
                className="fill-gray-800 text-sm font-medium dark:fill-gray-200"
              >
                {xAxisLabel}
              </Label>
            )}
          </XAxis>
          <YAxis
            width={yAxisWidth}
            hide={!showYAxis}
            axisLine={false}
            tickLine={false}
            className={cn("text-xs", "fill-gray-500 dark:fill-gray-500")}
            tick={{
              transform: layout !== "vertical" ? "translate(-3, 0)" : "translate(0, 0)",
            }}
            {...(layout !== "vertical"
              ? {
                  type: "number",
                  domain: yAxisDomain as AxisDomain,
                  tickFormatter: type === "percent" ? valueToPercent : valueFormatter,
                  allowDecimals: allowDecimals,
                }
              : {
                  dataKey: index,
                  ticks: startEndOnly ? [data[0][index], data[data.length - 1][index]] : undefined,
                  type: "category",
                  interval: "equidistantPreserveStart",
                })}
          >
            {yAxisLabel && (
              <Label
                position="insideLeft"
                style={{ textAnchor: "middle" }}
                angle={-90}
                offset={-15}
                className="fill-gray-800 text-sm font-medium dark:fill-gray-200"
              >
                {yAxisLabel}
              </Label>
            )}
          </YAxis>
          <Tooltip
            wrapperStyle={{
              outline: "none",
              // Anchoring the tooltip to a fixed spot (below) keeps it out of the way of the
              // cursor, but with many stacked categories its content can still be wider than
              // this chart's own box -- cap it to what's actually left so it never spills
              // into whatever is rendered beside this chart (e.g. a sibling pie chart sharing
              // the same card). Capping width forces more rows to wrap, so also cap height to
              // the chart's own box and let the category list scroll instead of overflowing
              // past the bottom of the chart.
              maxWidth:
                layout === "horizontal" && containerWidth
                  ? Math.max(containerWidth - (showYAxis ? yAxisWidth : 0) - 8, 160)
                  : undefined,
              maxHeight:
                layout === "horizontal" && containerHeight
                  ? Math.max(containerHeight - 8, 120)
                  : undefined,
              overflowY: "auto",
            }}
            isAnimationActive={true}
            animationDuration={100}
            cursor={{ fill: "var(--color-shark-400)", opacity: "0.15" }}
            offset={20}
            position={{
              y: layout === "horizontal" ? 0 : undefined,
              x: layout === "horizontal" ? (showYAxis ? yAxisWidth : 0) : yAxisWidth + 20,
            }}
            content={({ active, payload, label }) => {
              const toCleanPayload = (rawPayload: any): TooltipProps["payload"] =>
                rawPayload
                  ? rawPayload.map((item: any) => ({
                      category: item.dataKey,
                      value: item.value,
                      index: item.payload[index],
                      color: categoryColors.get(item.dataKey) as AvailableChartColorsKeys,
                      type: item.type,
                      payload: item.payload,
                    }))
                  : [];

              if (
                tooltipCallback &&
                (active !== prevActiveRef.current || label !== prevLabelRef.current)
              ) {
                tooltipCallback({ active, payload: toCleanPayload(payload), label });
                prevActiveRef.current = active;
                prevLabelRef.current = label;
              }

              if (!showTooltip) return null;

              return (
                <TouchChartTooltip active={active} payload={payload} label={label}>
                  {({ payload: pinnedPayload, label: pinnedLabel }) => {
                    const cleanPayload = toCleanPayload(pinnedPayload);
                    return CustomTooltip ? (
                      <CustomTooltip active={true} payload={cleanPayload} label={pinnedLabel} />
                    ) : (
                      <ChartTooltip
                        active={true}
                        payload={cleanPayload}
                        label={pinnedLabel}
                        valueFormatter={valueFormatter}
                      />
                    );
                  }}
                </TouchChartTooltip>
              );
            }}
          />
          {showLegend ? (
            <RechartsLegend
              verticalAlign="top"
              height={legendHeight}
              content={({ payload }) =>
                ChartLegend(
                  { payload },
                  categoryColors,
                  setLegendHeight,
                  activeLegend,
                  containerRef,
                  hasOnValueChange
                    ? (clickedLegendItem: string) => onCategoryClick(clickedLegendItem)
                    : undefined,
                  enableLegendSlider,
                  legendPosition,
                  yAxisWidth,
                )
              }
            />
          ) : null}
          {categories.map((category) => (
            <Bar
              className={cn(
                getColorClassName(categoryColors.get(category) as AvailableChartColorsKeys, "fill"),
                onValueChange ? "cursor-pointer" : "",
              )}
              key={category}
              name={category}
              type="linear"
              dataKey={category}
              stackId={stacked ? "stack" : undefined}
              isAnimationActive={false}
              shape={(props: any) => renderShape(props, activeBar, activeLegend, layout)}
              onClick={onBarClick}
            />
          ))}
          <RechartsDevtools />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
});

BarChart.displayName = "BarChart";

export { BarChart };
