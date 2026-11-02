import { useQuery } from "@tanstack/react-query";
import { useMemo, useSyncExternalStore } from "react";

import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";

/** Default pick: the van purchase. The user can change the list from the toggle's menu. */
const DEFAULT_OUTLIERS = [
  "8435fd4bfa974eaf89d1e91576470074", // Furgo
];

const STORAGE_KEY = "outliers-excluded";
const SELECTION_KEY = "outliers-accounts";
const listeners = new Set<() => void>();

const read = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
};

const readSelection = (): string[] => {
  try {
    const raw = localStorage.getItem(SELECTION_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // fall through to the default
  }
  return DEFAULT_OUTLIERS;
};

let current = read();
let selection = readSelection();

const notify = () => listeners.forEach((l) => l());

const setExcludeOutliers = (value: boolean) => {
  current = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // storage unavailable: the choice just lasts for this page view
  }
  notify();
};

const setSelection = (ids: string[]) => {
  selection = ids;
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify(ids));
  } catch {
    // storage unavailable: the choice just lasts for this page view
  }
  notify();
};

const toggleOutlierAccount = (id: string) =>
  setSelection(selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]);

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** Ids of `roots` and everything below them. */
export const withDescendants = (
  roots: string[],
  accounts: { id: string; parent?: string | null }[],
): string[] => {
  const out = new Set(roots);
  let grew = true;
  while (grew) {
    grew = false;
    for (const a of accounts) {
      if (a.parent && out.has(a.parent) && !out.has(a.id)) {
        out.add(a.id);
        grew = true;
      }
    }
  }
  return [...out];
};

/**
 * Whether outlier accounts are left out of the numbers, shared by every page. `accountIds` is
 * the list to ignore (empty when outliers are included) and `names` what is being left out.
 */
export const useOutliers = () => {
  const exclude = useSyncExternalStore(subscribe, () => current);
  const selected = useSyncExternalStore(subscribe, () => selection);
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const dbconf = getConfig(user);
  const { data: accounts } = useQuery(
    accountsOptions({ db, bookId, accountIds: [dbconf.expenses] }),
  );

  const all = useMemo(
    () => (accounts ? withDescendants(selected, accounts) : selected),
    [accounts, selected],
  );
  const names = useMemo(
    () => (accounts ?? []).filter((a) => selected.includes(a.id)).map((a) => a.name),
    [accounts, selected],
  );
  const accountIds = useMemo(() => (exclude ? all : []), [exclude, all]);
  return {
    exclude,
    setExclude: setExcludeOutliers,
    accountIds,
    names,
    selected,
    toggleAccount: toggleOutlierAccount,
    accounts: accounts ?? [],
    hasOutliers: names.length > 0,
  };
};
