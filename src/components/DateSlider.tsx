import { Slider } from "@/components/ui/slider"; // uses your custom Slider
import { useLocale } from "@/hooks/useLocale";
import type { DateRange } from "@/types/domain";
import { DateTime } from "luxon";
import { useCallback, useMemo } from "react";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface DateRangeSliderProps {
  min: string; // absolute lower bound, e.g. "2023-09-01"
  max: string; // absolute upper bound, e.g. "2026-07-01"
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeSlider({ min, max, value, onChange }: DateRangeSliderProps) {
  const { locale } = useLocale();
  const minMs = DateTime.fromISO(min).startOf("day").toMillis();
  const maxMs = DateTime.fromISO(max).startOf("day").toMillis();
  const fromMs = value.from.startOf("day").toMillis();
  const toMs = value.to.startOf("day").toMillis();
  const sliderValue = useMemo(() => [fromMs, toMs], [fromMs, toMs]);
  const handleValueChange = useCallback(
    ([from, to]: number[]) =>
      onChange({ from: DateTime.fromMillis(from), to: DateTime.fromMillis(to) }),
    [onChange],
  );

  return (
    <div className="w-full flex flex-col gap-2 p-1">
      <Slider
        value={sliderValue}
        min={minMs}
        max={maxMs}
        step={ONE_DAY_MS}
        onValueChange={handleValueChange}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
        <span>{value.from.setLocale(locale).toFormat("MMM yyyy")}</span>
        <span>{value.to.setLocale(locale).toFormat("MMM yyyy")}</span>
      </div>
    </div>
  );
}
