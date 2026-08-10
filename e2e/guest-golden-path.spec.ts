import { expect, test } from "@playwright/test";
import { guestLogin } from "./helpers";

test("guest login renders the Summary page with real data", async ({ page }) => {
  await guestLogin(page);

  await expect(page.getByText("Net", { exact: true })).toBeVisible();
  await expect(page.locator(".recharts-surface").first()).toBeVisible();
});
