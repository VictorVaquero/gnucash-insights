import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { buildCashflow, type CashSplit } from "@/common/cashflow";
import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions, fullTransactionsOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";

/** Month-by-month earnings, spending, savings and net worth, consistent with the KPI cards. */
export const useCashflow = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const dbconf = getConfig(user);

  const txQuery = useQuery(fullTransactionsOptions(db, bookId));
  const taxQuery = useQuery(accountsOptions({ db, bookId, accountIds: [dbconf.taxes] }));
  const assetsQuery = useQuery(accountsOptions({ db, bookId, accountIds: [dbconf.assets] }));
  const liabilityQuery = useQuery(accountsOptions({ db, bookId, accountIds: [dbconf.liability] }));

  const data = useMemo(() => {
    if (!txQuery.data || !taxQuery.data || !assetsQuery.data || !liabilityQuery.data) return [];
    const taxIds = new Set([...taxQuery.data.map((a) => a.id), ...dbconf.taxesAll]);
    const worthIds = new Set([
      ...assetsQuery.data.map((a) => a.id),
      ...liabilityQuery.data.map((a) => a.id),
    ]);
    const splits: CashSplit[] = [];
    for (const row of txQuery.data) {
      if (!row.ymdPosted) continue;
      splits.push({
        month: String(row.ymdPosted).slice(0, 7),
        value: row.value,
        accountType: row.accountType,
        isTax: taxIds.has(row.accountId),
        isNetWorth: worthIds.has(row.accountId),
      });
    }
    return buildCashflow(splits);
  }, [txQuery.data, taxQuery.data, assetsQuery.data, liabilityQuery.data, dbconf.taxesAll]);

  return { data, isLoading: txQuery.isLoading };
};
