import { createFileRoute, redirect } from "@tanstack/react-router";

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
  return (
    <div
      className="
        w-full md:h-full p-4 md:p-0
        flex flex-col md:grid md:grid-cols-[max-content_1fr] md:grid-rows-[1fr_1fr_2fr]
        gap-x-6 gap-y-6
        "
    >
      <div className="md:row-start-1 md:row-end-4 flex flex-col gap-y-6">
        <KpiBlock />
        <TravelExpensesPiePlot />
      </div>
      <div className="md:col-start-2 md:row-start-1">
        <TravelExpensesMonthlyPlot />
      </div>
      <div className="md:col-start-2 md:row-start-2">
        <TravelExpensesDetailedPlot />
      </div>
      <div className="md:col-start-2 md:row-start-3">
        <TravelExpensesPlot />
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
    return { title: "Travels" };
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
