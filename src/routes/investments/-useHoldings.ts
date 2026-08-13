import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useMemo } from "react";

import { xirr, type Cashflow } from "@/common/finance";
import { useAuth } from "@/contexts/useAuthContext";
import {
  commodityPricesOptions,
  holdingAccountsOptions,
  holdingLotsOptions,
} from "@/db/queries/investments";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { useDeflator } from "./-useDeflator";

export interface PricePoint {
  date: string;
  value: number;
}

export interface Lot {
  date: string;
  quantity: number;
  value: number;
}

export interface Holding {
  accountId: string;
  name: string;
  ticker: string | null;
  commodityName: string | null;
  quantity: number;
  price: number | null;
  priceDate: string | null;
  marketValue: number;
  costBasis: number;
  gain: number;
  gainPct: number | null;
  xirrNominal: number | null;
  xirrReal: number | null;
  priceHistory: PricePoint[];
  lots: Lot[];
}

export interface Portfolio {
  holdings: Holding[];
  totalMarketValue: number;
  totalCostBasis: number;
  totalGain: number;
  totalGainPct: number | null;
  xirrNominal: number | null;
  xirrReal: number | null;
  isLoading: boolean;
}

/**
 * Combines the three raw investments queries (holding accounts, purchase lots, commodity
 * price history) into per-holding and portfolio-level figures: current market value, gain,
 * and money-weighted annualized return (XIRR), both nominal and inflation-adjusted.
 *
 * Cost basis only sums buy-side lots (doesn't proportionally reduce basis on a partial
 * sell) -- a deliberate simplification for this first cut, since GnuCash doesn't track
 * lot-level disposal method and full FIFO/average-cost accounting is out of scope here.
 */
export const useHoldings = (): Portfolio => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { deflate } = useDeflator();
  const dbconf = getConfig(user);

  const accountsQuery = useQuery(
    holdingAccountsOptions({ db, bookId, investmentsAccountId: dbconf.investments }),
  );
  const holdingAccounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);

  const accountIds = useMemo(() => holdingAccounts.map((h) => h.id), [holdingAccounts]);
  const commodityIds = useMemo(() => holdingAccounts.map((h) => h.commodityId), [holdingAccounts]);

  const lotsQuery = useQuery(holdingLotsOptions({ db, bookId, accountIds }));
  const pricesQuery = useQuery(commodityPricesOptions({ db, bookId, commodityIds }));

  const isLoading =
    accountsQuery.isLoading ||
    (accountIds.length > 0 && (lotsQuery.isLoading || pricesQuery.isLoading));

  return useMemo(() => {
    const today = DateTime.now().toISODate() ?? "";
    const lots = lotsQuery.data ?? [];
    const prices = pricesQuery.data ?? [];

    const holdings: Holding[] = holdingAccounts.map((account) => {
      const holdingLots: Lot[] = lots
        .filter((l) => l.accountId === account.id)
        .map((l) => ({ date: l.date.toISODate() ?? "", quantity: l.quantity, value: l.value }));

      const priceHistory: PricePoint[] = prices
        .filter((p) => p.commodityId === account.commodityId)
        .map((p) => ({ date: p.date.toISODate() ?? "", value: p.value }));

      const quantity = holdingLots.reduce((sum, l) => sum + l.quantity, 0);
      const costBasis = holdingLots
        .filter((l) => l.quantity > 0)
        .reduce((sum, l) => sum + l.value, 0);

      const latestPrice = priceHistory[priceHistory.length - 1];
      const price = latestPrice?.value ?? null;
      const marketValue = price != null ? quantity * price : 0;

      const gain = marketValue - costBasis;
      const gainPct = costBasis > 0 ? (gain / costBasis) * 100 : null;

      // Buys are cash out (negative), sells are cash in (positive); the split's own
      // sign already encodes this (positive value = money added to the holding).
      const cashflows: Cashflow[] = holdingLots.map((l) => ({ date: l.date, amount: -l.value }));
      if (marketValue > 0) cashflows.push({ date: today, amount: marketValue });
      const realCashflows: Cashflow[] = cashflows.map((cf) => ({
        date: cf.date,
        amount: deflate(cf.amount, cf.date),
      }));

      return {
        accountId: account.id,
        name: account.name,
        ticker: account.ticker,
        commodityName: account.commodityName,
        quantity,
        price,
        priceDate: latestPrice?.date ?? null,
        marketValue,
        costBasis,
        gain,
        gainPct,
        xirrNominal: xirr(cashflows),
        xirrReal: xirr(realCashflows),
        priceHistory,
        lots: holdingLots,
      };
    });

    const totalMarketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
    const totalGain = totalMarketValue - totalCostBasis;
    const totalGainPct = totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : null;

    const allCashflows: Cashflow[] = holdings.flatMap((h) =>
      h.lots.map((l) => ({ date: l.date, amount: -l.value })),
    );
    if (totalMarketValue > 0) allCashflows.push({ date: today, amount: totalMarketValue });
    const allRealCashflows: Cashflow[] = allCashflows.map((cf) => ({
      date: cf.date,
      amount: deflate(cf.amount, cf.date),
    }));

    return {
      holdings,
      totalMarketValue,
      totalCostBasis,
      totalGain,
      totalGainPct,
      xirrNominal: xirr(allCashflows),
      xirrReal: xirr(allRealCashflows),
      isLoading,
    };
  }, [holdingAccounts, lotsQuery.data, pricesQuery.data, deflate, isLoading]);
};
