import { PeriodicityTabs } from "@/components/PeriodicityTabs";
import { Card, CardContent } from "@/components/ui/card";
import { MultiSelectTree } from "@/components/features/AccountsDropdown";
import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useQuery } from "@tanstack/react-query";
import { DateRangePresets } from "./-DateRangePresets";
import { useSummaryPageContext } from "./-summaryPageContext";

export const SettingsBlock = () => {
  const { bookId } = useBook();
  const { db } = useDB();
  const { user } = useAuth();
  const dbconf = getConfig(user);
  const { data: accounts } = useQuery(
    accountsOptions({ db, bookId, accountIds: [dbconf.expenses] }),
  );

  const {
    dateRange,
    setDateRange,
    chartPeriodicity: chartMode,
    setChartPeriodicity: setChartMode,
  } = useSummaryPageContext();
  const { from, to } = useDomain();

  const options = accounts ?? [];

  return (
    <Card>
      <CardContent className="flex flex-row flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex flex-row flex-wrap items-center gap-2">
          <PeriodicityTabs activeMode={chartMode} onChange={setChartMode} />
          <MultiSelectTree options={options} />
        </div>
        {from && to && (
          <DateRangePresets
            domainFrom={from}
            domainTo={to}
            dateRange={dateRange}
            onChange={setDateRange}
          />
        )}
      </CardContent>
    </Card>
  );
};
