import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ChartCard } from "@/components/charts/ChartCard";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import {
  travelExpensesByAccountOptions,
  travelExpensesDetailedOptions,
  travelExpensesDetailedYearMonthOptions,
  travelExpensesYearMonthOptions,
  travelExpensesYearOptions,
} from "@/db/queries/travel";
import { KpiBlock } from "./-components/KpiBlock";
import { TravelExpensesDetailedPlot } from "./-components/TravelExpensesDetailedPlot";
import { TravelExpensesMonthlyPlot } from "./-components/TravelExpensesMonthlyPlot";
import { TravelExpensesPiePlot } from "./-components/TravelExpensesPiePlot ";
import { TravelExpensesPlot } from "./-components/TravelExpensesPlot";

const Expenses = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full md:h-full p-4 sm:p-10 pt-6 flex flex-col gap-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {t("routes.travels.title")}
      </h1>
      <div className="flex flex-col md:flex-row gap-6 md:flex-1 md:min-h-0">
        <CollapsibleSection
          title={t("travel.sections.details")}
          className="md:w-72 md:shrink-0 md:self-start"
        >
          <KpiBlock />
        </CollapsibleSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:grid-rows-2 md:flex-1 md:min-w-0 md:min-h-0">
          <ChartCard title={t("travel.charts.byAccount")}>
            <TravelExpensesPiePlot />
          </ChartCard>
          <ChartCard title={t("travel.charts.monthly")}>
            <TravelExpensesMonthlyPlot />
          </ChartCard>
          <ChartCard title={t("travel.charts.detailed")}>
            <TravelExpensesDetailedPlot />
          </ChartCard>
          <ChartCard title={t("travel.charts.timeline")}>
            <TravelExpensesPlot />
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/travels/")({
  component: Expenses,
  beforeLoad: async ({ location, context: { auth } }) => {
    if (auth && !auth.isAuthenticated()) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    return { title: "routes.travels.title" };
  },
  loader: ({ context: { queryClient, db, bookId, auth } }) => {
    if (db && bookId && auth?.user) {
      queryClient.ensureQueryData(travelExpensesYearMonthOptions({ db, user: auth.user, bookId }));
      queryClient.ensureQueryData(travelExpensesYearOptions({ db, user: auth.user, bookId }));
      queryClient.ensureQueryData(
        travelExpensesDetailedYearMonthOptions({ db, user: auth.user, bookId }),
      );
      queryClient.ensureQueryData(travelExpensesByAccountOptions({ db, user: auth.user, bookId }));
      queryClient.ensureQueryData(travelExpensesDetailedOptions({ db, user: auth.user, bookId }));
    }
  },
});
