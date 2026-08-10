import { expect, test } from "@playwright/test";
import { ROUTES, guestLogin } from "./helpers";

test("every top-level route loads without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${msg.location().url}: ${msg.text()}`);
  });

  await guestLogin(page);

  for (const route of ROUTES) {
    errors.length = 0;
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    expect(errors, `console errors on ${route}`).toEqual([]);
  }
});
