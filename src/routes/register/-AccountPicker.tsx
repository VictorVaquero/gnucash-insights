import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

export interface AccountOption {
  id: string;
  type: string;
  path: string;
  count: number;
}

interface Props {
  options: AccountOption[];
  /** Account ids recently opened, newest first; shown before the user types. */
  recent: string[];
  onPick: (id: string) => void;
  onClose: () => void;
}

const norm = (s: string) => s.toLowerCase();

/** Searchable account chooser: type to narrow by any part of the path or type, Enter picks. */
export const AccountPicker = ({ options, recent, onPick, onClose }: Props) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [onClose]);

  const list = useMemo(() => {
    const words = norm(query).split(/\s+/).filter(Boolean);
    if (!words.length) {
      const byId = new Map(options.map((o) => [o.id, o]));
      const top = recent.flatMap((id) => (byId.has(id) ? [byId.get(id) as AccountOption] : []));
      const rest = options.filter((o) => !recent.includes(o.id));
      return { recent: top, rest };
    }
    const hits = options.filter((o) => {
      const hay = norm(`${o.path} ${o.type}`);
      return words.every((w) => hay.includes(w));
    });
    return { recent: [] as AccountOption[], rest: hits };
  }, [query, options, recent]);
  const flat = [...list.recent, ...list.rest];
  const active = Math.min(cursor, Math.max(0, flat.length - 1));

  useEffect(() => {
    box.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, flat.length]);

  const row = (o: AccountOption, i: number) => (
    <li
      key={`${i}-${o.id}`}
      role="option"
      aria-selected={i === active}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-sm",
        i === active ? "bg-accent" : "hover:bg-accent/60",
      )}
      onMouseEnter={() => setCursor(i)}
      onClick={() => onPick(o.id)}
    >
      <span className="min-w-0 truncate">{o.path}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {o.type} · {o.count}
      </span>
    </li>
  );

  return (
    <div
      ref={box}
      className="absolute left-0 top-full z-30 mt-1 w-[min(36rem,90vw)] rounded-lg border border-border bg-popover shadow-lg"
    >
      <input
        ref={input}
        type="text"
        role="combobox"
        aria-expanded
        aria-label={t("register.searchAccount")}
        placeholder={t("register.searchAccount")}
        className="w-full rounded-t-lg border-b border-border bg-transparent px-3 py-2 text-sm outline-none"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCursor(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor(Math.min(active + 1, flat.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor(Math.max(active - 1, 0));
          } else if (e.key === "Enter" && flat[active]) {
            e.preventDefault();
            onPick(flat[active].id);
          } else if (e.key === "Escape") {
            onClose();
          }
        }}
      />
      <ul role="listbox" className="max-h-80 overflow-y-auto py-1">
        {flat.length === 0 && (
          <li className="px-3 py-3 text-sm text-muted-foreground">{t("register.noAccounts")}</li>
        )}
        {list.recent.length > 0 && (
          <li className="px-3 pb-0.5 pt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("register.recent")}
          </li>
        )}
        {list.recent.map((o, i) => row(o, i))}
        {list.recent.length > 0 && list.rest.length > 0 && (
          <li className="px-3 pb-0.5 pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("register.allAccounts")}
          </li>
        )}
        {list.rest.map((o, i) => row(o, list.recent.length + i))}
      </ul>
    </div>
  );
};
