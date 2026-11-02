import type { ReactNode } from "react";

interface Entry {
  name?: string | number;
  value?: number | string;
  color?: string;
}

/**
 * Theme-aware tooltip body for recharts' `<Tooltip content={...}>`. Pass `format` to render
 * each value (currency, percent...). Entries with a zero value are skipped unless `keepZero`.
 */
export const SimpleTooltip = (props: {
  active?: boolean;
  label?: ReactNode;
  payload?: readonly Entry[];
  format: (value: number) => string;
  keepZero?: boolean;
  total?: boolean;
}) => {
  const { active, label, payload, format, keepZero, total } = props;
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => keepZero || Number(p.value) !== 0);
  if (rows.length === 0) return null;
  const sum = rows.reduce((acc, p) => acc + Number(p.value ?? 0), 0);
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label != null && <p className="mb-1 font-medium">{label}</p>}
      {rows.map((p) => (
        <p key={String(p.name)} className="flex items-center justify-between gap-4 tabular-nums">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span>{format(Number(p.value ?? 0))}</span>
        </p>
      ))}
      {total && rows.length > 1 && (
        <p className="mt-1 flex justify-between gap-4 border-t border-border pt-1 font-medium tabular-nums">
          <span>Σ</span>
          <span>{format(sum)}</span>
        </p>
      )}
    </div>
  );
};
