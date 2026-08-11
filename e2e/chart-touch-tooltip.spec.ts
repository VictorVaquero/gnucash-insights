import { expect, test } from "@playwright/test";
import { guestLogin } from "./helpers";

// The shared `mobile` project (mobile-smoke.spec.ts only) doesn't enable touch emulation,
// so this test declares its own viewport + touch context rather than relying on a project.
test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

test("tapping a chart data point pins the tooltip as a dismissible bottom sheet", async ({
  page,
}) => {
  await guestLogin(page);
  // The Analysis page's transactions chart is fed by `fullTransactionsOptions`, which
  // pulls every split unfiltered -- unlike the Summary page's charts, it doesn't depend
  // on the per-account-role config (income/expenses/assets/etc account IDs), so it
  // reliably has data to tap regardless of that config's contents.
  await page.goto("analysis");

  // The chart only renders once the full transactions query resolves and the table's
  // initial (select-all) row selection propagates up as `filteredTransactions` -- give
  // that more room than the default timeout under parallel-worker CPU contention.
  const chart = page.locator("svg.recharts-surface");
  await expect(chart).toBeVisible({ timeout: 15_000 });
  await chart.scrollIntoViewIfNeeded();
  const box = await chart.boundingBox();
  if (!box) throw new Error("chart bounding box not found");

  // Recharts only recomputes the active/hovered point on `touchmove` (it uses
  // `elementFromPoint` there, unlike `touchstart`, which it just forwards as an
  // external event) -- see recharts' RechartsWrapper.js `myOnTouchMove`. A plain
  // `touchscreen.tap()` (start+end, no move) never triggers the tooltip, so a
  // real touchstart+touchmove sequence is dispatched here instead.
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate(
    ([x, y]) => {
      const target = document.elementFromPoint(x, y);
      if (!target) throw new Error(`elementFromPoint(${x}, ${y}) returned null`);
      const touch = new Touch({ identifier: 1, target, clientX: x, clientY: y });
      const opts = {
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch],
        bubbles: true,
        cancelable: true,
      };
      target.dispatchEvent(new TouchEvent("touchstart", opts));
      target.dispatchEvent(new TouchEvent("touchmove", opts));
      target.dispatchEvent(new TouchEvent("touchend", { ...opts, touches: [], targetTouches: [] }));
    },
    [x, y],
  );

  const dismissButton = page.getByRole("button", { name: "Dismiss" });
  await expect(dismissButton).toBeVisible();

  const bottomSheet = page.locator(".fixed.inset-x-0.bottom-0");
  await expect(bottomSheet).toBeVisible();
  await expect(bottomSheet.getByRole("button", { name: "Dismiss" })).toBeVisible();

  // The pin survives the finger lifting -- Playwright's tap() already completes a full
  // touchstart/touchend cycle above, so still seeing it here confirms it's not just a
  // hover-follow tooltip that vanished the instant contact ended.
  await dismissButton.click();
  await expect(dismissButton).not.toBeVisible();
});
