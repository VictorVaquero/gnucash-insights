import { faBookmark, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DateTime } from "luxon";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { AnalysisFilters } from "./useAnalysisFilters";

const KEY = "analysis.savedViews";

interface StoredView {
  name: string;
  search: string;
  field: AnalysisFilters["field"];
  type: AnalysisFilters["type"];
  /** ISO dates, or null for "whole history". */
  from: string | null;
  to: string | null;
}

const load = (): StoredView[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(raw)
      ? (raw as StoredView[]).filter((v) => typeof v?.name === "string")
      : [];
  } catch {
    return [];
  }
};

const persist = (views: StoredView[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(views));
  } catch {
    // Private mode / blocked storage: the views simply last for this visit.
  }
};

/** Named combinations of filters, type and period, kept in this browser. */
export const SavedViews = ({
  filters,
  onApply,
}: {
  filters: AnalysisFilters;
  onApply: (f: AnalysisFilters) => void;
}) => {
  const { t } = useTranslation();
  const [views, setViews] = useState<StoredView[]>(load);
  const [name, setName] = useState("");

  const update = (next: StoredView[]) => {
    setViews(next);
    persist(next);
  };
  const save = () => {
    const label = name.trim();
    if (!label) return;
    const view: StoredView = {
      name: label,
      search: filters.search,
      field: filters.field,
      type: filters.type,
      from: filters.range?.from.toISODate() ?? null,
      to: filters.range?.to.toISODate() ?? null,
    };
    update([...views.filter((v) => v.name !== label), view]);
    setName("");
  };
  const apply = (v: StoredView) =>
    onApply({
      search: v.search,
      field: v.field,
      type: v.type,
      range: v.from && v.to ? { from: DateTime.fromISO(v.from), to: DateTime.fromISO(v.to) } : null,
    });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <FontAwesomeIcon icon={faBookmark} className="text-muted-foreground" aria-hidden />
      {views.map((v) => (
        <span
          key={v.name}
          className="inline-flex items-center overflow-hidden rounded-full border border-border text-sm"
        >
          <button type="button" className="px-2.5 py-1 hover:bg-accent" onClick={() => apply(v)}>
            {v.name}
          </button>
          <button
            type="button"
            aria-label={t("analysis.views.delete", { name: v.name })}
            className="px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => update(views.filter((x) => x.name !== v.name))}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </span>
      ))}
      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("analysis.views.placeholder")}
          aria-label={t("analysis.views.placeholder")}
          className="h-8 w-44 rounded-md border border-border bg-background px-2 text-sm"
        />
        <Button type="submit" variant="outline" size="sm" disabled={!name.trim()}>
          {t("analysis.views.save")}
        </Button>
      </form>
    </div>
  );
};
