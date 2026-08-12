import { getRouteApi } from "@tanstack/react-router";
import { DateTime } from "luxon";
import { useEffect, useMemo, useState } from "react";

import type { DateRange } from "@/types/domain";

export type TransactionTypeFilter = "all" | "EXPENSE" | "INCOME";

export interface AnalysisFilters {
  search: string;
  type: TransactionTypeFilter;
  // `null` means "no explicit range" -- the caller falls back to the full domain.
  range: DateRange | null;
}

export interface AnalysisSearchParams {
  q?: string;
  type?: TransactionTypeFilter;
  from?: string;
  to?: string;
}

const routeApi = getRouteApi("/analysis/");

const deserialize = (search: AnalysisSearchParams): AnalysisFilters => ({
  search: search.q ?? "",
  type: search.type ?? "all",
  range:
    search.from && search.to
      ? { from: DateTime.fromISO(search.from), to: DateTime.fromISO(search.to) }
      : null,
});

const serialize = (filters: AnalysisFilters): AnalysisSearchParams => ({
  q: filters.search || undefined,
  type: filters.type !== "all" ? filters.type : undefined,
  from: filters.range ? (filters.range.from.toISODate() ?? undefined) : undefined,
  to: filters.range ? (filters.range.to.toISODate() ?? undefined) : undefined,
});

// Same URL-synced debounce pattern as the table's former useColumnFilters: local state for
// snappy typing/dragging, with a render-time reset-on-URL-change (browser back/forward) and a
// debounced push to the router's search params.
export function useAnalysisFilters(delay = 400) {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const urlFilters = useMemo(() => deserialize(search), [search]);
  const [localFilters, setLocalFilters] = useState<AnalysisFilters>(urlFilters);

  const [prevUrlFilters, setPrevUrlFilters] = useState(urlFilters);
  if (urlFilters !== prevUrlFilters) {
    setPrevUrlFilters(urlFilters);
    setLocalFilters(urlFilters);
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      if (JSON.stringify(localFilters) !== JSON.stringify(urlFilters)) {
        navigate({
          search: (prev: AnalysisSearchParams) => ({ ...prev, ...serialize(localFilters) }),
          replace: true,
        });
      }
    }, delay);

    return () => clearTimeout(handler);
  }, [localFilters, navigate, delay, urlFilters]);

  return { filters: localFilters, setFilters: setLocalFilters };
}
