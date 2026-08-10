import { expect, test } from "@playwright/test";

const email = process.env.PLAYWRIGHT_TEST_USER_EMAIL;
const password = process.env.PLAYWRIGHT_TEST_USER_PASSWORD;

test.skip(
  !email || !password,
  "PLAYWRIGHT_TEST_USER_EMAIL/PLAYWRIGHT_TEST_USER_PASSWORD are not provisioned yet (see docs/review/19-manual-verification.md)",
);

test("a real Cognito user can log in and reach Summary", async ({ page }) => {
  await page.goto("login");
  await page.getByPlaceholder("Email").fill(email as string);
  await page.getByPlaceholder("Password").fill(password as string);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/summary");

  await expect(page.getByText("Net", { exact: true })).toBeVisible();
});
