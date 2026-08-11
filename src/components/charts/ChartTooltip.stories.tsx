import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { TooltipContentProps } from "recharts";

import { ChartTooltip } from "./ChartTooltip";

const payload: TooltipContentProps<number, string>["payload"] = [
  { dataKey: "value", value: 128.42, color: "var(--color-emerald-500)", payload: {} },
];

function Demo() {
  const [active, setActive] = useState(true);
  return (
    <div className="relative flex h-40 w-64 items-end justify-center border border-dashed border-border">
      <button
        type="button"
        className="absolute top-2 left-2 rounded border border-border px-2 py-1 text-xs"
        onClick={() => setActive((a) => !a)}
      >
        {active ? "Release tap" : "Tap data point"}
      </button>
      <ChartTooltip active={active} payload={active ? payload : []} label="March 2026">
        {({ payload, label }) => (
          <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center">
            <span className="text-muted-foreground text-xs">{label}</span>
            <span style={{ color: payload[0].color }}>{payload[0].value}</span>
          </div>
        )}
      </ChartTooltip>
    </div>
  );
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  title: "Charts/ChartTooltip",
};

export default meta;
type Story = StoryObj<typeof Demo>;

// Non-touch environments (mouse/trackpad, the Storybook default) render the tooltip
// content directly, following hover state — no pin, no dismiss control.
export const Floating: Story = {};

// A real touch device (or a real mobile browser's devtools emulation, which sets
// `(pointer: coarse)`) pins the tooltip open after the tap ends, with a dismiss control.
// A viewport narrower than the 767px `md` breakpoint additionally renders it as a bottom
// sheet instead of following the tap position — both depend on the environment's actual
// input/viewport, so verify the pinned/bottom-sheet look on a real touch device per
// tasks.md T060.
export const NarrowViewport: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
