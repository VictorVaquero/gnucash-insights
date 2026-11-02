import { faSliders } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOutliers } from "@/hooks/useOutliers";
import { cn } from "@/lib/utils";

const depthOf = (id: string, byId: Map<string, { parent?: string | null }>): number => {
  let d = 0;
  for (let p = byId.get(id)?.parent; p && byId.has(p); p = byId.get(p)?.parent) d++;
  return d;
};

/**
 * Leaves chosen expense accounts (one-off big purchases) out of every figure, or brings them
 * back. The accounts are picked from a searchable list, so any book can define its own outliers.
 */
export const OutlierToggle = (props: { className?: string }) => {
  const { t } = useTranslation();
  const { exclude, setExclude, names, selected, toggleAccount, accounts, hasOutliers } =
    useOutliers();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const byId = new Map(accounts.map((a) => [a.id, a]));
    const q = search.trim().toLowerCase();
    return accounts
      .filter((a) => a.parent && (q === "" || a.name.toLowerCase().includes(q)))
      .map((a) => ({ ...a, depth: depthOf(a.id, byId) }));
  }, [accounts, search]);

  const label = names.join(", ");
  return (
    <div className={cn("inline-flex items-center gap-1", props.className)}>
      <button
        type="button"
        role="switch"
        aria-checked={exclude}
        disabled={!hasOutliers}
        title={t("outliers.tooltip", { names: label })}
        onClick={() => setExclude(!exclude)}
        className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/40 disabled:opacity-60"
      >
        <span
          className={cn(
            "relative h-4 w-7 rounded-full transition-colors",
            exclude && hasOutliers ? "bg-[var(--brand)]" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-3 rounded-full bg-white transition-all",
              exclude && hasOutliers ? "left-3.5" : "left-0.5",
            )}
          />
        </span>
        {!hasOutliers
          ? t("outliers.none")
          : exclude
            ? t("outliers.excluded", { names: label })
            : t("outliers.included")}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("outliers.configure")}
            title={t("outliers.configure")}
            className="rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-muted/40"
          >
            <FontAwesomeIcon icon={faSliders} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
          <p className="px-2 pt-2 text-xs text-muted-foreground">{t("outliers.help")}</p>
          <div className="p-2">
            <input
              type="text"
              value={search}
              placeholder={t("accountsDropdown.searchPlaceholder")}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border px-2 py-1 text-sm"
            />
          </div>
          {rows.map((a) => (
            <div
              key={a.id}
              className="flex cursor-pointer items-center gap-2 py-1 pr-2"
              style={{ paddingLeft: `${a.depth * 12 + 8}px` }}
              onClick={() => toggleAccount(a.id)}
            >
              <Checkbox checked={selected.includes(a.id)} />
              <span className="truncate text-sm">{a.name}</span>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
