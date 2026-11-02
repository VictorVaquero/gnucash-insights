import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { transactsSumOptions } from "@/db/queries/summary";
import type { Periodicity } from "@/types/domain";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { withDescendants } from "@/hooks/useOutliers";

const NO_ACCOUNT = "__no-account__";

interface AccountNode {
  id: string;
  parent?: string | null;
}

/** Keeps only the roots that are not inside another root, so a closure query can't double count. */
export const topRoots = (roots: string[], accounts: AccountNode[]): string[] => {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const set = new Set(roots);
  return [...set].filter((id) => {
    let p = byId.get(id)?.parent;
    while (p) {
      if (set.has(p)) return false;
      p = byId.get(p)?.parent;
    }
    return true;
  });
};

const useAllAccounts = () => {
  const { db } = useDB();
  const { bookId } = useBook();
  return useQuery(accountsOptions({ db, bookId })).data;
};

/**
 * Every tax account: the taxes root and the extra tax accounts, each with its sub-accounts.
 * Taxes may live anywhere in the book (e.g. a root of their own next to the expenses root).
 */
export const useTaxAccountIds = () => {
  const { user } = useAuth();
  const dbconf = getConfig(user);
  const accounts = useAllAccounts();
  return useMemo(() => {
    const roots = [dbconf.taxes, ...dbconf.taxesAll].filter(Boolean);
    return accounts ? withDescendants(roots, accounts) : roots;
  }, [accounts, dbconf.taxes, dbconf.taxesAll]);
};

/**
 * Taxes paid per period (date key -> amount) and spending without taxes. Taxes are summed from
 * the tax accounts directly and spending from the expenses tree minus the tax accounts, so the
 * result is right whether taxes sit inside the expenses tree or next to it.
 */
export const useTaxByPeriod = (periodicity: Periodicity, hideAccounts: string[]) => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const dbconf = getConfig(user);
  const accounts = useAllAccounts();
  const taxIds = useTaxAccountIds();
  const taxRoots = useMemo(
    () => (accounts ? topRoots([dbconf.taxes, ...dbconf.taxesAll].filter(Boolean), accounts) : []),
    [accounts, dbconf.taxes, dbconf.taxesAll],
  );
  const noTaxHidden = useMemo(() => [...hideAccounts, ...taxIds], [hideAccounts, taxIds]);

  const { data: taxRows } = useQuery(
    transactsSumOptions({
      db,
      bookId,
      // An empty list would mean "every account" to the closure query, so match nothing instead.
      accountIds: taxRoots.length > 0 ? taxRoots : [NO_ACCOUNT],
      periodicity,
      hideAccounts,
    }),
  );
  const { data: spending } = useQuery(
    transactsSumOptions({
      db,
      bookId,
      accountIds: [dbconf.expenses],
      periodicity,
      hideAccounts: noTaxHidden,
    }),
  );

  const taxes = useMemo(() => {
    if (!taxRows) return undefined;
    return new Map(taxRows.map((r) => [r.date, r.value]));
  }, [taxRows]);

  return { taxes, spending };
};
