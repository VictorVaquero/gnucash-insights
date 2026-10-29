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
  toggle: (id: string) => void;
}

// null outside a region: a ChartCard rendered elsewhere simply has no expand button.
const ExpandableRegionContext = createContext<ExpandableRegionContextType | null>(null);

export const useExpandableRegion = () => use(ExpandableRegionContext);

/**
 * A positioned area whose charts can each be expanded to cover the whole area (and only
 * the area — whatever sits outside it stays visible). Escape collapses the expanded chart.
 */
export const ExpandableRegion = (props: { className?: string; children: ReactNode }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggle = useCallback((id: string) => setExpandedId((cur) => (cur === id ? null : id)), []);

  useEffect(() => {
    if (!expandedId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expandedId]);

  const value = useMemo(() => ({ expandedId, toggle }), [expandedId, toggle]);

  return (
    <ExpandableRegionContext value={value}>
      <div className={cn("relative", props.className)}>{props.children}</div>
    </ExpandableRegionContext>
  );
};
