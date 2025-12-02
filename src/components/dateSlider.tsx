import React, { useState } from "react";
import { DateTime } from "luxon";

interface DateRangeSliderProps {
  start: string; // "2024-01-01"
  end: string;   // "2024-12-31"
  onChange?: (range: { from: string; to: string }) => void;
}

function DateRangeSlider({ start, end, onChange }: DateRangeSliderProps) {
  const startDt = DateTime.fromISO(start).startOf("day");
  const endDt = DateTime.fromISO(end).startOf("day");

  const startMs = startDt.toMillis();
  const endMs = endDt.toMillis();

  const [from, setFrom] = useState(startMs);
  const [to, setTo] = useState(endMs);

  const emitChange = (f: number, t: number) => {
    if (!onChange) return;

    onChange({
      from: DateTime.fromMillis(f).toISODate() ?? '',
      to: DateTime.fromMillis(t).toISODate() ?? '',
    });
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const newFrom = Math.min(val, to);
    setFrom(newFrom);
    emitChange(newFrom, to);
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const newTo = Math.max(val, from);
    setTo(newTo);
    emitChange(from, newTo);
  };

  return (
    <div style={{ padding: "1rem", width: "100%" }}>
      <div style={{ position: "relative", height: "40px" }}>
        <input
          type="range"
          min={startMs}
          max={endMs}
          value={from}
          onChange={handleFromChange}
          style={{ position: "absolute", width: "100%" }}
        />

        <input
          type="range"
          min={startMs}
          max={endMs}
          value={to}
          onChange={handleToChange}
          style={{ position: "absolute", width: "100%" }}
        />
      </div>

      <div style={{ marginTop: "0.5rem", fontFamily: "monospace" }}>
        From: {DateTime.fromMillis(from).toISODate()}
        <br />
        To: {DateTime.fromMillis(to).toISODate()}
      </div>
    </div>
  );
}

export default DateRangeSlider;