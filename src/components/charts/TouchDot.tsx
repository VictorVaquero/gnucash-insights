// Touch hit-area radius (chart-component-contract's Touch interaction section, doc 14
// item 4): 44px diameter minimum, independent of the dot's drawn/visible radius.
const TOUCH_HIT_RADIUS = 22;

interface DotLikeProps {
  cx?: number;
  cy?: number;
  fill?: string;
  stroke?: string;
}

/**
 * Builds a Recharts `dot`/`activeDot` render function: a small visible circle plus an
 * invisible, larger circle sized for touch, both centered on the same point.
 */
export function renderTouchDot(
  color: string,
  visibleRadius = 3,
  options: { stroke?: string; strokeWidth?: number } = {},
) {
  const { stroke = color, strokeWidth = 0 } = options;
  return ({ cx, cy }: DotLikeProps) => {
    if (cx == null || cy == null) return <g />;
    return (
      <g>
        <circle cx={cx} cy={cy} r={TOUCH_HIT_RADIUS} fill="transparent" pointerEvents="all" />
        <circle
          cx={cx}
          cy={cy}
          r={visibleRadius}
          fill={color}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </g>
    );
  };
}
