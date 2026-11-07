import { expect, test } from "@playwright/test";
import { guestLogin } from "./helpers";

test("saves the current analysis filters as a named view and re-applies it", async ({ page }) => {
  await guestLogin(page);
  await page.goto("analysis");
  const search = page.getByPlaceholder(/Type a value/);
  await search.fill("payroll");
  await page.keyboard.press("Enter");
  await page.getByPlaceholder("Name this view…").fill("Payroll only");
  await page.getByRole("button", { name: "Save view" }).click();
  await expect(page.getByRole("button", { name: "Payroll only", exact: true })).toBeVisible();

  // Wipe the filters, then bring the view back.
  await page.goto("analysis");
  await page.getByRole("button", { name: "Payroll only", exact: true }).click();
  await expect(page).toHaveURL(/q=/);
});
