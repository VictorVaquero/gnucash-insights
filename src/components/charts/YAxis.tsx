import * as d3 from "d3";

export const YAxis = (props: {
  height: number;
  range: { x: number[]; y: number[] };
  scale: d3.ScaleLinear<number, number>;
}) => {
  const tickNumber = props.height < 300 ? 8 : 10;
  const tickHighlight = props.height < 300 ? 2 : 5;

  return (
    <g
      className="yaxis text-gray-500"
      textAnchor="end"
      transform={`translate(${props.range.x[0]},0)`}
    >
      {props.scale.ticks(tickNumber).map((value, i) => {
        // Determine if this specific tick should be highlighted
        const isMajor = i % tickHighlight === 0;

        return (
          <g
            className={`tick ${isMajor ? "tick-major" : "tick-minor"}`}
            key={props.scale(value)}
            transform={`translate(0,${props.scale(value)})`}
          >
            {/* The small notch: longer for major ticks */}
            <line
              className="notch"
              stroke="currentColor"
              x2={isMajor ? "10" : "6"}
              strokeWidth={isMajor ? 2 : 1}
            />

            {/* The grid line (cross): darker/thicker for major ticks */}
            <line
              className="cross"
              stroke="currentColor"
              strokeOpacity={isMajor ? "0.25" : "0.1"}
              strokeWidth={isMajor ? 1.5 : 1}
              x2={props.range.x[1]}
            />

            {/* The label: bold for major ticks */}
            <text
              x="-12"
              dy="0.32em"
              fill="currentColor"
              fontSize={isMajor ? "10" : "10"}
              fontWeight={isMajor ? "bold" : "normal"}
            >
              {props.scale.tickFormat()(value)}
            </text>
          </g>
        );
      })}
    </g>
  );
};
