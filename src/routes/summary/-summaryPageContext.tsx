import { useDomain } from "@/hooks/useDB";
import { useOutliers } from "@/hooks/useOutliers";
import type { DateRange, Periodicity } from "@/types/domain";
import { DateTime } from "luxon";
import {
  ReactNode,
  createContext,
  use,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

// --- Types ---
type AccountId = string;

interface SummaryContextType {
  // Account you want to see
  /** Accounts (with their sub-accounts) the user chose to leave out of every figure. */
  hideAccounts: AccountId[];

  // Dates you want to see
  dateRange: DateRange;
  setDateRange: (dateRange: DateRange) => void;

  // Dates you want to see
  detailedDate: DateTime;
  setDetailedDate: (date: DateTime) => void;

  // Aggregation type
  isYearly: boolean;
  toggleYearly: () => void;

  chartPeriodicity: Periodicity;
  setChartPeriodicity: (value: Periodicity) => void;

  // Deflate past periods to today's purchasing power (real terms) using CPI.
  deflate: boolean;
  toggleDeflate: () => void;
}

// --- Context ---
const SummaryPageContext = createContext<SummaryContextType | null>(null);

// --- Provider ---
export function SummaryPageContextProvider({ children }: { children: ReactNode }) {
  const { accountIds: hideAccounts } = useOutliers();
  const [detailedDate, setDetailedDate] = useState(DateTime.fromISO("2024-01"));
  const [dateRange, setDateRange] = useState<DateRange>({
    from: DateTime.now().minus({ years: 1 }),
    to: DateTime.now(),
  });
  const [isYearly, toggleYearly] = useReducer((v) => !v, false);
  const [chartPeriodicity, setChartPeriodicity] = useState<Periodicity>("monthly");
  const [deflate, toggleDeflate] = useReducer((v) => !v, false);

  // Seed dateRange from the real transaction domain (defaults to "All time")
  // the first time it becomes available, without clobbering later user changes.
  const { from: domainFrom, to: domainTo } = useDomain();
  const hasSeededRange = useRef(false);
  useEffect(() => {
    if (hasSeededRange.current || !domainFrom || !domainTo) return;
    hasSeededRange.current = true;
    setDateRange({ from: domainFrom, to: domainTo });
  }, [domainFrom, domainTo]);

  const value = useMemo(
    () => ({
      hideAccounts,
      detailedDate,
      setDetailedDate,
      dateRange,
      setDateRange,
      isYearly,
      toggleYearly,
      chartPeriodicity,
      setChartPeriodicity,
      deflate,
      toggleDeflate,
    }),
    [hideAccounts, detailedDate, dateRange, isYearly, chartPeriodicity, deflate],
  );

  return <SummaryPageContext value={value}>{children}</SummaryPageContext>;
}

// --- Hook ---
export function useSummaryPageContext() {
  const ctx = use(SummaryPageContext);
  if (!ctx) {
    throw new Error("useSummaryPageContext must be used inside <SummaryPageContextProvider>");
  }
  return ctx;
}
