import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

interface ExpandableRegionContextType {
  expandedId: string | null;
  hideOthers: boolean;
  toggle: (id: string) => void;
}

// null outside a region: a ChartCard rendered elsewhere simply has no expand button.
const ExpandableRegionContext = createContext<ExpandableRegionContextType | null>(null);

export const useExpandableRegion = () => use(ExpandableRegionContext);

/**
 * A group of charts that can each be expanded *within the page layout*: the expanded chart
 * takes the room its own `expandedClassName` asks for (more columns, rows or height) and the
 * rest of the page flows around it, so it never ends up larger than the page. What changes
 * for the others is set per region: with `hideOthers` the siblings step aside; otherwise they
 * just move. `expandedClassName` here resizes the region itself (e.g. a taller row).
 * Escape collapses the expanded chart.
 */
export const ExpandableRegion = (props: {
  className?: string;
  /** Applied to the region while one of its charts is expanded. */
  expandedClassName?: string;
  /** Hide the region's other charts while one is expanded. */
  hideOthers?: boolean;
  children: ReactNode;
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggle = useCallback((id: string) => setExpandedId((cur) => (cur === id ? null : id)), []);
  const hideOthers = props.hideOthers ?? false;

  useEffect(() => {
    if (!expandedId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expandedId]);

  const value = useMemo(
    () => ({ expandedId, hideOthers, toggle }),
    [expandedId, hideOthers, toggle],
  );

  return (
    <ExpandableRegionContext value={value}>
      <div className={cn(props.className, expandedId && props.expandedClassName)}>
        {props.children}
      </div>
    </ExpandableRegionContext>
  );
};
