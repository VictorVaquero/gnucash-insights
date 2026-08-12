import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { faDesktop, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
import { useCallback } from "react";

const PREFERENCE_OPTIONS: { value: ThemePreference; label: string; icon: typeof faSun }[] = [
  { value: "light", label: "Light", icon: faSun },
  { value: "dark", label: "Dark", icon: faMoon },
  { value: "system", label: "System", icon: faDesktop },
];

const TRIGGER_ICON: Record<ThemePreference, typeof faSun> = {
  light: faSun,
  dark: faMoon,
  system: faDesktop,
};

export const ThemeToggle = ({ isCollapsed }: { isCollapsed?: boolean }) => {
  const { preference, setPreference } = useTheme();
  const handleValueChange = useCallback(
    (value: string) => setPreference(value as ThemePreference),
    [setPreference],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Change theme"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-secondary-foreground transition-colors hover:bg-accent"
        >
          <FontAwesomeIcon icon={TRIGGER_ICON[preference]} className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isCollapsed ? "start" : "end"}>
        <DropdownMenuRadioGroup value={preference} onValueChange={handleValueChange}>
          {PREFERENCE_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className={cn("gap-2", preference === option.value && "text-brand")}
            >
              <FontAwesomeIcon icon={option.icon} className="h-3.5 w-3.5" />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
