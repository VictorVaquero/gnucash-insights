import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const ChartCard = (props: { title: string; className?: string; children: ReactNode }) => {
  return (
    <Card className={cn("flex flex-col md:h-full md:min-h-0 overflow-hidden", props.className)}>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-64 min-w-0 md:min-h-0 overflow-hidden">
        {props.children}
      </CardContent>
    </Card>
  );
};
