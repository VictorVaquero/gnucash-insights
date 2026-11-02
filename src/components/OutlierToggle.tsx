import { useTranslation } from "react-i18next";

import { useOutliers } from "@/hooks/useOutliers";
import { cn } from "@/lib/utils";

/** Switches one-off big purchases (the van) in or out of every figure. Hidden if the book has none. */
export const OutlierToggle = (props: { className?: string }) => {
  const { t } = useTranslation();
  const { exclude, setExclude, names, hasOutliers } = useOutliers();
  if (!hasOutliers) return null;
  const label = names.join(", ");
  return (
    <button
      type="button"
      role="switch"
      aria-checked={exclude}
      title={t("outliers.tooltip", { names: label })}
      onClick={() => setExclude(!exclude)}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/40",
        props.className,
      )}
    >
      <span
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          exclude ? "bg-[var(--brand)]" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full bg-white transition-all",
            exclude ? "left-3.5" : "left-0.5",
          )}
        />
      </span>
      {exclude ? t("outliers.excluded", { names: label }) : t("outliers.included")}
    </button>
  );
};
