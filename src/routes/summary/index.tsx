import { createFileRoute, redirect } from "@tanstack/react-router";

import { accountsOptions } from "@/db/queries/global";
import {
  netCostsYearMonthOptions,
  transactsSumOptions,
} from "@/db/queries/summary";

import {
  assetsDebtsYearMonthOptions,
  profitLossYearMonthOptions,
  taxesYearMonthOptions,
} from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { KpiBlock } from "@/routes/summary/-KpiBlock.tsx";
import { SavingsBlock } from "@/routes/summary/-SavingsBlock.tsx";
import { AssetAccountsPlot } from "@/routes/summary/-plots/AssetAccountsPlot.tsx";
import { IncomeExpensesPlot } from "@/routes/summary/-plots/IncomeExpensesPlot.tsx";
import { SettingsBlock } from "./-SettingsBlock";
import { DetailedExpensesBarPlot } from "./-plots/DetailedExpensesBarPlot";
import { MonthDetailedExpensesPiePlot } from "./-plots/MonthDetailedExpensesPiePlot ";
import { SummaryPageContextProvider } from "./-summaryPageContext";
import { DetailedIncomeBarPlot } from "./-plots/DetailedIncomeBarPlot";

const Summary = () => {
  return (
    <SummaryPageContextProvider>
      <div
        className="
        w-full md:h-full p-4 sm:p-10 pt-0
        flex-col
        md:grid md:grid-cols-[max-content_1fr] md:grid-rows-[1fr_2fr_2fr_4fr_2fr]
        gap-x-6 gap-y-6
        "
      >
        <div className="row-start-1 row-end-5 flex flex-col gap-y-6">
          <KpiBlock className="" />
          <SavingsBlock className="" />
          <MonthDetailedExpensesPiePlot />
        </div>
        <div className="col-start-2 row-start-1">
          <SettingsBlock />
        </div>
        <div className="col-start-2 row-start-2">
          <AssetAccountsPlot />
        </div>
        <div className="col-start-2 row-start-3">
          <IncomeExpensesPlot />
        </div>
        <div className="col-start-2 row-start-4">
          <DetailedExpensesBarPlot />
        </div>
        <div className="col-start-2 row-start-5">
          <DetailedIncomeBarPlot />
        </div>
      </div>
    </SummaryPageContextProvider>
  );
};

export const Route = createFileRoute("/summary/")({
  component: Summary,
  beforeLoad: async ({ location, context: { auth } }) => {
    if (auth && !auth.isAuthenticated()) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    return { title: "Summary" };
  },
  loader: ({ context: { queryClient, db, bookId, auth } }) => {
    if (db && bookId && auth?.user) {
      const dbconf = getConfig(auth.user);
      queryClient.ensureQueryData(accountsOptions({ db, bookId }));
      queryClient.ensureQueryData(
        netCostsYearMonthOptions({ db, user: auth.user, bookId })
      );
      queryClient.ensureQueryData(
        assetsDebtsYearMonthOptions({ db, user: auth.user, bookId })
      );
      queryClient.ensureQueryData(
        transactsSumOptions({
          db,
          bookId,
          accountIds: [dbconf.income, dbconf.taxes],
          periodicity: "monthly",
        })
      );
      queryClient.ensureQueryData(
        taxesYearMonthOptions({ db, user: auth.user, bookId })
      );
      queryClient.ensureQueryData(
        profitLossYearMonthOptions({ db, user: auth.user, bookId })
      );
    }
  },
});
