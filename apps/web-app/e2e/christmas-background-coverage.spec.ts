import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { CHRISTMAS_WHEEL_THEMES } from "../src/lib/christmas-wheel-themes";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] }, items: [], assets: {} } }));
});

async function assertNativeCoverage(page: Page, template: string) {
  const surface = page.locator(".okado-public-experience");
  const art = surface.locator(`img[data-template-art="${template}"]`);
  await expect(art).toHaveJSProperty("complete", true);
  expect(await art.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  expect(await art.evaluate(node => node.parentElement!.classList.contains("okado-public-experience"))).toBe(true);
  const bounds = (await surface.boundingBox())!;
  const image = (await art.boundingBox())!;
  expect(image.x).toBeCloseTo(bounds.x, 0);
  expect(image.y).toBeCloseTo(bounds.y, 0);
  expect(image.width).toBeCloseTo(bounds.width, 0);
  expect(image.height).toBeCloseTo(bounds.height, 0);
  await assertNoPageOverflow(page);
}

for (const theme of CHRISTMAS_WHEEL_THEMES) {
  for (const mechanic of ["wheel", "scratch"] as const) {
    const template = mechanic === "wheel" ? theme.id : `scratch-${theme.id}`;
    const path = mechanic === "wheel" ? "christmas-wheels" : "christmas-scratch";
    test(`${template}: native artwork covers the footer, resized viewport and preview banner`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.setViewportSize({ width: 390, height: 740 });
      await page.goto(`/dev/${path}?template=${template}&mode=public&copy=long`);
      await expect(page.locator('[data-fixture-ready="true"]')).toHaveCount(1);
      await assertNativeCoverage(page, template);
      // The page may be taller than the scene: large/dynamic mobile viewport
      // differences or additional flow content must never reveal a solid footer.
      await page.locator(".okado-public-experience").evaluate(node => { node.style.minHeight = "calc(100vh + 128px)"; });
      await assertNativeCoverage(page, template);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await expect(page.getByRole("button", { name: "Règlement", exact: true })).toBeInViewport();
      const screenshot = await page.screenshot({ path: info.outputPath(`${template}-bottom.png`), animations: "disabled", caret: "initial" });
      // Check actual bottom pixels as well as image bounds: a transparent or
      // hidden image must not pass simply because its box covers the page.
      const pixels = await sharp(screenshot).metadata();
      const stats = await sharp(screenshot).extract({ left: Math.floor(pixels.width! / 4), top: pixels.height! - 32, width: Math.floor(pixels.width! / 4), height: 32 }).stats();
      expect(Math.max(...stats.channels.slice(0, 3).map(channel => channel.stdev))).toBeGreaterThan(8);
      for (const size of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(size);
        await assertNativeCoverage(page, template);
      }
      await page.goto(`/dev/${path}?template=${template}&mode=preview&copy=long`);
      await expect(page.getByRole("status")).toContainText("Mode prévisualisation");
      await assertNativeCoverage(page, template);
      await page.screenshot({ path: info.outputPath(`${template}-preview.png`), fullPage: true, caret: "initial" });
      expect(errors).toEqual([]);
    });

    test(`${template}: user-selected image and solid color cover the entire public page`, async ({ page }, info) => {
      await page.setViewportSize({ width: 390, height: 740 });
      for (const background of ["image", "color"]) {
        await page.goto(`/dev/${path}?template=${template}&mode=public&background=${background}`);
        await expect(page.locator('[data-fixture-ready="true"]')).toHaveCount(1);
        const surface = page.locator(".okado-public-experience");
        await expect(surface.locator("img[data-template-art]")).toHaveCount(0);
        if (background === "image") await expect(surface).toHaveCSS("background-image", /url\(/);
        else {
          await expect(surface).toHaveCSS("background-color", "rgb(224, 242, 254)");
          await expect(surface).toHaveCSS("background-image", "none");
        }
        if (mechanic === "wheel") {
          await expect(page.getByTestId("christmas-wheel-scene")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
          await expect(page.getByTestId("christmas-wheel-scene").locator("img")).toHaveCount(0);
        }
        await assertNoPageOverflow(page);
        await page.screenshot({ path: info.outputPath(`${template}-${background}.png`), fullPage: true, caret: "initial" });
      }
    });
  }
}

test("Christmas public page remains covered at 1280px @visual-1280", async ({ page }, info) => {
  for (const height of [720, 600]) {
    await page.setViewportSize({ width: 1280, height });
    await page.goto("/dev/christmas-wheels?template=christmas-rose&mode=public&copy=long");
    await assertNativeCoverage(page, "christmas-rose");
    await captureVisualAt1280(page, info, "christmas-public-background", height);
  }
});

test("non-Christmas Nude wheel keeps its native page background", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/beauty-wheel-backgrounds?template=beauty-nude&mode=public");
  await assertNativeCoverage(page, "beauty-nude");
  await page.screenshot({ path: info.outputPath("beauty-nude-control.png"), fullPage: true, caret: "initial" });
});
