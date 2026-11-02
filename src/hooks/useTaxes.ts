import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { transactsSumOptions } from "@/db/queries/summary";
import type { Periodicity } from "@/types/domain";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { withDescendants } from "@/hooks/useOutliers";

/** Every tax account: the taxes root and the extra tax accounts, each with its sub-accounts. */
export const useTaxAccountIds = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const dbconf = getConfig(user);
  const { data: accounts } = useQuery(
    accountsOptions({ db, bookId, accountIds: [dbconf.expenses] }),
  );
  return useMemo(() => {
    const roots = [dbconf.taxes, ...dbconf.taxesAll];
    return accounts ? withDescendants(roots, accounts) : roots;
  }, [accounts, dbconf.taxes, dbconf.taxesAll]);
};

/**
 * Taxes paid per period (date key -> amount), measured as all expenses minus expenses without
 * the tax accounts, so it always agrees with the spending and net figures built from the same
 * queries -- whichever way the tax accounts are spread across the tree.
 */
export const useTaxByPeriod = (periodicity: Periodicity, hideAccounts: string[]) => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const dbconf = getConfig(user);
  const taxIds = useTaxAccountIds();
  const noTaxHidden = useMemo(() => [...hideAccounts, ...taxIds], [hideAccounts, taxIds]);

  const { data: all } = useQuery(
    transactsSumOptions({
      db,
      bookId,
      accountIds: [dbconf.expenses],
      periodicity,
      hideAccounts,
    }),
  );
  const { data: noTax } = useQuery(
    transactsSumOptions({
      db,
      bookId,
      accountIds: [dbconf.expenses],
      periodicity,
      hideAccounts: noTaxHidden,
    }),
  );

  const taxes = useMemo(() => {
    if (!all || !noTax) return undefined;
    const map = new Map<string, number>();
    for (const r of all) map.set(r.date, (map.get(r.date) ?? 0) + r.value);
    for (const r of noTax) map.set(r.date, (map.get(r.date) ?? 0) - r.value);
    return map;
  }, [all, noTax]);

  return { taxes, spending: noTax };
};
