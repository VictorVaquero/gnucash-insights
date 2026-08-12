import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Periodicity } from "@/types/domain";

const PERIODICITY_OPTIONS: Periodicity[] = ["monthly", "quarterly", "yearly"];

const PeriodicityTabButton = ({
  option,
  activeMode,
  onChange,
}: {
  option: Periodicity;
  activeMode: Periodicity;
  onChange: (mode: Periodicity) => void;
}) => {
  const { t } = useTranslation();
  const handleClick = useCallback(() => onChange(option), [onChange, option]);
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "px-4 py-2 rounded capitalize font-light transition-all duration-200",
        activeMode === option
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
      )}
    >
      {t(`common.periodicity.${option}`)}
    </button>
  );
};

export const PeriodicityTabs = ({
  activeMode,
  onChange,
}: {
  activeMode: Periodicity;
  onChange: (mode: Periodicity) => void;
}) => {
  return (
    <div className="flex bg-muted p-1 rounded-lg w-fit">
      {PERIODICITY_OPTIONS.map((option) => (
        <PeriodicityTabButton
          key={option}
          option={option}
          activeMode={activeMode}
          onChange={onChange}
        />
      ))}
    </div>
  );
};
