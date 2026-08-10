import { Slider } from "@/components/ui/slider"; // uses your custom Slider
import type { DateRange } from "@/types/domain";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";

interface DateRangeSliderProps {
  start: string; // "2024-01-01"
  end: string; // "2024-12-31"
  onChange?: (range: DateRange) => void;
}

export function DateRangeSlider({ start, end, onChange }: DateRangeSliderProps) {
  const startDt = DateTime.fromISO(start).startOf("day");
  const endDt = DateTime.fromISO(end).startOf("day");

  const startMs = startDt.toMillis();
  const endMs = endDt.toMillis();

  const [range, setRange] = useState<[number, number]>([startMs, endMs]);

  useEffect(() => {
    if (onChange) {
      onChange({
        from: DateTime.fromMillis(range[0]),
        to: DateTime.fromMillis(range[1]),
      });
    }
  }, [range, onChange]);

  return (
    <div className="w-full p-4">
      <Slider
        value={range}
        min={startMs}
        max={endMs}
        step={24 * 60 * 60 * 1000} // one day
        onValueChange={(val) => setRange(val as [number, number])}
      ></Slider>
    </div>
  );
}
