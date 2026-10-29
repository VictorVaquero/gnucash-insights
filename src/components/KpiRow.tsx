import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const KpiRow = (props: {
  name: string;
  value: string | number;
  title?: string;
  color?: string;
  delta?: ReactNode;
  /** A part of the row above it: indented and set in a lighter weight. */
  indent?: boolean;
  /** A total the indented rows below add up to. */
  emphasis?: boolean;
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-1.5 border-b border-border/60 last:border-b-0",
        props.indent && "pl-4 border-l-2 border-l-border",
      )}
      title={props.title}
    >
      <span
        className={cn(
          "text-sm truncate",
          props.emphasis ? "font-semibold text-foreground" : "text-muted-foreground",
          props.indent && "text-xs",
        )}
      >
        {props.name}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {props.delta}
        <span
          className={cn(
            "text-sm tabular-nums",
            props.emphasis ? "font-semibold" : "font-medium",
            props.indent && "text-xs font-normal",
            props.color ?? "text-foreground",
          )}
        >
          {props.value}
        </span>
      </div>
    </div>
  );
};
