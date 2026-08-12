import { DateTime } from "luxon";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { DateRangeSlider } from "@/components/DateSlider";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/types/domain";

interface Preset {
  label: string;
  getRange: (domainFrom: DateTime, domainTo: DateTime) => DateRange;
}

const PRESETS: Preset[] = [
  { label: "3M", getRange: (_from, to) => ({ from: to.minus({ months: 3 }), to }) },
  { label: "6M", getRange: (_from, to) => ({ from: to.minus({ months: 6 }), to }) },
  { label: "1Y", getRange: (_from, to) => ({ from: to.minus({ years: 1 }), to }) },
  { label: "YTD", getRange: (_from, to) => ({ from: DateTime.local(to.year, 1, 1), to }) },
  { label: "allTime", getRange: (from, to) => ({ from, to }) },
];

const chipClass = (active: boolean) =>
  cn(
    "text-xs px-3 py-1.5 rounded-full border transition-colors font-medium",
    active
      ? "bg-brand/10 text-brand border-brand"
      : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground",
  );

const PresetButton = (props: {
  preset: Preset;
  active: boolean;
  onClick: (preset: Preset) => void;
  label: string;
}) => {
  const { preset, active, onClick, label } = props;
  const handleClick = useCallback(() => onClick(preset), [onClick, preset]);

  return (
    <button type="button" onClick={handleClick} className={chipClass(active)}>
      {label}
    </button>
  );
};

export const DateRangePresets = (props: {
  domainFrom: DateTime;
  domainTo: DateTime;
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}) => {
  const { domainFrom, domainTo, dateRange, onChange, className } = props;
  const { locale } = useLocale();
  const { t } = useTranslation();
  const [customOpen, setCustomOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!customOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setCustomOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [customOpen]);

  const activePreset = PRESETS.find((preset) => {
    const r = preset.getRange(domainFrom, domainTo);
    return r.from.hasSame(dateRange.from, "day") && r.to.hasSame(dateRange.to, "day");
  });

  const handlePresetClick = useCallback(
    (preset: Preset) => {
      onChange(preset.getRange(domainFrom, domainTo));
    },
    [onChange, domainFrom, domainTo],
  );

  const toggleCustomOpen = useCallback(() => {
    setCustomOpen((v) => !v);
  }, []);

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {PRESETS.map((preset) => (
        <PresetButton
          key={preset.label}
          preset={preset}
          active={activePreset?.label === preset.label}
          onClick={handlePresetClick}
          label={preset.label === "allTime" ? t("summary.dateRange.allTime") : preset.label}
        />
      ))}
      <div className="relative" ref={panelRef}>
        <button type="button" onClick={toggleCustomOpen} className={chipClass(!activePreset)}>
          {!activePreset
            ? `${dateRange.from.setLocale(locale).toFormat("MMM yyyy")} – ${dateRange.to.setLocale(locale).toFormat("MMM yyyy")}`
            : t("summary.dateRange.custom")}
        </button>
        {customOpen && (
          <div className="absolute z-10 top-[calc(100%+6px)] right-0 w-72 bg-popover border border-border rounded-lg shadow-lg p-3">
            <DateRangeSlider
              min={domainFrom.toString()}
              max={domainTo.toString()}
              value={dateRange}
              onChange={onChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};
