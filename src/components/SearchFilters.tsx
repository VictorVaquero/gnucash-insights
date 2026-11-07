import { faMagnifyingGlass, faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  addToken,
  buildToken,
  queryChips,
  removeToken,
  SEARCH_FIELDS,
  toggleNegate,
  type SearchField,
} from "@/common/search";
import { cn } from "@/lib/utils";

const OPS = ["=", ">", "<", ">=", "<="] as const;
type Op = (typeof OPS)[number];

const control =
  "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";

interface Props {
  /** The whole filter set, in the shared search syntax (`field:value -field:value ...`). */
  value: string;
  onChange: (value: string) => void;
  idPrefix?: string;
  className?: string;
}

/**
 * Filter builder: pick a column, type a value and press Enter (or Add) to stack another filter.
 * Filters combine with AND; click a chip to turn it into an exclusion, and × to drop it.
 */
export const SearchFilters = ({ value, onChange, idPrefix = "filters", className }: Props) => {
  const { t } = useTranslation();
  const [field, setField] = useState<SearchField>("all");
  const [op, setOp] = useState<Op>("=");
  const [draft, setDraft] = useState("");
  const chips = queryChips(value);

  const add = () => {
    const token = buildToken(field, draft, { op });
    if (!token) return;
    onChange(addToken(value, token));
    setDraft("");
  };

  const label = (f: SearchField) => t(`analysis.filters.fields.${f}`);
  const opLabel = (o: string) => (o === "~" || o === "=" ? "" : `${o} `);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 md:max-w-md">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id={`${idPrefix}-value`}
            type="text"
            aria-label={t("common.filters.value")}
            placeholder={t("common.filters.placeholder")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              } else if (e.key === "Backspace" && !draft && chips.length) {
                onChange(removeToken(value, chips.length - 1));
              }
            }}
            className={cn(control, "w-full pl-8")}
          />
        </div>
        <select
          aria-label={t("common.filters.field")}
          className={control}
          value={field}
          onChange={(e) => setField(e.target.value as SearchField)}
        >
          {SEARCH_FIELDS.map((f) => (
            <option key={f} value={f}>
              {label(f)}
            </option>
          ))}
        </select>
        {field === "amount" && (
          <select
            aria-label={t("common.filters.operator")}
            className={control}
            value={op}
            onChange={(e) => setOp(e.target.value as Op)}
          >
            {OPS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-foreground disabled:opacity-40"
        >
          <FontAwesomeIcon icon={faPlus} />
          {t("common.filters.add")}
        </button>
      </div>
      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label={t("common.filters.active")}>
          {chips.map((c, i) => (
            <li
              key={`${c.raw}-${i}`}
              className={cn(
                "inline-flex items-center overflow-hidden rounded-full border text-xs",
                c.negate
                  ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  : "border-border bg-muted",
              )}
            >
              <button
                type="button"
                title={t("common.filters.toggleExclude")}
                className="px-2.5 py-1 hover:bg-accent/60"
                onClick={() => onChange(toggleNegate(value, i))}
              >
                {c.negate && <span className="mr-1 font-semibold">{t("common.filters.not")}</span>}
                <span className="text-muted-foreground">{label(c.field)}:</span>{" "}
                <span className="font-medium">
                  {opLabel(c.op)}
                  {c.text}
                </span>
              </button>
              <button
                type="button"
                aria-label={t("common.filters.remove", { filter: c.raw })}
                className="px-1.5 py-1 hover:bg-accent/60"
                onClick={() => onChange(removeToken(value, i))}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="px-1 text-xs text-muted-foreground underline"
              onClick={() => onChange("")}
            >
              {t("common.filters.clear")}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
};
