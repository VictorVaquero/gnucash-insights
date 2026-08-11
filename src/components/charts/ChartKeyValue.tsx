import { cn } from "@/lib/utils";

interface ChartKeyValueProps {
  label?: string;
  value: React.ReactNode;
  className?: string;
}

/**
 * Always-visible key value overlay (chart-component-contract's Key values section,
 * FR-008) — the chart's primary value rendered without requiring hover/tap.
 */
export function ChartKeyValue({ label, value, className }: ChartKeyValueProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-1 right-2 flex flex-col items-end text-right",
        className,
      )}
    >
      {label && <span className="text-muted-foreground text-xs">{label}</span>}
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
