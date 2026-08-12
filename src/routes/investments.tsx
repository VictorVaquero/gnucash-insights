import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/investments")({
  component: RouteComponent,
  beforeLoad: async () => {
    return { title: "routes.investments.title" };
  },
});

function RouteComponent() {
  const { t } = useTranslation();
  return (
    <div className="w-full p-4 pt-10 lg:p-10">
      <h1 className="text-xl font-semibold tracking-tight text-foreground mb-6">
        {t("routes.investments.title")}
      </h1>
      {t("investments.placeholder")}
    </div>
  );
}
