import { useTranslation } from "react-i18next";

const YEAR = new Date().getFullYear();

export const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="h-8 w-full flex items-center justify-center gap-1.5 px-6 text-xs text-foreground font-light">
      <span>{t("footer.madeBy", { name: "Victor" })}</span>
      <span className="text-foreground">·</span>
      <span>&copy; {YEAR}</span>
      <span className="text-foreground">·</span>
      <a
        href="https://victorvaquero.com"
        target="_blank"
        rel="noreferrer"
        className="text-foreground hover:text-brand transition-colors"
      >
        victorvaquero.com
      </a>
    </footer>
  );
};
