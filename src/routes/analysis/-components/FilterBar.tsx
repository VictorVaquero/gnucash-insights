import { faDownload, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DateTime } from "luxon";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { DateRangePresets } from "@/routes/summary/-DateRangePresets";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SEARCH_FIELDS, type SearchField } from "@/common/search";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/types/domain";
import type { AnalysisFilters, TransactionTypeFilter } from "./useAnalysisFilters";

interface QuickChip {
  id: string;
  labelKey: string;
  apply: { type: TransactionTypeFilter; search: string };
}

// `trips`'s search term is the account's configured trip-note prefix (the same one the
// /travels page uses to identify trip transactions), not a hardcoded guess -- otherwise the
// chip silently matches nothing whenever an account's note convention differs.
const buildQuickChips = (tripDesc: string): QuickChip[] => [
  { id: "expenses", labelKey: "analysis.filters.expenses", apply: { type: "EXPENSE", search: "" } },
  {
    id: "tobacco",
    labelKey: "analysis.filters.tobacco",
    apply: { type: "EXPENSE", search: "Tabaco" },
  },
  { id: "trips", labelKey: "analysis.filters.trips", apply: { type: "EXPENSE", search: tripDesc } },
  {
    id: "sport",
    labelKey: "analysis.filters.sport",
    apply: { type: "EXPENSE", search: "Escalada" },
  },
];

const TYPE_OPTIONS: { value: TransactionTypeFilter; labelKey: string }[] = [
  { value: "all", labelKey: "analysis.filters.typeAll" },
  { value: "EXPENSE", labelKey: "analysis.filters.typeExpense" },
  { value: "INCOME", labelKey: "analysis.filters.typeIncome" },
];

const chipClass = (active: boolean) =>
  cn(
    "text-xs px-3 py-1.5 rounded-full border transition-colors font-medium",
    active
      ? "bg-brand/10 text-brand border-brand"
      : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground",
  );

const TypeToggle = (props: {
  type: TransactionTypeFilter;
  onChange: (v: TransactionTypeFilter) => void;
}) => {
  const { t } = useTranslation();
  const options = TYPE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }));
  return (
    <SegmentedControl
      label={t("analysis.filters.typeLabel")}
      value={props.type}
      options={options}
      onChange={props.onChange}
    />
  );
};

const QuickChipButton = (props: {
  chip: QuickChip;
  active: boolean;
  onClick: (chip: QuickChip) => void;
}) => {
  const { chip, active, onClick } = props;
  const { t } = useTranslation();
  const handleClick = useCallback(() => onClick(chip), [onClick, chip]);
  return (
    <button type="button" onClick={handleClick} className={chipClass(active)}>
      {t(chip.labelKey)}
    </button>
  );
};

export const FilterBar = (props: {
  filters: AnalysisFilters;
  onChange: (updater: (prev: AnalysisFilters) => AnalysisFilters) => void;
  domainFrom: DateTime;
  domainTo: DateTime;
  onExport: () => void;
  tripDesc: string;
}) => {
  const { filters, onChange, domainFrom, domainTo, onExport, tripDesc } = props;
  const { t } = useTranslation();
  const quickChips = buildQuickChips(tripDesc);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onChange((prev) => ({ ...prev, search: value }));
    },
    [onChange],
  );

  const handleFieldChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const field = e.target.value as SearchField;
      onChange((prev) => ({ ...prev, field }));
    },
    [onChange],
  );

  const handleTypeChange = useCallback(
    (type: TransactionTypeFilter) => onChange((prev) => ({ ...prev, type })),
    [onChange],
  );

  const handleRangeChange = useCallback(
    (range: DateRange) => onChange((prev) => ({ ...prev, range })),
    [onChange],
  );

  const handleChipClick = useCallback(
    (chip: QuickChip) => {
      onChange((prev) => {
        const isActive = prev.type === chip.apply.type && prev.search === chip.apply.search;
        return isActive
          ? { ...prev, type: "all", search: "", field: "all" }
          : { ...prev, ...chip.apply, field: "all" };
      });
    },
    [onChange],
  );

  const dateRange: DateRange = filters.range ?? { from: domainFrom, to: domainTo };

  return (
    <div className="rounded-lg border border-border p-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5"
          />
          <label htmlFor="analysis-search" className="sr-only">
            {t("analysis.filters.searchLabel")}
          </label>
          <input
            id="analysis-search"
            type="search"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder={t("analysis.filters.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus-visible:outline focus-visible:outline-ring focus-visible:outline-1"
          />
        </div>
        <select
          aria-label={t("analysis.filters.searchScope")}
          value={filters.field}
          onChange={handleFieldChange}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        >
          {SEARCH_FIELDS.map((f) => (
            <option key={f} value={f}>
              {t(`analysis.filters.fields.${f}`)}
            </option>
          ))}
        </select>
        <TypeToggle type={filters.type} onChange={handleTypeChange} />
        <DateRangePresets
          domainFrom={domainFrom}
          domainTo={domainTo}
          dateRange={dateRange}
          onChange={handleRangeChange}
        />
        <Button type="button" variant="outline" size="sm" onClick={onExport} className="ml-auto">
          <FontAwesomeIcon icon={faDownload} />
          {t("analysis.filters.export")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("analysis.filters.searchHelp")}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {quickChips.map((chip) => (
          <QuickChipButton
            key={chip.id}
            chip={chip}
            active={filters.type === chip.apply.type && filters.search === chip.apply.search}
            onClick={handleChipClick}
          />
        ))}
      </div>
    </div>
  );
};
