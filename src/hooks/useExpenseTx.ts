import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { ExpenseTx } from "@/common/analytics";
import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions, fullTransactionsOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { useOutliers } from "@/hooks/useOutliers";

const OTHER_ID = "__other";

/**
 * Every expense split in the book as a flat `ExpenseTx` (positive = spent), with taxes left
 * out (they are shown apart from spending) and each split rolled up to its top-level
 * category (the direct child of the root expenses account).
 */
export const useExpenseTx = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const dbconf = getConfig(user);
  const { accountIds: outlierIds } = useOutliers();

  const accountsQuery = useQuery(accountsOptions({ db, bookId, accountIds: [dbconf.expenses] }));
  const txQuery = useQuery(fullTransactionsOptions(db, bookId));

  const data = useMemo<ExpenseTx[]>(() => {
    if (!accountsQuery.data || !txQuery.data) return [];
    const accounts = new Map(accountsQuery.data.map((a) => [a.id, a]));
    const taxIds = new Set([dbconf.taxes, ...dbconf.taxesAll]);
    const outliers = new Set(outlierIds);

    // Walk up to the direct child of the expenses root.
    const categoryOf = new Map<string, { id: string; name: string }>();
    const resolve = (id: string): { id: string; name: string } => {
      const cached = categoryOf.get(id);
      if (cached) return cached;
      let cur = accounts.get(id);
      let result = { id: OTHER_ID, name: "" };
      while (cur) {
        if (cur.parent === dbconf.expenses || cur.id === dbconf.expenses) {
          result = cur.id === dbconf.expenses ? result : { id: cur.id, name: cur.name };
          break;
        }
        cur = cur.parent ? accounts.get(cur.parent) : undefined;
      }
      categoryOf.set(id, result);
      return result;
    };
    const isTax = (id: string): boolean => {
      for (let cur = accounts.get(id); cur; cur = cur.parent ? accounts.get(cur.parent) : undefined)
        if (taxIds.has(cur.id)) return true;
      return false;
    };

    const out: ExpenseTx[] = [];
    for (const row of txQuery.data) {
      if (row.accountType !== "EXPENSE" || !row.ymdPosted) continue;
      if (!accounts.has(row.accountId) || isTax(row.accountId)) continue;
      if (outliers.has(row.accountId)) continue;
      const category = resolve(row.accountId);
      const date = String(row.ymdPosted).slice(0, 10);
      out.push({
        date,
        month: date.slice(0, 7),
        amount: row.value,
        accountId: row.accountId,
        accountName: row.accountName,
        categoryId: category.id,
        categoryName: category.name || row.accountName,
        description: row.description ?? "",
      });
    }
    return out;
  }, [
    accountsQuery.data,
    txQuery.data,
    dbconf.expenses,
    dbconf.taxes,
    dbconf.taxesAll,
    outlierIds,
  ]);

  return { data, isLoading: accountsQuery.isLoading || txQuery.isLoading };
};
