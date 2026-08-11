import { useTranslation } from "react-i18next";

export default function ErrorPage({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  console.error(error);
  const { t } = useTranslation();

  return (
    <div className="text-foreground flex flex-col items-center pt-40 gap-y-4">
      <h1 className="text-4xl">{t("errorPages.oops")}</h1>
      <p>{t("errorPages.unexpectedError")}</p>
      <p>
        <i>{error.message}</i>
      </p>
      <button
        className="p-4 rounded bg-shark-800 hover:bg-shark-600 text-white"
        onClick={resetErrorBoundary}
      >
        {t("errorPages.tryAgain")}
      </button>
    </div>
  );
}
