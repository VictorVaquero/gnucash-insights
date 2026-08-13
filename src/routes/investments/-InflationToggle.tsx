import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useDomain } from "@/hooks/useDB";
import { cn } from "@/lib/utils";
import { useInvestmentsPageContext } from "./-investmentsPageContext";

export const InflationToggle = () => {
  const { t } = useTranslation();
  const { deflate, toggleDeflate } = useInvestmentsPageContext();
  const { latestMonth } = useDomain();
  const year = latestMonth?.year;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={deflate}
      onClick={toggleDeflate}
      title={year != null ? t("investments.deflate.tooltip", { year }) : undefined}
      className={cn(deflate && "bg-accent text-accent-foreground border-ring")}
    >
      {t("investments.deflate.toggle")}
    </Button>
  );
};
