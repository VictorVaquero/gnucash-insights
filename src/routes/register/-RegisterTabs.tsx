import { faChevronLeft, faChevronRight, faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { accountPath, type RegisterAccount, type RegisterSplit } from "@/common/register";
import { cn } from "@/lib/utils";
import { AccountPicker, type AccountOption } from "./-AccountPicker";
import { initialRegisterState, RegisterView, type RegisterViewState } from "./-RegisterView";

const btn =
  "inline-flex h-8 items-center gap-1.5 rounded border border-border px-2.5 text-sm hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent";

interface Props {
  splits: RegisterSplit[];
  accounts: RegisterAccount[];
  /** Open tabs, in order, and which one is showing. */
  tabs: string[];
  active: string;
  onTabs: (tabs: string[], active: string) => void;
  /** Serialised state of the active tab as found in the URL, and a way to write it back. */
  view?: string;
  onView?: (view: string | undefined) => void;
}

const URL_KEYS = ["mode", "newestFirst", "query", "from", "to", "recon"] as const;

/** Only what differs from the defaults, so the URL stays short for an untouched tab. */
export const encodeView = (s: RegisterViewState): string | undefined => {
  const out: Record<string, unknown> = {};
  for (const k of URL_KEYS) if (s[k] !== initialRegisterState[k]) out[k] = s[k];
  return Object.keys(out).length ? JSON.stringify(out) : undefined;
};

export const decodeView = (view?: string): Partial<RegisterViewState> => {
  if (!view) return {};
  try {
    const raw = JSON.parse(view) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of URL_KEYS) if (typeof raw[k] === typeof initialRegisterState[k]) out[k] = raw[k];
    return out as Partial<RegisterViewState>;
  } catch {
    return {};
  }
};

const shortName = (path: string) => path.split(":").slice(-2).join(":");

/** Several account registers side by side as tabs, with a searchable account picker. */
export const RegisterTabs = ({ splits, accounts, tabs, active, onTabs, view, onView }: Props) => {
  const { t } = useTranslation();
  const [states, setStates] = useState<Record<string, RegisterViewState>>({});
  const [picker, setPicker] = useState<null | "replace" | "new">(null);
  const [recent, setRecent] = useState<string[]>([]);

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const options: AccountOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of splits) counts.set(s.accountId, (counts.get(s.accountId) ?? 0) + 1);
    return accounts
      .filter((a) => a.accountType !== "ROOT" && (counts.get(a.id) ?? 0) > 0)
      .map((a) => ({
        id: a.id,
        type: a.accountType,
        path: accountPath(a.id, accountMap),
        count: counts.get(a.id) ?? 0,
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [accounts, splits, accountMap]);
  const index = options.findIndex((o) => o.id === active);
  const pathOf = (id: string) => options.find((o) => o.id === id)?.path ?? id;

  const open = useCallback(
    (id: string, opts?: { newTab?: boolean }) => {
      setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 8));
      if (tabs.includes(id)) onTabs(tabs, id);
      else if (opts?.newTab) onTabs([...tabs, id], id);
      else
        onTabs(
          tabs.map((x) => (x === active ? id : x)),
          id,
        );
    },
    [tabs, active, onTabs],
  );

  const close = (id: string) => {
    if (tabs.length <= 1) return;
    const at = tabs.indexOf(id);
    const next = tabs.filter((x) => x !== id);
    onTabs(next, id === active ? (next[Math.max(0, at - 1)] ?? next[0]) : active);
  };

  const fromUrl = useMemo(() => ({ ...initialRegisterState, ...decodeView(view) }), [view]);
  const state = states[active] ?? fromUrl;
  const patch = (p: Partial<RegisterViewState>) =>
    setStates((prev) => ({ ...prev, [active]: { ...(prev[active] ?? fromUrl), ...p } }));

  const encoded = encodeView(state);
  useEffect(() => {
    if (encoded !== view) onView?.(encoded);
  }, [encoded, view, onView]);

  const closePicker = useCallback(() => setPicker(null), []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={btn}
          disabled={index <= 0}
          onClick={() => open(options[index - 1].id)}
          aria-label={t("register.previous")}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <div className="relative min-w-0 flex-1 md:max-w-xl">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-label={t("register.account")}
            className="h-8 w-full truncate rounded border border-border bg-background px-2 text-left text-sm hover:bg-accent"
            onClick={() => setPicker(picker === "replace" ? null : "replace")}
          >
            {pathOf(active)}
          </button>
          {picker === "replace" && (
            <AccountPicker
              options={options}
              recent={recent}
              onClose={closePicker}
              onPick={(id) => {
                open(id);
                setPicker(null);
              }}
            />
          )}
        </div>
        <button
          type="button"
          className={btn}
          disabled={index < 0 || index >= options.length - 1}
          onClick={() => open(options[index + 1].id)}
          aria-label={t("register.next")}
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
        <div className="relative">
          <button
            type="button"
            className={btn}
            onClick={() => setPicker(picker === "new" ? null : "new")}
          >
            <FontAwesomeIcon icon={faPlus} />
            {t("register.newTab")}
          </button>
          {picker === "new" && (
            <AccountPicker
              options={options}
              recent={recent}
              onClose={closePicker}
              onPick={(id) => {
                open(id, { newTab: true });
                setPicker(null);
              }}
            />
          )}
        </div>
      </div>

      {tabs.length > 1 && (
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
          {tabs.map((id) => (
            <div
              key={id}
              className={cn(
                "flex shrink-0 items-center rounded-t border border-b-0 text-sm",
                id === active
                  ? "border-border bg-card font-medium"
                  : "border-transparent text-muted-foreground hover:bg-accent/50",
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={id === active}
                title={pathOf(id)}
                className="max-w-56 truncate px-3 py-1.5"
                onClick={() => open(id)}
              >
                {shortName(pathOf(id))}
              </button>
              <button
                type="button"
                aria-label={t("register.closeTab", { name: shortName(pathOf(id)) })}
                className="px-1.5 py-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => close(id)}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          ))}
        </div>
      )}

      <RegisterView
        key={active}
        splits={splits}
        accounts={accounts}
        accountId={active}
        state={state}
        onState={patch}
        onOpenAccount={open}
      />
    </div>
  );
};
