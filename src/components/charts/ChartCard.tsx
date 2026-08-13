import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const ChartCard = (props: {
  title: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) => {
  return (
    <Card className={cn("flex flex-col md:h-full md:min-h-0 overflow-hidden", props.className)}>
      <CardHeader className={cn(props.hint && "items-baseline gap-3")}>
        <CardTitle>{props.title}</CardTitle>
        {props.hint && (
          <span className="text-xs text-muted-foreground text-right shrink-0 hidden sm:block">
            {props.hint}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex-1 min-h-64 min-w-0 md:min-h-0 overflow-hidden">
        {props.children}
      </CardContent>
    </Card>
  );
};
