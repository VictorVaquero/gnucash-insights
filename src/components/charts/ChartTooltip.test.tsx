import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TooltipContentProps } from "recharts";
import { ChartTooltip } from "./ChartTooltip";

function mockMatchMedia(matchingQueries: string[]) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matchingQueries.includes(query),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const payload: TooltipContentProps<number, string>["payload"] = [
  { dataKey: "value", value: 42, color: "red", payload: {} },
];

function renderTooltip(active: boolean) {
  return render(
    <ChartTooltip active={active} payload={active ? payload : []} label="March">
      {({ payload, label }) => (
        <div>
          <span>{label}</span>
          <span>{payload[0].value}</span>
        </div>
      )}
    </ChartTooltip>,
  );
}

describe("ChartTooltip", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders content directly with no pin/dismiss on non-touch devices", () => {
    mockMatchMedia([]);
    const { rerender } = renderTooltip(true);

    expect(screen.getByText("March")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();

    rerender(
      <ChartTooltip active={false} payload={[]} label={undefined}>
        {({ payload }) => <span>{payload[0].value}</span>}
      </ChartTooltip>,
    );
    expect(screen.queryByText("March")).not.toBeInTheDocument();
  });

  it("pins content on touch devices after the active point goes inactive, and dismisses on click", async () => {
    mockMatchMedia(["(pointer: coarse)"]);
    const user = userEvent.setup();
    const { rerender } = renderTooltip(true);

    expect(screen.getByText("March")).toBeInTheDocument();

    rerender(
      <ChartTooltip active={false} payload={[]} label={undefined}>
        {({ payload, label }) => (
          <div>
            <span>{label}</span>
            <span>{payload[0].value}</span>
          </div>
        )}
      </ChartTooltip>,
    );
    expect(screen.getByText("March")).toBeInTheDocument();

    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    await user.click(dismiss);
    expect(screen.queryByText("March")).not.toBeInTheDocument();
  });

  it("renders pinned content as a bottom sheet on narrow touch viewports", () => {
    mockMatchMedia(["(pointer: coarse)", "(max-width: 767px)"]);
    renderTooltip(true);

    expect(screen.getByText("March")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });
});
