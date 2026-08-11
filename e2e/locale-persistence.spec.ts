import { expect, test } from "@playwright/test";
import { guestLogin } from "./helpers";

test("switching the language persists across a reload", async ({ page }) => {
  await guestLogin(page);

  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", "en");

  await page.getByRole("button", { name: "Change language" }).click();
  await page.getByRole("menuitemradio", { name: "Español" }).click();
  await expect(html).toHaveAttribute("lang", "es");

  await page.reload();
  await expect(html).toHaveAttribute("lang", "es");
});

test("a fresh session with the OS in Spanish renders Spanish by default", async ({ browser }) => {
  const context = await browser.newContext({ locale: "es-ES" });
  const page = await context.newPage();

  await guestLogin(page);

  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  await context.close();
});
