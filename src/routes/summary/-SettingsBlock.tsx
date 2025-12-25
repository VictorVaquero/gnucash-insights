import { MultiSelectTree } from "@/components/accountsDropdown";
import DateRangeSlider from "@/components/dateSlider";
import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useSummaryPageContext, CharMode } from "./-summaryPageContext";

export const SettingsBlock = () => {
  const { bookId } = useBook();
  const { db } = useDB();
  const { user } = useAuth();
  const dbconf = getConfig(user);
  const { data: accounts } = useQuery(
    accountsOptions(db, bookId, [dbconf.expenses])
  );
  const { setDateRange, charMode, setChartMode } = useSummaryPageContext();
  const { min, max } = useDomain();

  const options = accounts ?? [];

  return (
    <>
      <div className="flex flex-row items-center">
      <MultiSelectTree options={options} />
      <div className="flex bg-shark-900 p-1 rounded-lg ">
        {(['monthly', 'quarterly', 'yearly'] as CharMode[]).map((option) => (
          <button
            key={option}
            className={`
              px-4 py-2 rounded capitalize font-light transition-all duration-10
              ${charMode === option 
                ? 'bg-shark-600 text-white shadow-sm' 
                : 'text-shark-300 hover:text-white hover:bg-shark-800'
              }
            `}
            onClick={() => setChartMode(option)}
          >
            {option}
          </button>
        ))}
      </div>

      </div>
      <DateRangeSlider
        start={min?.toString() ?? "2021-03-01"}
        end={max?.toString() ?? DateTime.now().toString()}
        onChange={setDateRange}
      />
    </>
  );
};
