import { useEffect, useState } from "react";
import { usePersistentState } from "./usePersistentState";

export type ThemePreference = "light" | "dark" | "system";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark() {
  return window.matchMedia(DARK_QUERY).matches;
}

export function useTheme() {
  const [preference, setPreference] = usePersistentState<ThemePreference>("theme", "system");

  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (preference !== "system") return;

    const mql = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [preference]);

  const resolved = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  return { preference, resolved, setPreference } as const;
}
