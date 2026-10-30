import { expect, test } from "@playwright/test";
import { rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route("**/api/**", (route) => route.fulfill({ json: { suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});

test("logos enregistrés conservent leur ratio historique ; les nouveaux imports utilisent 150 px à 100 %", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/dev/template-rendering-proof?mode=preview&template=classic&logoSizing=legacy");
  const oldLogo = page.getByAltText("Logo");
  await expect(oldLogo).toBeVisible();
  const oldBox = await oldLogo.evaluate((image) => {
    const box = image.parentElement?.getBoundingClientRect();
    return box ? { width: box.width, height: box.height } : null;
  });
  expect(oldBox).not.toBeNull();
  expect(oldBox!.height / oldBox!.width).toBeCloseTo(1, 1);

  await page.goto("/dev/template-rendering-proof?mode=preview&template=classic&logoSizing=new");
  const newLogo = page.getByAltText("Logo");
  await expect(newLogo).toBeVisible();
  const newBox = await newLogo.evaluate((image) => {
    const box = image.parentElement?.getBoundingClientRect();
    return box ? { width: box.width, height: box.height } : null;
  });
  expect(newBox).not.toBeNull();
  expect(newBox!.height / newBox!.width).toBeCloseTo(0.5, 1);
});
