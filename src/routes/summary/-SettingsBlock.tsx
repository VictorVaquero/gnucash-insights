import { MultiSelectTree } from "@/components/accountsDropdown";
import DateRangeSlider from "@/components/dateSlider";
import { accountsOptions } from "@/db/queries/global";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useSummaryPageContext } from "./-summaryPageContext";

export const SettingsBlock = () => {
  const { bookId } = useBook();
  const { db } = useDB();
  const { data: accounts } = useQuery(accountsOptions(db, bookId));
  const { setDateRange, toggleYearly } = useSummaryPageContext();
  const { min, max } = useDomain();

  const options = accounts ?? [];

  return (
    <>
      <MultiSelectTree options={options} />
      <button
        className="inline m-2 p-4 group hover:bg-shark-600 rounded font-light text-white group-hover:text-white"
        onClick={toggleYearly}
      >
        <span className="">Yearly/Monthly</span>
      </button>
      <DateRangeSlider
        start={min?.toString() ?? "2021-03-01"}
        end={max?.toString() ?? DateTime.now().toString()}
        onChange={setDateRange}
      />
    </>
  );
};
