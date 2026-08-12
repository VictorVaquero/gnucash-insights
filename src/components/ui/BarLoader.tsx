import { useLayoutEffect, useMemo, useRef } from "react";

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
  const barRef = useRef<HTMLDivElement>(null);

  // Reads the wall clock to phase-sync the animation across instances -- inherently impure, so
  // it's set imperatively here (after render, via a ref) rather than computed as a style value
  // during render.
  useLayoutEffect(() => {
    if (!sync || !barRef.current) return;
    const elapsed = performance.now() - GLOBAL_START_TIME;
    const delay = elapsed % ANIMATION_DURATION_MS;
    // Negative delay "fast-forwards" the animation to the current global state
    barRef.current.style.animationDelay = `-${delay}ms`;
  }, [sync]);

  const trackStyle = useMemo(() => ({ backgroundColor: `${color}33` }), [color]); // 20% opacity track
  const barStyle = useMemo(() => ({ backgroundColor: color }), [color]);

  return (
    <div className="flex w-full justify-center">
      <div className={`relative overflow-hidden rounded-sm ${className}`} style={trackStyle}>
        <div
          ref={barRef}
          className="animate-bar-slide absolute h-full rounded-sm"
          style={barStyle}
        />
      </div>
    </div>
  );
};
