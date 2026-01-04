import { cn } from "@/lib/utils";
import { Periodicity } from "@/types/domain";

const PERIODICITY_OPTIONS: Periodicity[] = ["monthly", "quarterly", "yearly"];

export const PeriodicityTabs = ({
  activeMode,
  onChange,
}: {
  activeMode: Periodicity;
  onChange: (mode: Periodicity) => void;
}) => {
  return (
    <div className="flex bg-shark-900 p-1 rounded-lg w-fit">
      {PERIODICITY_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "px-4 py-2 rounded capitalize font-light transition-all duration-200",
            activeMode === option
              ? "bg-shark-600 text-white shadow-sm"
              : "text-shark-300 hover:text-white hover:bg-shark-800"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
};
