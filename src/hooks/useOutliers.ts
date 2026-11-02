import { useQuery } from "@tanstack/react-query";
import { useMemo, useSyncExternalStore } from "react";

import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";

/** One-off purchases (the van) that distort every average; left out unless asked for. */
const OUTLIER_ACCOUNT_IDS = [
  "8435fd4bfa974eaf89d1e91576470074", // Furgo
];

const STORAGE_KEY = "outliers-excluded";
const listeners = new Set<() => void>();

const read = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
};

let current = read();

const setExcludeOutliers = (value: boolean) => {
  current = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // storage unavailable: the choice just lasts for this page view
  }
  listeners.forEach((l) => l());
};

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
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const dbconf = getConfig(user);
  const { data: accounts } = useQuery(
    accountsOptions({ db, bookId, accountIds: [dbconf.expenses] }),
  );

  const all = useMemo(
    () => (accounts ? withDescendants(OUTLIER_ACCOUNT_IDS, accounts) : OUTLIER_ACCOUNT_IDS),
    [accounts],
  );
  const names = useMemo(
    () => (accounts ?? []).filter((a) => OUTLIER_ACCOUNT_IDS.includes(a.id)).map((a) => a.name),
    [accounts],
  );
  const accountIds = useMemo(() => (exclude ? all : []), [exclude, all]);
  return {
    exclude,
    setExclude: setExcludeOutliers,
    accountIds,
    names,
    hasOutliers: names.length > 0,
  };
};
