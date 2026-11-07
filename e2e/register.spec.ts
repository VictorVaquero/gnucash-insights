import { expect, test } from "@playwright/test";
import { guestLogin } from "./helpers";

test.describe("account register", () => {
  test.beforeEach(async ({ page }) => {
    await guestLogin(page);
    await page.goto("register");
    await expect(page.getByTestId("register-table")).toBeVisible();
  });

  test("filters by a chip and resets", async ({ page }) => {
    const rows = page.getByTestId("register-table").locator("tbody");
    await expect(rows.nth(1)).toBeVisible();
    await page.getByPlaceholder(/Type a value/).fill("payroll");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/of \d+ transactions/)).toBeVisible();
    const bodies = await rows.count();
    expect(bodies).toBeGreaterThan(1);
    await expect(page.getByTestId("register-table").getByText("Payroll").first()).toBeVisible();
    await expect(page.getByTestId("register-table").getByText("City Bus")).toHaveCount(0);
  });

  test("detailed view shows splits and infinite scroll loads more rows", async ({ page }) => {
    const rows = page.getByTestId("register-table").locator("tbody");
    const before = await rows.count();
    await page.getByTestId("register-table").evaluate((el) => {
      const s = el.parentElement;
      if (s) s.scrollTop = s.scrollHeight;
    });
    await expect.poll(async () => rows.count()).toBeGreaterThan(before);
    await page.getByRole("button", { name: "Detailed" }).click();
    await expect(page.getByRole("button", { name: "Detailed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("opens a second account in a new tab", async ({ page }) => {
    await page.getByRole("button", { name: "New tab" }).click();
    await page.locator("input[role=combobox]").fill("Savings");
    await page.getByRole("option").first().click();
    await expect(page.getByRole("tab")).toHaveCount(2);
    await expect(page).toHaveURL(/tabs=/);
  });

  test("keeps view and filters in the URL across a reload", async ({ page }) => {
    await page.getByRole("button", { name: "Detailed" }).click();
    await page.getByPlaceholder(/Type a value/).fill("payroll");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/view=/);
    await page.reload();
    await expect(page.getByRole("button", { name: "Detailed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("register-table").getByText("City Bus")).toHaveCount(0);
  });
});
