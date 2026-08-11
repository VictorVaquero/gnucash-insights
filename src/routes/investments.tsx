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
  return <div>{t("investments.placeholder")}</div>;
}
