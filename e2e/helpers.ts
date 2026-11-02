import type { Page } from "@playwright/test";

// Relative to `baseURL` (which already includes the app's "/dashboard/" base path) —
// no leading slash, or these would resolve against the origin root instead.
export const ROUTES = [
  "home",
  "metadata",
  "summary",
  "expenses",
  "travels",
  "investments",
  "analysis?query=%7B%7D",
];

export const guestLogin = async (page: Page) => {
  await page.goto("login");
  await page.getByRole("button", { name: "Guest" }).click();
  await page.waitForURL("**/summary");
};
