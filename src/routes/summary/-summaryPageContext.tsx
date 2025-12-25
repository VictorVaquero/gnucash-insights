import { DateTime } from "luxon";
import { ReactNode, createContext, use, useReducer, useState } from "react";

// --- Types ---
type AccountId = string;
interface DateRange {
  from: DateTime<boolean>;
  to: DateTime<boolean>;
}
export type ChartPeriodicity = "monthly" | "quarterly" | "yearly";

interface SummaryContextType {
  // Account you want to see
  hideAccounts: AccountId[];
  toggleHideAccount: (accountId: AccountId) => void;

  // Dates you want to see
  dateRange: DateRange;
  setDateRange: (dateRange: DateRange) => void;

  // Dates you want to see
  detailedDate: DateTime;
  setDetailedDate: (date: DateTime) => void;

  // Aggregation type
  isYearly: boolean;
  toggleYearly: () => void;

  chartPeriodicity: ChartPeriodicity;
  setChartPeriodicity: (value: ChartPeriodicity) => void;
}

// --- Context ---
const SummaryPageContext = createContext<SummaryContextType | null>(null);

// --- Reducer ---
function hideAccountsReducer(
  state: AccountId[],
  account: AccountId
): AccountId[] {
  return state.includes(account)
    ? state.filter((a) => a !== account)
    : [...state, account];
}

// --- Provider ---
export function SummaryPageContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [hideAccounts, toggleHideAccount] = useReducer(hideAccountsReducer, [
    "8435fd4bfa974eaf89d1e91576470074", // Furgo account ID
  ]);
  const [detailedDate, setDetailedDate] = useState(DateTime.fromISO("2024-01"));
  const [dateRange, setDateRange] = useState<DateRange>({
    from: DateTime.fromISO("2021-04"),
    to: DateTime.now(),
  });
  const [isYearly, toggleYearly] = useReducer((v) => !v, false);
  const [chartPeriodicity, setChartPeriodicity] =
    useState<ChartPeriodicity>("monthly");

  return (
    <SummaryPageContext
      value={{
        hideAccounts,
        toggleHideAccount,
        detailedDate,
        setDetailedDate,
        dateRange,
        setDateRange,
        isYearly,
        toggleYearly,
        chartPeriodicity,
        setChartPeriodicity,
      }}
    >
      {children}
    </SummaryPageContext>
  );
}

// --- Hook ---
export function useSummaryPageContext() {
  const ctx = use(SummaryPageContext);
  if (!ctx) {
    throw new Error(
      "useSummaryPageContext must be used inside <SummaryPageContextProvider>"
    );
  }
  return ctx;
}
