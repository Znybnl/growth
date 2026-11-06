import { expect, test } from "@playwright/test";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";

test("guide agence de voyage : SEO et lecture des tableaux @visual-1280", async ({ page, context, baseURL }, info) => {
  test.skip(info.project.name !== "desktop", "Matrice unique ordinateur/mobile");
  test.setTimeout(60_000);
  await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE, value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })), url: baseURL! }]);
  const path = "/blog/fideliser-clients-agence-voyage";
  for (const [width, height] of [[1280, 720], [1280, 600], [390, 844]]) {
    await page.setViewportSize({ width, height });
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.okado.app${path}`);
    await expect(page.locator("article > section > h2")).toHaveCount(9);
    await expect(page.getByRole("table")).toHaveCount(6);
    const graph = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(graph.join(" ")).toContain("BlogPosting");
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: info.outputPath(`article-${width}x${height}.png`) });
    await page.locator("#fiche-client").screenshot({ path: info.outputPath(`demarrage-${width}.png`), style: "header.sticky { visibility: hidden !important; }" });
    for (const id of ["segmentation", "calendrier", "conseil", "budget", "indicateurs"]) {
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const table = section.getByRole("table");
      if (width < 768) {
        const region = section.getByRole("region");
        expect(await region.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(await region.evaluate(el => el.clientWidth));
      }
      await table.screenshot({ path: info.outputPath(`${id}-${width}.png`), style: "header.sticky { visibility: hidden !important; }" });
    }
  }
});
