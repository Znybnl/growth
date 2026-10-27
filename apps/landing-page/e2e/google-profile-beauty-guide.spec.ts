import { expect, test } from "@playwright/test";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";

test("guide Google : captures lisibles, agrandissement et tableaux sans débordement @visual-1280", async ({ page, context, baseURL, request }, testInfo) => {
  if (testInfo.project.name === "desktop") {
    await page.setViewportSize({ width: 1280, height: 720 });
  }
  await context.addCookies([{
    name: ANALYTICS_CONSENT_COOKIE,
    value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })),
    url: baseURL!,
  }]);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/blog/creer-fiche-google-institut-beaute");
  await expect(page.locator("h1")).toContainText("Créer une fiche Google");
  await expect(page.getByRole("navigation", {
    name: page.viewportSize()!.width >= 1024 ? "Navigation principale" : "Navigation mobile",
  })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("google-guide-header.png") });

  const figures = page.locator("article figure");
  await expect(figures).toHaveCount(3);
  for (let index = 0; index < 3; index++) {
    const figure = figures.nth(index);
    const image = figure.getByRole("img");
    await figure.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
    await expect(figure.locator("time")).toHaveAttribute("datetime", "2026-10-27");
    const link = figure.getByRole("link", { name: /^Agrandir la capture/ });
    await link.focus();
    await expect(link).toBeFocused();
    const original = await request.get((await link.getAttribute("href"))!);
    expect(original.status()).toBe(200);
    expect(original.headers()["content-type"]).toContain("image/jpeg");
    await page.screenshot({ path: testInfo.outputPath(`google-guide-step-${index + 1}.png`) });
    if (index === 2) {
      const newPage = context.waitForEvent("page");
      await link.press("Enter");
      const enlarged = await newPage;
      await enlarged.waitForLoadState();
      expect(new URL(enlarged.url()).pathname).toBe(await link.getAttribute("href"));
      await enlarged.close();
    }
  }
  const tables = await page.getByRole("region").filter({ has: page.getByRole("table") }).all();
  for (const [index, region] of tables.entries()) {
    await region.scrollIntoViewIfNeeded();
    await region.focus();
    await expect(region).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`google-guide-table-${index + 1}.png`) });
  }
  const takeaway = page.getByText("À retenir", { exact: true }).locator("..");
  await takeaway.scrollIntoViewIfNeeded();
  await expect(takeaway.getByRole("link")).toHaveAttribute("href", "/instituts-beaute#demo");
  await page.screenshot({ path: testInfo.outputPath("google-guide-analysis.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(errors).toEqual([]);
});
