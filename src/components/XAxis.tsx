import * as d3 from "d3";

export const XAxis = (props: {
  width: number;
  range: { x: number[]; y: number[] };
  xScale: d3.ScaleTime<number, number>;
}) => {
  const pathDef = ["M", props.range.x[0], ",", 0, "H", props.range.x[1]].join(
    ""
  );

  return (
    <g
      className="xaxis text-white"
      textAnchor="middle"
      transform={"translate(0," + props.range.y[0] + ")"}
    >
      <path className="domain" stroke="currentColor" d={pathDef}>
        {" "}
      </path>
      {props.xScale.ticks(props.width / 80).map((value) => (
        <g
          className="tick"
          fontSize="10"
          key={props.xScale(value)}
          transform={"translate(" + props.xScale(value) + ",0)"}
        >
          <line className="notch" stroke="currentColor" y2="6"></line>
          <line
            className="cross"
            stroke="currentColor"
            strokeOpacity="0.1"
            y2={-props.range.y[0]}
          ></line>
          <text y="9" dy="0.71em" fill="currentColor">
            {props.xScale.tickFormat()(value)}
          </text>
        </g>
      ))}
    </g>
  );
};
