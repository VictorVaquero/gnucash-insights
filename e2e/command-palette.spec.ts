import { expect, test } from "@playwright/test";
import { guestLogin } from "./helpers";

test("Ctrl+K opens the palette and jumps to an account's register", async ({ page }) => {
  await guestLogin(page);
  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
  await page.keyboard.press("Control+k");
  const box = page.getByRole("combobox", { name: /Go to a page or account/ });
  await expect(box).toBeFocused();
  await box.fill("groceries");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/register\?account=/);
  await expect(page.getByTestId("register-table")).toBeVisible();
});
