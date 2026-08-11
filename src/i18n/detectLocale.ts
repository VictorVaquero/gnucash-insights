export type Locale = "en" | "es";

const STORAGE_KEY = "use-persistent-state-locale";

export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed === "en" || parsed === "es") return parsed;
    }
  } catch {
    // malformed localStorage value - fall through to browser detection
  }
  return navigator.language.split("-")[0] === "es" ? "es" : "en";
}
