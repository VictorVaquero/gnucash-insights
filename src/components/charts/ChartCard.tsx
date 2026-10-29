import { useId, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useExpandableRegion } from "@/components/charts/ExpandableRegion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ExpandIcon = (props: { expanded: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
    aria-hidden="true"
  >
    {props.expanded ? (
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    ) : (
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    )}
  </svg>
);

export const ChartCard = (props: {
  title: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) => {
  const { t } = useTranslation();
  const id = useId();
  const region = useExpandableRegion();
  const isExpanded = region?.expandedId === id;

  // The expanded card leaves the layout (absolute), so the wrapper keeps the size it had,
  // which stops the neighbouring cards from jumping while it is open.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [heldHeight, setHeldHeight] = useState<number>();
  const toggle = () => {
    if (!region) return;
    if (!isExpanded) setHeldHeight(wrapperRef.current?.offsetHeight);
    region.toggle(id);
  };

  const label = isExpanded
    ? t("common.collapseChart", { title: props.title })
    : t("common.expandChart", { title: props.title });

  return (
    <div
      ref={wrapperRef}
      className={cn("md:h-full md:min-h-0 min-w-0", props.className)}
      style={isExpanded ? { minHeight: heldHeight } : undefined}
    >
      <Card
        className={cn(
          "flex flex-col h-full md:min-h-0 overflow-hidden bg-background",
          isExpanded && "fixed inset-3 z-50 h-auto shadow-xl md:absolute md:inset-0 md:z-20",
        )}
      >
        <CardHeader className={cn(props.hint && "items-baseline gap-3")}>
          <CardTitle>{props.title}</CardTitle>
          <div className="flex items-baseline gap-3">
            {props.hint && (
              <span className="text-xs text-muted-foreground text-right shrink-0 hidden sm:block">
                {props.hint}
              </span>
            )}
            {region && (
              <button
                type="button"
                onClick={toggle}
                aria-label={label}
                aria-pressed={isExpanded}
                title={label}
                className="self-center text-muted-foreground hover:text-foreground"
              >
                <ExpandIcon expanded={isExpanded} />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-64 min-w-0 md:min-h-0 overflow-hidden">
          {props.children}
        </CardContent>
      </Card>
    </div>
  );
};
