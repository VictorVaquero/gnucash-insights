import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { accountPath } from "@/common/register";
import { accountsOptions } from "@/db/queries/global";
import { useBook, useDB } from "@/hooks/useDB";
import { cn } from "@/lib/utils";

interface Entry {
  key: string;
  label: string;
  hint: string;
  go: () => void;
}

const PAGES = [
  ["/metadata", "nav.metadata"],
  ["/summary", "nav.summary"],
  ["/expenses", "nav.expenses"],
  ["/travels", "nav.trips"],
  ["/investments", "nav.investments"],
  ["/analysis", "nav.analysis"],
  ["/register", "nav.register"],
] as const;

/** Ctrl/Cmd+K: jump to a page, or open an account's register. */
export const CommandPalette = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { db } = useDB();
  const { bookId } = useBook();
  const { data: accounts } = useQuery(accountsOptions({ db, bookId }));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setCursor(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const map = new Map((accounts ?? []).map((a) => [a.id, a]));
    const pages = PAGES.map(([to, key]) => ({
      key: `page:${to}`,
      label: t(key),
      hint: t("palette.page"),
      go: () => void navigate({ to }),
    }));
    const accs = (accounts ?? [])
      .filter((a) => a.accountType !== "ROOT")
      .map((a) => ({
        key: `acc:${a.id}`,
        label: accountPath(a.id, map),
        hint: a.accountType,
        go: () => void navigate({ to: "/register", search: { account: a.id } }),
      }));
    return [...pages, ...accs];
  }, [accounts, navigate, t]);

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return entries
      .filter((e) => words.every((w) => `${e.label} ${e.hint}`.toLowerCase().includes(w)))
      .slice(0, 50);
  }, [entries, query]);
  const active = Math.min(cursor, Math.max(0, shown.length - 1));

  if (!open) return null;
  const pick = (e: Entry | undefined) => {
    if (!e) return;
    setOpen(false);
    e.go();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
      onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div
        role="dialog"
        aria-label={t("palette.title")}
        className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl"
      >
        <input
          ref={input}
          role="combobox"
          aria-expanded
          aria-controls="palette-list"
          value={query}
          placeholder={t("palette.placeholder")}
          aria-label={t("palette.placeholder")}
          className="w-full border-b border-border bg-transparent px-4 py-3 outline-none"
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor(Math.min(shown.length - 1, active + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor(Math.max(0, active - 1));
            } else if (e.key === "Enter") pick(shown[active]);
          }}
        />
        <ul id="palette-list" role="listbox" className="max-h-80 overflow-y-auto py-1">
          {shown.map((e, i) => (
            <li
              key={e.key}
              role="option"
              aria-selected={i === active}
              className={cn(
                "flex cursor-pointer items-baseline justify-between gap-3 px-4 py-2 text-sm",
                i === active && "bg-accent",
              )}
              onMouseEnter={() => setCursor(i)}
              onClick={() => pick(e)}
            >
              <span className="truncate">{e.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{e.hint}</span>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted-foreground">{t("palette.none")}</li>
          )}
        </ul>
      </div>
    </div>
  );
};
