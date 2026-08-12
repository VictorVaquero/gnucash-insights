import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useDomain } from "@/hooks/useDB";
import { cn } from "@/lib/utils";
import { useSummaryPageContext } from "./-summaryPageContext";

export const DeflateToggle = () => {
  const { t } = useTranslation();
  const { deflate, toggleDeflate } = useSummaryPageContext();
  const { latestMonth } = useDomain();
  const year = latestMonth?.year;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={deflate}
      onClick={toggleDeflate}
      title={year != null ? t("summary.deflate.tooltip", { year }) : undefined}
      className={cn(deflate && "bg-accent text-accent-foreground border-ring")}
    >
      {t("summary.deflate.toggle")}
    </Button>
  );
};
