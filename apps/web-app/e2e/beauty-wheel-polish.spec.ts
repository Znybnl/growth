import { expect, test } from "@playwright/test";
import { beautyWheelRimColor } from "../src/lib/beauty-wheel-finishes";

const templates = ["beauty-rose", "beauty-nude", "beauty-botanical", "beauty-pop", "beauty-editorial", "beauty-tech", "rose-institut"];

test("la couleur d'un contour personnalisé reste effective", () => {
  expect(beautyWheelRimColor("beauty-nude", "#f8f3ea", "#b99052")).toBe("#b99052");
  expect(beautyWheelRimColor("beauty-nude", "#112233", "#b99052")).toBe("#112233");
  expect(beautyWheelRimColor("beauty-editorial", "#f4f0e8", "#171614")).toBe("#b99a68");
  expect(beautyWheelRimColor("beauty-editorial", "#445566", "#171614")).toBe("#445566");
});

for (const template of templates) {
  for (const mode of ["preview", "public"]) {
    for (const width of [320, 390]) {
      test(`${template} ${mode} à ${width}px : finitions, lots et logo texte`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.route("**/api/public/campaign/fixture-wheel-backgrounds?*", (route) => route.fulfill({ json: { campaign: { actions: [] } } }));
        await page.setViewportSize({ width, height: 844 });
        await page.goto(`/dev/beauty-wheel-backgrounds?template=${template}&mode=${mode}`);
        const surface = page.locator(`[data-template-id="${template}"]`);
        const button = surface.getByRole("button", { name: "Jouer à la roue" });
        await expect(button).toBeVisible();
        await expect(button.locator("svg")).toHaveCount(0);
        await expect(button).toHaveCSS("background-image", /radial-gradient/);
        const label = button.locator(".okado-beauty-wheel-center-label");
        expect(await label.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(17);
        const buttonBox = (await button.boundingBox())!;
        const labelBox = (await label.boundingBox())!;
        expect(labelBox.width).toBeLessThan(buttonBox.width - 4);
        await expect(surface.getByTestId("beauty-logo-rule")).toHaveCount(1);
        const ring = surface.getByTestId("beauty-wheel-rim");
        await expect(ring.locator("circle")).toHaveCount(2);
        await expect(ring.locator("circle").first()).toHaveAttribute("stroke", "#ffffff");
        await expect(surface.getByTestId("beauty-wheel-colored-rim")).toHaveAttribute("stroke-width", template === "beauty-nude" ? "2.5" : template === "beauty-pop" ? "3.2" : "3");
        const pointer = surface.getByTestId("beauty-wheel-pointer");
        await expect(pointer).toHaveCSS("filter", /drop-shadow/);
        await expect(pointer.getByTestId("beauty-pointer-body")).toHaveAttribute("fill", /url\(#beauty-pointer-/);
        const midStop = pointer.locator("stop").nth(1);
        expect(await midStop.evaluate((node) => getComputedStyle(node).stopColor)).not.toBe("rgb(0, 0, 0)");
        const lotLabels = surface.locator("svg text");
        await expect(lotLabels).toHaveCount(8);
        await expect(lotLabels.first()).toHaveAttribute("font-family", "var(--font-dm-sans), sans-serif");
        expect(await lotLabels.allTextContents()).toContain("-10%PROCHAINEVISITE");
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        expect(errors).toEqual([]);
        if (width === 390) {
          await page.evaluate(() => document.fonts.ready);
          await surface.screenshot({ path: testInfo.outputPath(`${template}-${mode}.png`) });
        }
      });
    }
    for (const logo of ["image", "none"]) {
      test(`${template} ${mode} : aucun filet en mode logo ${logo}`, async ({ page }) => {
        await page.route("**/api/public/campaign/fixture-wheel-backgrounds?*", (route) => route.fulfill({ json: { campaign: { actions: [] } } }));
        await page.goto(`/dev/beauty-wheel-backgrounds?template=${template}&mode=${mode}&logo=${logo}`);
        await expect(page.getByTestId("beauty-logo-rule")).toHaveCount(0);
      });
    }
  }
  test(`${template} : clic action, animation et résultat conservés`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/dev/beauty-wheel-backgrounds?template=${template}&mode=interaction`);
    const button = page.getByRole("button", { name: "Jouer à la roue" });
    await button.click();
    await expect(page.getByTestId("action-count")).toHaveText("1");
    await expect(page.getByTestId("result-count")).toHaveText("0");
    await button.click();
    await expect(page.getByTestId("result-count")).toHaveText("1");
    await expect(page.locator(".okado-wheel-center-button")).toBeDisabled();
    await expect(page.getByTestId("action-count")).toHaveText("1");
  });
}

test("les sept miniatures ont le centre sans icône, le reflet et un pointeur en relief", async ({ page }, testInfo) => {
  await page.goto("/dev/beauty-wheel-backgrounds?mode=gallery");
  const centers = page.getByTestId("beauty-thumbnail-center");
  await expect(centers).toHaveCount(7);
  for (const center of await centers.all()) {
    await expect(center.locator("svg")).toHaveCount(0);
    await expect(center).toHaveCSS("background-image", /radial-gradient/);
  }
  await expect(page.getByTestId("beauty-wheel-pointer")).toHaveCount(7);
  await expect(page.getByTestId("beauty-logo-rule")).toHaveCount(7);
  const ids = await page.locator("svg linearGradient").evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(new Set(ids).size).toBe(ids.length);
  await page.screenshot({ path: testInfo.outputPath("gallery.png"), fullPage: true });
});

test("la roue hors Beauté conserve son style et n'a pas le filet Beauté", async ({ page }) => {
  await page.goto("/dev/beauty-wheel-backgrounds?template=classic");
  await expect(page.getByTestId("beauty-logo-rule")).toHaveCount(0);
  await expect(page.getByTestId("beauty-wheel-rim")).toHaveCount(0);
  await expect(page.getByTestId("beauty-wheel-pointer")).toHaveCount(0);
  await expect(page.locator(".okado-beauty-wheel-center-label")).toHaveCount(0);
});
