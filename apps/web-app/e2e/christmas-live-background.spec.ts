import { expect, test } from "@playwright/test";
import { rejectAnalyticsForVisualTests, assertNoPageOverflow } from "./helpers/visual-1280";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { items: [], assets: {} } }));
});

for (const viewport of [{ width: 1280, height: 720 }, { width: 1280, height: 600 }, { width: 390, height: 844 }]) {
  for (const mechanic of ["scratch", "wheel"]) {
    test(`@visual-1280 Noël ${mechanic} : fond du vrai aperçu iframe ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
      await page.setViewportSize(viewport);
      for (const theme of ["rose", "natural", "traditional"]) {
        const template = `${mechanic === "scratch" ? "scratch-" : ""}christmas-${theme}`;
        await page.goto(`/dev/christmas-${mechanic === "scratch" ? "scratch" : "wheels"}?template=${template}&mode=live`);
        const frame = page.frameLocator('iframe[title^="Aperçu du brouillon"]');
        const surface = frame.locator(`[data-template-id="${template}"]`);
        await expect(surface).toBeVisible();
        await expect.poll(() => frame.locator("img[data-template-art]").first().evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
        await surface.evaluate(async () => { await document.fonts.ready; });
        await expect.poll(() => surface.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(740);
        await expect.poll(() => frame.locator("#draft-preview-root").evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(740);
        await expect.poll(() => frame.locator("img[data-template-art]").first().evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
        const coverage = await frame.locator("img[data-template-art]").first().evaluate(node => ({ bottom: node.getBoundingClientRect().bottom, viewport: innerHeight }));
        expect(coverage.bottom).toBeGreaterThanOrEqual(coverage.viewport);
        await assertNoPageOverflow(page);
        await page.getByTestId("wizard-phone-preview").screenshot({ path: info.outputPath(`${template}-${viewport.width}x${viewport.height}.png`) });
      }
    });
  }
}

test("@visual-1280 Noël : fonds manuels conservés dans le vrai iframe", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const mechanic of ["scratch", "wheel"]) {
    const template = `${mechanic === "scratch" ? "scratch-" : ""}christmas-natural`;
    for (const background of ["image", "color"]) {
      await page.goto(`/dev/christmas-${mechanic === "scratch" ? "scratch" : "wheels"}?template=${template}&mode=live&background=${background}`);
      const frame = page.frameLocator('iframe[title^="Aperçu du brouillon"]');
      const surface = frame.locator(`[data-template-id="${template}"]`);
      await expect(surface).toBeVisible();
      await expect(frame.locator("img[data-template-art]")).toHaveCount(0);
      if (background === "image") {
        const art = surface.locator("img").first();
        await expect.poll(() => art.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
        expect(await art.evaluate(node => node.getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(740);
      } else {
        await expect(mechanic === "wheel" ? frame.getByTestId("christmas-wheel-scene") : surface).toHaveCSS("background-color", "rgb(224, 242, 254)");
        expect(await surface.evaluate(node => node.getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(740);
      }
    }
  }
});
