import { createFileRoute, redirect } from "@tanstack/react-router";

import { accountsOptions } from "@/db/queries/global";
import { netCostsYearMonthOptions } from "@/db/queries/summary";

import {
  assetsDebtsYearMonthOptions,
  incomeExpensesYearMonthOptions,
  profitLossYearMonthOptions,
  taxesYearMonthOptions,
} from "@/db/queries/summary";
import { KpiBlock } from "@/routes/summary/-KpiBlock.tsx";
import { SavingsBlock } from "@/routes/summary/-SavingsBlock.tsx";
import { MonthlyAccountsPlot } from "@/routes/summary/-plots/MonthlyAccountsPlot.tsx";
import { MonthlyIncomeExpensesPlot } from "@/routes/summary/-plots/MonthlyIncomeExpensesPlot.tsx";
import { SettingsBlock } from "./-SettingsBlock";
import { MonthDetailedExpensesPiePlot } from "./-plots/MonthDetailedExpensesPiePlot ";
import { MonthlyDetailedExpensesBarPlot } from "./-plots/MonthlyDetailedExpensesBarPlot";
import { SummaryPageContextProvider } from "./-summaryPageContext";

const Summary = () => {

  return (
    <SummaryPageContextProvider>
    <div
      className="
        w-full md:h-full p-10 pt-0
        flex-col
        md:grid md:grid-cols-[max-content_1fr] md:grid-rows-[1fr_2fr_2fr_4fr]
        gap-x-6 gap-y-6
        "
    >
      <div className="row-start-1 row-end-5 flex flex-col gap-y-6">
        <KpiBlock className="" />
        <SavingsBlock className="" />
        <MonthDetailedExpensesPiePlot />
      </div>
      <div className="col-start-2 row-start-1">
        <SettingsBlock/>
      </div>
      <div className="col-start-2 row-start-2">
        <MonthlyAccountsPlot />
      </div>
      <div className="col-start-2 row-start-3">
        <MonthlyIncomeExpensesPlot />
      </div>
      <div className="col-start-2 row-start-4">
        <MonthlyDetailedExpensesBarPlot />
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
      queryClient.ensureQueryData(accountsOptions(db, bookId));
      queryClient.ensureQueryData(
        netCostsYearMonthOptions({ db, user: auth.user, bookId })
      );
      queryClient.ensureQueryData(
        assetsDebtsYearMonthOptions({ db, user: auth.user, bookId })
      );
      queryClient.ensureQueryData(
        incomeExpensesYearMonthOptions({ db, user: auth.user, bookId })
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
