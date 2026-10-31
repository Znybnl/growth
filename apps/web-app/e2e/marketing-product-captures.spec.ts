import { expect, test } from "@playwright/test";
import { rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test("marketing : capture du vrai tableau marchand sur données fictives", async ({ browser, baseURL }, info) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await context.route(/https:\/\//, route => route.abort());
  await context.route("**/api/**", route => route.fulfill({ json: { items: [], emailCount: 0 } }));
  try {
    const page = await context.newPage();
    await page.goto("/dev/template-rendering-proof?mode=dashboard-responsive-marketing&business=restaurant");
    await expect(page.getByRole("heading", { name: "Pilotez vos campagnes" })).toBeVisible();
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(3);
    await page.evaluate(() => document.fonts.ready);
    await page.locator("main > div").screenshot({ path: info.outputPath("merchant-dashboard.png"), animations: "disabled" });
  } finally { await context.close(); }
});
