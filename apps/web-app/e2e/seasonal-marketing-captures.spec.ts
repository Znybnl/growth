import { expect, test } from "@playwright/test";
import { rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

// Captures of the actual game renderer, using only synthetic local fixtures.
test("seasonal marketing : native Christmas and Halloween game captures", async ({ browser, baseURL }, info) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await context.route(/https:\/\//, route => route.abort());
  await context.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] } } }));
  const page = await context.newPage();
  try {
    for (const [asset, url, scene] of [
      ["game-christmas", "/dev/christmas-wheels?template=christmas-traditional&mode=public", "christmas-wheel-scene"],
      ["game-halloween", "/dev/template-rendering-proof?mode=live&template=halloween-gold&business=retail&font=bodoni&ink=%23f1d19a", "halloween-wheel-scene"],
    ]) {
      await page.goto(url);
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      const surface = page.locator(".okado-public-experience");
      await expect(surface.getByTestId(scene)).toBeVisible();
      await expect(surface).not.toContainText("Mode prévisualisation");
      const title = surface.locator("h1");
      await expect(title).toBeVisible();
      const wheel = surface.getByTestId(scene.replace(/-scene$/, ""));
      await expect(wheel).toBeVisible();
      expect((await wheel.boundingBox())!.y).toBeGreaterThanOrEqual((await title.boundingBox())!.y + (await title.boundingBox())!.height);
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(() => surface.locator("img").evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
      await surface.screenshot({ path: info.outputPath(`${asset}.png`), animations: "disabled", scale: "device" });
    }
  } finally { await context.close(); }
});
