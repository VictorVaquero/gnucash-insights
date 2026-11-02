import { useId } from "react";

import { cn } from "@/lib/utils";

/** Tiny dependency-free trend line. Decorative: the numbers next to it carry the meaning. */
export const Sparkline = (props: {
  values: number[];
  className?: string;
  /** Any CSS color; defaults to the brand color. */
  color?: string;
  width?: number;
  height?: number;
  /** Draw a soft area under the line. */
  area?: boolean;
}) => {
  const { values, color = "var(--brand)", width = 80, height = 24, area = false } = props;
  const gradientId = useId();
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" />;

  const pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M${points.join("L")}`;
  const last = values.length - 1;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0 overflow-visible", props.className)}
      aria-hidden="true"
    >
      {area && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d={`${line}L${x(last).toFixed(1)},${height}L${x(0).toFixed(1)},${height}Z`}
            fill={`url(#${gradientId})`}
          />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(last)} cy={y(values[last])} r={2} fill={color} />
    </svg>
  );
};
