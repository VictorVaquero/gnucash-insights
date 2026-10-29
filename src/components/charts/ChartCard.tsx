import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
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

const SCREEN_MARGIN = 12;
const DESKTOP_MIN_WIDTH = 768;

// The region's on-screen rectangle clipped to the viewport, so an expanded chart is as large
// as its region but never taller or wider than what can be seen. Narrow screens use a plain
// full-screen overlay instead (no box).
const visibleBox = (rect: DOMRect | undefined): CSSProperties | undefined => {
  if (!rect || window.innerWidth < DESKTOP_MIN_WIDTH) return undefined;
  const top = Math.max(rect.top, SCREEN_MARGIN);
  const bottom = Math.min(rect.bottom, window.innerHeight - SCREEN_MARGIN);
  const left = Math.max(rect.left, SCREEN_MARGIN);
  const right = Math.min(rect.right, window.innerWidth - SCREEN_MARGIN);
  return { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
};

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
  const [box, setBox] = useState<CSSProperties>();
  const getRect = region?.getRect;
  const toggle = () => {
    if (!region) return;
    if (!isExpanded) {
      setHeldHeight(wrapperRef.current?.offsetHeight);
      setBox(visibleBox(getRect?.()));
    }
    region.toggle(id);
  };

  // Follow the region while the page scrolls or resizes under an expanded chart.
  useEffect(() => {
    if (!isExpanded || !getRect) return;
    const update = () => setBox(visibleBox(getRect()));
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isExpanded, getRect]);

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
          isExpanded && "fixed inset-3 z-50 h-auto shadow-xl md:inset-auto",
        )}
        style={isExpanded ? box : undefined}
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
