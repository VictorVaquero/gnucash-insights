import { chromium } from "@playwright/test";

const BASE = "http://localhost:5183/dashboard/";
const SHOT_DIR =
  "/tmp/claude-1000/-home-victor-workspace-cashpy-v2/5646b4a3-cbb0-4b1c-8835-dc001b3de47e/scratchpad";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
});
const page = await context.newPage();

await page.goto(new URL("login", BASE).toString(), { waitUntil: "networkidle" });
await page.getByRole("button", { name: /^(Guest|Invitado)$/ }).click();
await page.waitForURL(/summary/, { timeout: 15000 });
await page.waitForTimeout(1000);

// Find the "Expenses by Category" card
const card = page.locator("text=Expenses by Category").locator("xpath=ancestor::*[3]");
await card.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);

const box = await card.boundingBox();
console.log("card box:", box);

// Find the bar chart area within the card and hover near the right side of the bars
const barChartContainer = card.locator(".recharts-wrapper").first();
const barBox = await barChartContainer.boundingBox();
console.log("bar chart box:", barBox);

if (barBox) {
  // hover near the right edge of the bar chart (where it previously overflowed into the pie chart)
  await page.mouse.move(barBox.x + barBox.width * 0.85, barBox.y + barBox.height * 0.5);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOT_DIR}/tooltip-after-fix-right-hover.png`, fullPage: false });

  await page.mouse.move(barBox.x + barBox.width * 0.5, barBox.y + barBox.height * 0.5);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOT_DIR}/tooltip-after-fix-mid-hover.png`, fullPage: false });
}

await browser.close();
console.log("done");
