import { useTranslation } from "react-i18next";

import { formatCurrency } from "@/common/utils.ts";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/useLocale";

// The "Analyzing" indicator: makes the checkbox-selection narrowing mechanic (which subset of
// the filtered rows currently feeds the chart/KPIs above the table) visible and reversible,
// instead of a silent, easy-to-forget state.
export const SelectionBar = (props: {
  selectedCount: number;
  totalCount: number;
  sum: number;
  showClear: boolean;
  onClear: () => void;
}) => {
  const { selectedCount, totalCount, sum, showClear, onClear } = props;
  const { t } = useTranslation();
  const { locale } = useLocale();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm">
      <span className="font-medium text-foreground">
        {t("analysis.chart.analyzing", { count: selectedCount, total: totalCount })}
      </span>
      <span className="text-muted-foreground">
        {t("analysis.selection.sum", { amount: formatCurrency(sum, locale, { compact: true }) })}
      </span>
      {showClear && (
        <Button type="button" variant="ghost" size="sm" onClick={onClear} className="ml-auto">
          {t("analysis.chart.resetSelection")}
        </Button>
      )}
    </div>
  );
};
