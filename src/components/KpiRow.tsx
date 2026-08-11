import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const KpiRow = (props: {
  name: string;
  value: string | number;
  title?: string;
  color?: string;
  delta?: ReactNode;
}) => {
  return (
    <div
      className="flex items-center justify-between gap-3 py-1.5 border-b border-border/60 last:border-b-0"
      title={props.title}
    >
      <span className="text-sm text-muted-foreground truncate">{props.name}</span>
      <div className="flex items-center gap-2 shrink-0">
        {props.delta}
        <span className={cn("text-sm font-medium tabular-nums", props.color ?? "text-foreground")}>
          {props.value}
        </span>
      </div>
    </div>
  );
};
