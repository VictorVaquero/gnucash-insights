import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { detectLocale } from "./detectLocale";
import en from "./locales/en.json";
import es from "./locales/es.json";

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: detectLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  // Translations are bundled synchronously and always ready, so there's nothing to
  // suspend for -- skip react-i18next's Suspense integration entirely.
  react: { useSuspense: false },
});

export default i18next;
