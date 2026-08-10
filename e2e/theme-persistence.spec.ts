import { expect, test } from "@playwright/test";
import { guestLogin } from "./helpers";

test("toggling the theme persists across a reload", async ({ page }) => {
  await guestLogin(page);

  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole("button", { name: "Change theme" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(html).toHaveClass(/dark/);

  await page.reload();
  await expect(html).toHaveClass(/dark/);
});

test("a fresh session with OS dark mode on renders dark by default", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();

  await guestLogin(page);

  await expect(page.locator("html")).toHaveClass(/dark/);

  await context.close();
});
