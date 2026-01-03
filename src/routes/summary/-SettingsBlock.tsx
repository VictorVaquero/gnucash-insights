import { PeriodicityTabs } from "@/components/PeriodicityTabs";
import { MultiSelectTree } from "@/components/accountsDropdown";
import DateRangeSlider from "@/components/dateSlider";
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
  const { min, max } = useDomain();

  const options = accounts ?? [];

  return (
    <>
      <div className="flex flex-row items-center">
        <MultiSelectTree options={options} />
        <PeriodicityTabs activeMode={chartMode} onChange={setChartMode} />
      </div>
      <DateRangeSlider
        start={min?.toString() ?? "2021-03-01"}
        end={max?.toString() ?? DateTime.now().toString()}
        onChange={setDateRange}
      />
    </>
  );
};
