import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const NotFoundPage = () => {
  const { t } = useTranslation();
  return (
    <div className="text-foreground flex flex-col items-center pt-40 gap-y-4">
      <h1 className="text-4xl">{t("errorPages.oops")}</h1>
      <p>{t("errorPages.notFound")}</p>
      <Link
        to="/"
        aria-label={t("errorPages.home")}
        className="p-4 rounded bg-shark-800 hover:bg-shark-600 text-white"
      >
        {t("errorPages.goHome")}
      </Link>
    </div>
  );
};
