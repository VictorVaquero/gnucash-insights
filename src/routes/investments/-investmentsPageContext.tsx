import { ReactNode, createContext, use, useMemo, useReducer, useState } from "react";

interface InvestmentsContextType {
  // Deflate past periods to today's purchasing power (real terms) using CPI.
  deflate: boolean;
  toggleDeflate: () => void;

  // Which holding's detail view is open, if any.
  selectedHoldingId: string | null;
  selectHolding: (accountId: string) => void;
  clearSelectedHolding: () => void;
}

const InvestmentsPageContext = createContext<InvestmentsContextType | null>(null);

export function InvestmentsPageContextProvider({ children }: { children: ReactNode }) {
  const [deflate, toggleDeflate] = useReducer((v) => !v, false);
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      deflate,
      toggleDeflate,
      selectedHoldingId,
      selectHolding: setSelectedHoldingId,
      clearSelectedHolding: () => setSelectedHoldingId(null),
    }),
    [deflate, selectedHoldingId],
  );

  return <InvestmentsPageContext value={value}>{children}</InvestmentsPageContext>;
}

export function useInvestmentsPageContext() {
  const ctx = use(InvestmentsPageContext);
  if (!ctx) {
    throw new Error(
      "useInvestmentsPageContext must be used inside <InvestmentsPageContextProvider>",
    );
  }
  return ctx;
}
