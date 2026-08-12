import { useEffect, useSyncExternalStore } from "react";
import { usePersistentState } from "./usePersistentState";

export type ThemePreference = "light" | "dark" | "system";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const noop = () => undefined;

function noSubscription() {
  return noop;
}

function subscribeToSystemTheme(onChange: () => void) {
  const mql = window.matchMedia(DARK_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSystemDarkSnapshot() {
  return window.matchMedia(DARK_QUERY).matches;
}

export function useTheme() {
  const [preference, setPreference] = usePersistentState<ThemePreference>("theme", "system");

  const systemDark = useSyncExternalStore(
    preference === "system" ? subscribeToSystemTheme : noSubscription,
    getSystemDarkSnapshot,
  );

  const resolved = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  return { preference, resolved, setPreference } as const;
}
