import { expect, test } from "@playwright/test";
import { ROUTES, guestLogin } from "./helpers";

test("every route fits within a 375px viewport with no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${msg.location().url}: ${msg.text()}`);
  });

  await guestLogin(page);

  for (const route of ROUTES) {
    errors.length = 0;
    await page.goto(route);
    await page.waitForLoadState("networkidle");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth, `horizontal overflow on ${route}`).toBeLessThanOrEqual(375);
    expect(errors, `console errors on ${route}`).toEqual([]);
  }
});
