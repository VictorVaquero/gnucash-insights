import { Slider } from "@/components/ui/slider"; // uses your custom Slider
import { useLocale } from "@/hooks/useLocale";
import type { DateRange } from "@/types/domain";
import { DateTime } from "luxon";

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

  return (
    <div className="w-full flex flex-col gap-2 p-1">
      <Slider
        value={[fromMs, toMs]}
        min={minMs}
        max={maxMs}
        step={24 * 60 * 60 * 1000} // one day
        onValueChange={([from, to]) =>
          onChange({ from: DateTime.fromMillis(from), to: DateTime.fromMillis(to) })
        }
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
        <span>{value.from.setLocale(locale).toFormat("MMM yyyy")}</span>
        <span>{value.to.setLocale(locale).toFormat("MMM yyyy")}</span>
      </div>
    </div>
  );
}
