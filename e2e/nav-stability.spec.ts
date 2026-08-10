import { expect, test } from "@playwright/test";
import { guestLogin } from "./helpers";

test("collapsing/expanding the sidebar never shifts page content", async ({ page }) => {
  await guestLogin(page);
  await page.goto("home");

  const heading = page.getByRole("heading", { level: 1 });
  const before = await heading.boundingBox();
  expect(before).not.toBeNull();

  // The <aside> is always `fixed`; only its width animates, so content must never shift.
  const toggle = page.getByRole("button", { name: /Open menu|Close menu/ });
  await toggle.click();
  await page.waitForTimeout(400); // let the width transition (300ms) settle

  const after = await heading.boundingBox();
  expect(after).not.toBeNull();
  expect(after?.x).toBe(before?.x);
  expect(after?.width).toBe(before?.width);
});
