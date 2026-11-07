import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
  size?: "sm" | "md";
}

/** A compact pill switch: one option is active, the rest are a click away. */
export const SegmentedControl = <T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  size = "md",
}: SegmentedControlProps<T>) => (
  <div
    role="group"
    aria-label={label}
    className={cn(
      "inline-flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg bg-muted p-0.5",
      className,
    )}
  >
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        aria-pressed={value === o.value}
        onClick={() => onChange(o.value)}
        className={cn(
          "shrink-0 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
          size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-2.5 text-sm sm:px-3.5",
          value === o.value
            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);
