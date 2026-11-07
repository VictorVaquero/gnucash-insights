import { useTranslation } from "react-i18next";

import { SegmentedControl } from "@/components/SegmentedControl";
import { Periodicity } from "@/types/domain";

const DEFAULT_OPTIONS: Periodicity[] = ["monthly", "quarterly", "yearly"];

/** Switch between aggregation periods. `options` lets a page offer finer ones (daily, weekly). */
export const PeriodicityTabs = <T extends string = Periodicity>({
  activeMode,
  onChange,
  options = DEFAULT_OPTIONS as unknown as T[],
}: {
  activeMode: T;
  onChange: (mode: T) => void;
  options?: T[];
}) => {
  const { t } = useTranslation();
  return (
    <SegmentedControl
      label={t("common.periodicity.label")}
      value={activeMode}
      onChange={onChange}
      options={options.map((o) => ({ value: o, label: t(`common.periodicity.${o}`) }))}
    />
  );
};
