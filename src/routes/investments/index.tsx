import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ChartCard } from "@/components/charts/ChartCard";
import { Card, CardContent } from "@/components/ui/card";
import { holdingAccountsOptions } from "@/db/queries/investments";
import { getConfig } from "@/db/utils";
import { HoldingDetail } from "./-HoldingDetail";
import { HoldingsTable } from "./-HoldingsTable";
import { InflationToggle } from "./-InflationToggle";
import { KpiBlock } from "./-KpiBlock";
import {
  InvestmentsPageContextProvider,
  useInvestmentsPageContext,
} from "./-investmentsPageContext";
import { HoldingsGrowthPlot } from "./-plots/HoldingsGrowthPlot";

const InvestmentsContent = () => {
  const { t } = useTranslation();
  const { selectedHoldingId } = useInvestmentsPageContext();

  return (
    <div className="w-full p-4 pt-10 lg:p-10 flex flex-col gap-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("routes.investments.title")}
        </h1>
        <InflationToggle />
      </div>
      <KpiBlock />
      <div className="h-80 md:h-96 shrink-0">
        <ChartCard title={t("investments.chart.growth")} hint={t("investments.chart.growthHint")}>
          <HoldingsGrowthPlot />
        </ChartCard>
      </div>
      <Card>
        <CardContent className="pt-4">
          <HoldingsTable />
        </CardContent>
      </Card>
      {selectedHoldingId && <HoldingDetail />}
    </div>
  );
};

const Investments = () => (
  <InvestmentsPageContextProvider>
    <InvestmentsContent />
  </InvestmentsPageContextProvider>
);

export const Route = createFileRoute("/investments/")({
  component: Investments,
  beforeLoad: async ({ location, context: { auth } }) => {
    if (auth && !auth.isAuthenticated()) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    return { title: "routes.investments.title" };
  },
  loader: ({ context: { queryClient, db, bookId, auth } }) => {
    if (db && bookId && auth?.user) {
      const dbconf = getConfig(auth.user);
      queryClient.ensureQueryData(
        holdingAccountsOptions({ db, bookId, investmentsAccountId: dbconf.investments }),
      );
    }
  },
});
