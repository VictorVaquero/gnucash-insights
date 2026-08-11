import type { ReactNode } from "react";

export const KpiCard = (props: {
  name: string;
  value: string | number;
  title?: string;
  color?: string;
  delta?: ReactNode;
}) => {
  return (
    <div className="p-6 pt-2.5 bg-secondary rounded" title={props.title}>
      <span className="block text-muted-foreground">{props.name}</span>
      <div className="mt-2 flex flex-col items-center gap-1">
        <span className={"text-xl " + (props.color ? props.color : "text-secondary-foreground")}>
          {props.value}
        </span>
        {props.delta}
      </div>
    </div>
  );
};
