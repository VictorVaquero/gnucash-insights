import { useState, type ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const CollapsibleSection = (props: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) => {
  const [open, setOpen] = useState(props.defaultOpen ?? true);

  return (
    <Card className={cn(props.className)}>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? `Collapse ${props.title}` : `Expand ${props.title}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={cn("size-4 transition-transform", open && "rotate-180")}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </CardHeader>
      {open && <CardContent className="flex flex-col gap-4">{props.children}</CardContent>}
    </Card>
  );
};
