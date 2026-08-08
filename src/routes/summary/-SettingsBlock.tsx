import { DateRangeSlider } from "@/components/DateSlider";
import { PeriodicityTabs } from "@/components/PeriodicityTabs";
import { MultiSelectTree } from "@/components/features/AccountsDropdown";
import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useSummaryPageContext } from "./-summaryPageContext";

export const SettingsBlock = () => {
  const { bookId } = useBook();
  const { db } = useDB();
  const { user } = useAuth();
  const dbconf = getConfig(user);
  const { data: accounts } = useQuery(
    accountsOptions({ db, bookId, accountIds: [dbconf.expenses] })
  );

  const {
    setDateRange,
    chartPeriodicity: chartMode,
    setChartPeriodicity: setChartMode,
  } = useSummaryPageContext();
  const {  from, to } = useDomain();

  const options = accounts ?? [];

  return (
    <>
      <div className="flex flex-row flex-wrap items-center gap-2">
        <MultiSelectTree options={options} />
        <PeriodicityTabs activeMode={chartMode} onChange={setChartMode} />
      </div>
      <DateRangeSlider
        start={from?.toString() ?? "2021-03-01"}
        end={to?.toString() ?? DateTime.now().toString()}
        onChange={setDateRange}
      />
    </>
  );
};
