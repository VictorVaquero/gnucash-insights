import { getRouteApi } from "@tanstack/react-router";
import { ColumnFiltersState, Updater } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";

const deserialize = (searchParams: Record<string, unknown> = {}): ColumnFiltersState => {
  return Object.entries(searchParams).map(([k, v]) => ({ id: k, value: v }));
};

const serialize = (filters: ColumnFiltersState): Record<string, string> => {
  return Object.fromEntries(filters.map((x) => [String(x.id), String(x.value)]));
};

export function useColumnFilters(delay = 400) {
  const routeApi = getRouteApi("/analysis/");
  const { query } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  // 1. URL state (The ultimate truth)
  const urlFilters = useMemo(() => deserialize(query as Record<string, unknown>), [query]);

  // 2. Local state (The "snappy" truth for immediate rendering)
  const [localFilters, setLocalFilters] = useState<ColumnFiltersState>(urlFilters);

  // 3. Sync Local state if URL changes (e.g., browser back button or reset). Adjusted during
  // render (rather than in an effect) per React's guidance on resetting state when a prop
  // changes, so it takes effect in the same render pass as the URL change.
  const [prevUrlFilters, setPrevUrlFilters] = useState(urlFilters);
  if (urlFilters !== prevUrlFilters) {
    setPrevUrlFilters(urlFilters);
    setLocalFilters(urlFilters);
  }

  // 4. Debounce Local state -> URL
  useEffect(() => {
    const handler = setTimeout(() => {
      // Only navigate if the local state actually differs from URL to prevent infinite loops
      if (JSON.stringify(localFilters) !== JSON.stringify(urlFilters)) {
        navigate({
          search: (prev: Record<string, unknown>) => ({
            ...prev,
            query: serialize(localFilters),
          }),
          replace: true,
        });
      }
    }, delay);

    return () => clearTimeout(handler);
  }, [localFilters, navigate, delay, urlFilters]);

  // 5. Intercept the Table's setColumnFilters
  const setColumnFilters = useCallback((updater: Updater<ColumnFiltersState>) => {
    setLocalFilters((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  return {
    columnFilters: localFilters, // Table sees local state for 0ms lag
    setColumnFilters,
  };
}
