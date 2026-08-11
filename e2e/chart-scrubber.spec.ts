import { expect, test } from "@playwright/test";
import { guestLogin } from "./helpers";

test("dragging across a chart's plot area scrubs a crosshair and updates the live tooltip", async ({
  page,
}) => {
  await guestLogin(page);
  // Same chart as chart-touch-tooltip.spec.ts: the Analysis page's transactions chart is
  // fed by `fullTransactionsOptions` (every split, unfiltered), so it reliably has data
  // regardless of the guest config's account-role setup.
  await page.goto("analysis");

  const chart = page.locator("svg.recharts-surface");
  await expect(chart).toBeVisible({ timeout: 15_000 });
  await chart.scrollIntoViewIfNeeded();
  const box = await chart.boundingBox();
  if (!box) throw new Error("chart bounding box not found");

  const y = box.y + box.height / 2;
  const x1 = box.x + box.width * 0.25;
  const x2 = box.x + box.width * 0.75;

  const referenceLine = page.locator("line.recharts-reference-line-line");
  const tooltipWrapper = page.locator(".recharts-tooltip-wrapper");

  // Idle: no crosshair rendered yet.
  await expect(referenceLine).toHaveCount(0);

  // A real mouse move (dispatched via CDP, not a synthetic in-page event) triggers
  // Recharts' own hover tracking, showing the live tooltip at x1.
  await page.mouse.move(x1, y, { steps: 5 });
  await expect(tooltipWrapper).toBeVisible();
  const label1 = await tooltipWrapper.innerText();

  // Dragging (mousedown + mousemove) engages useChartScrubber: the crosshair
  // (ReferenceLine) appears and tracks the drag position independently of Recharts'
  // own hover state, which continues to update the tooltip live off the same gesture.
  await page.mouse.down();
  await page.mouse.move(x2, y, { steps: 10 });
  // A vertical <line> (x1 === x2) has a zero-width bounding box, so Playwright's
  // `toBeVisible()` actionability check reports it as hidden even though it's genuinely
  // rendered -- assert presence via count instead.
  await expect(referenceLine).toHaveCount(1);
  await expect(tooltipWrapper).toBeVisible();
  const label2 = await tooltipWrapper.innerText();
  expect(label2).not.toBe(label1);

  // Releasing resets the scrubber's activeIndex to null -- the crosshair disappears.
  await page.mouse.up();
  await expect(referenceLine).toHaveCount(0);
});
