import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { accountsOptions } from "@/db/queries/global";
import { netCostsYearMonthOptions, transactsSumOptions } from "@/db/queries/summary";

import {
  assetsDebtsYearMonthOptions,
  profitLossYearMonthOptions,
  taxesYearMonthOptions,
} from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { ChartCard } from "@/components/charts/ChartCard";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { BalancesBlock } from "@/routes/summary/-BalancesBlock.tsx";
import { BudgetVsActual } from "@/routes/summary/-BudgetVsActual.tsx";
import { KpiBlock } from "@/routes/summary/-KpiBlock.tsx";
import { RecurringExpenses } from "@/routes/summary/-RecurringExpenses.tsx";
import { SavingsBlock } from "@/routes/summary/-SavingsBlock.tsx";
import { TopMovers } from "@/routes/summary/-TopMovers.tsx";
import { AssetAccountsPlot } from "@/routes/summary/-plots/AssetAccountsPlot.tsx";
import { IncomeExpensesPlot } from "@/routes/summary/-plots/IncomeExpensesPlot.tsx";
import { NetWorthTrendPlot } from "@/routes/summary/-plots/NetWorthTrendPlot.tsx";
import { SettingsBlock } from "./-SettingsBlock";
import { DetailedExpensesBarPlot } from "./-plots/DetailedExpensesBarPlot";
import { MonthDetailedExpensesPiePlot } from "./-plots/MonthDetailedExpensesPiePlot ";
import { SummaryPageContextProvider } from "./-summaryPageContext";
import { DetailedIncomeBarPlot } from "./-plots/DetailedIncomeBarPlot";

const Summary = () => {
  const { t } = useTranslation();
  return (
    <SummaryPageContextProvider>
      <div className="w-full md:h-full p-4 sm:p-10 pt-6 flex flex-col gap-y-6">
        <h1 className="text-xl font-semibold tracking-tight">{t("routes.summary.title")}</h1>
        <SettingsBlock />
        <KpiBlock />
        <div className="h-72 md:h-80 shrink-0">
          <ChartCard title={t("summary.charts.netWorthTrend")}>
            <NetWorthTrendPlot />
          </ChartCard>
        </div>
        <div className="flex flex-col md:flex-row gap-6 md:flex-1 md:min-h-0">
          <CollapsibleSection
            title={t("summary.sections.details")}
            className="md:w-72 md:shrink-0 md:self-start"
          >
            <BalancesBlock />
            <SavingsBlock />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {t("summary.sections.topMovers")}
              </p>
              <TopMovers />
            </div>
          </CollapsibleSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:grid-rows-2 md:flex-1 md:min-w-0 md:min-h-0">
            <ChartCard title={t("summary.charts.assets")}>
              <AssetAccountsPlot />
            </ChartCard>
            <ChartCard title={t("summary.charts.incomeVsExpenses")}>
              <IncomeExpensesPlot />
            </ChartCard>
            <ChartCard title={t("summary.charts.expensesByCategory")}>
              <div className="flex flex-col md:flex-row gap-4 md:h-full">
                <div className="flex-1 min-w-0 h-64 md:h-full">
                  <DetailedExpensesBarPlot />
                </div>
                <div className="w-full md:w-40 shrink-0 h-64 md:h-full">
                  <MonthDetailedExpensesPiePlot />
                </div>
              </div>
            </ChartCard>
            <ChartCard title={t("summary.charts.incomeByCategory")}>
              <DetailedIncomeBarPlot />
            </ChartCard>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title={t("summary.charts.budgetVsActual")}>
            <BudgetVsActual />
          </ChartCard>
          <ChartCard title={t("summary.charts.recurringExpenses")}>
            <RecurringExpenses />
          </ChartCard>
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
    return { title: "routes.summary.title" };
  },
  loader: ({ context: { queryClient, db, bookId, auth } }) => {
    if (db && bookId && auth?.user) {
      const dbconf = getConfig(auth.user);
      queryClient.ensureQueryData(accountsOptions({ db, bookId }));
      queryClient.ensureQueryData(netCostsYearMonthOptions({ db, user: auth.user, bookId }));
      queryClient.ensureQueryData(assetsDebtsYearMonthOptions({ db, user: auth.user, bookId }));
      queryClient.ensureQueryData(
        transactsSumOptions({
          db,
          bookId,
          accountIds: [dbconf.income, dbconf.taxes],
          periodicity: "monthly",
        }),
      );
      queryClient.ensureQueryData(taxesYearMonthOptions({ db, user: auth.user, bookId }));
      queryClient.ensureQueryData(profitLossYearMonthOptions({ db, user: auth.user, bookId }));
    }
  },
});
