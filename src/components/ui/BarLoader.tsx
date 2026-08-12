import { useMemo } from "react";

const GLOBAL_START_TIME = performance.now();
const ANIMATION_DURATION_MS = 1000; // Matches the 1s in your CSS

export const BarLoader = ({
  color = "#36d7b7",
  className = "w-48 h-1",
  sync = true,
}: {
  color?: string;
  className?: string;
  sync?: boolean;
}) => {
  const syncStyle = useMemo(() => {
    if (!sync) return {};

    // Calculate how far into the loop we currently are
    const elapsed = performance.now() - GLOBAL_START_TIME;
    const delay = elapsed % ANIMATION_DURATION_MS;

    return {
      // Negative delay "fast-forwards" the animation to the current global state
      animationDelay: `-${delay}ms`,
    };
  }, [sync]);

  const trackStyle = useMemo(() => ({ backgroundColor: `${color}33` }), [color]); // 20% opacity track
  const barStyle = useMemo(() => ({ backgroundColor: color, ...syncStyle }), [color, syncStyle]);

  return (
    <div className="flex w-full justify-center">
      <div className={`relative overflow-hidden rounded-sm ${className}`} style={trackStyle}>
        <div className="animate-bar-slide absolute h-full rounded-sm" style={barStyle} />
      </div>
    </div>
  );
};
