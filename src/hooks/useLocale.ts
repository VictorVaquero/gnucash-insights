import i18next from "i18next";
import { useEffect } from "react";
import { detectLocale, type Locale } from "@/i18n/detectLocale";
import { usePersistentState } from "./usePersistentState";

export type { Locale };

export function useLocale() {
  const [locale, setLocale] = usePersistentState<Locale>("locale", detectLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    // i18next.changeLanguage() unconditionally re-emits `languageChanged` even when the
    // target language is already active, which forces every useTranslation() consumer
    // app-wide to re-render. Since every chart independently calls useLocale(), skipping
    // the redundant call here avoids a re-render storm on every mount/re-render.
    if (i18next.language !== locale) i18next.changeLanguage(locale);
  }, [locale]);

  return { locale, setLocale } as const;
}
