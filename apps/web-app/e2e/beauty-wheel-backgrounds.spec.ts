import { expect, test } from "@playwright/test";
import { beautyWheelDefaultBackground, BEAUTY_WHEEL_THEMES } from "../src/lib/beauty-wheel-themes";
import { beautyScratchTemplate } from "../src/lib/beauty-scratch-templates";

for (const [template, scratch] of [["beauty-nude", "beauty-scratch-nude"], ["beauty-botanical", "beauty-scratch-botanical"]] as const) {
  const theme = BEAUTY_WHEEL_THEMES.find((item) => item.id === template)!;
  const url = beautyScratchTemplate(scratch)!.background;
  test(`${template} : fond du ticket, priorité aux choix manuels, aucun enregistrement implicite`, () => {
    const background = { mode: "color", color: theme.background };
    const original = { ...background };
    expect(beautyWheelDefaultBackground(template, background)).toBe(url);
    expect(background).toEqual(original);
    expect(beautyWheelDefaultBackground(template, { ...background, color: "#e0f2fe" })).toBeNull();
    expect(beautyWheelDefaultBackground(template, { ...background, mode: "image", imageUrl: "/manual.webp" })).toBeNull();
    expect(beautyWheelDefaultBackground(template, { ...background, mode: "image", imageUrl: "" })).toBe(url);
  });

  for (const mode of ["preview", "public"]) {
    for (const background of ["native", "image", "color"]) {
      test(`${template} ${mode} : fond ${background}`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.route("**/api/public/campaign/fixture-wheel-backgrounds?*", (route) => route.fulfill({ json: { campaign: { actions: [] } } }));
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`/dev/beauty-wheel-backgrounds?template=${template}&mode=${mode}&background=${background}`);
        const surface = page.locator(`[data-template-id="${template}"]`);
        await expect(surface).toBeVisible();
        const art = surface.locator(`img[data-template-art="${template}"]`);
        if (background === "native") {
          await expect(art).toHaveAttribute("src", new RegExp(encodeURIComponent(url)));
          await expect(art).toHaveJSProperty("complete", true);
          expect(await art.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
          await expect(surface.locator('svg[viewBox="0 0 390 844"]')).toHaveCount(0);
        } else {
          await expect(art).toHaveCount(0);
          const container = mode === "public" ? surface : surface.locator(":scope > div");
          await expect(container).toHaveCSS("background-color", background === "color" ? "rgb(224, 242, 254)" : theme.background === "#f8f3ea" ? "rgb(248, 243, 234)" : "rgb(246, 247, 241)");
          if (background === "image") {
            await expect(container).toHaveCSS("background-image", /beauty-lilas-soin-doux/);
            await expect(surface.locator('svg[viewBox="0 0 390 844"]')).toHaveCount(0);
          }
        }
        await expect(surface.getByRole("button", { name: "Jouer à la roue" })).toBeVisible();
        expect(errors).toEqual([]);
        if (background === "native" || background === "image") await surface.screenshot({ path: testInfo.outputPath(`${template}-${mode}-${background}.png`) });
      });
    }
  }
}

test("les autres templates ne reçoivent pas le fond Nude ou Botanique", () => {
  for (const theme of BEAUTY_WHEEL_THEMES.filter((item) => !["beauty-nude", "beauty-botanical"].includes(item.id))) {
    expect(beautyWheelDefaultBackground(theme.id, { mode: "color", color: theme.background })).toBeNull();
  }
  expect(beautyWheelDefaultBackground("classic", { mode: "color", color: "#ffffff" })).toBeNull();
});

test("changer de template ne propage pas le fond natif et conserve une image manuelle", async ({ page }) => {
  await page.goto("/dev/beauty-wheel-backgrounds");
  await expect(page.locator('img[data-template-art="beauty-nude"]')).toHaveCount(1);
  await page.getByLabel("Template de test").selectOption("beauty-rose");
  await expect(page.locator("img[data-template-art]")).toHaveCount(0);
  await page.getByLabel("Template de test").selectOption("beauty-botanical");
  await expect(page.locator('img[data-template-art="beauty-botanical"]')).toHaveCount(1);
  await page.getByLabel("Fond de test").selectOption("image");
  await page.getByLabel("Template de test").selectOption("beauty-nude");
  await expect(page.locator("img[data-template-art]")).toHaveCount(0);
  await expect(page.locator('[data-template-id="beauty-nude"] > div')).toHaveCSS("background-image", /beauty-lilas-soin-doux/);
});

test("les miniatures reprennent les mêmes images raster", async ({ page }) => {
  await page.goto("/dev/beauty-wheel-backgrounds?mode=gallery");
  for (const id of ["beauty-nude", "beauty-botanical"]) {
    const art = page.locator(`img[data-template-art="${id}"]`);
    await expect(art).toHaveJSProperty("complete", true);
    expect(await art.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  }
});

for (const template of ["beauty-nude", "beauty-botanical"]) {
  for (const width of [320, 1280]) {
    test(`${template} : fond mobile plein écran à ${width}px`, async ({ page }) => {
      await page.route("**/api/public/campaign/fixture-wheel-backgrounds?*", (route) => route.fulfill({ json: { campaign: { actions: [] } } }));
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/dev/beauty-wheel-backgrounds?mode=public&template=${template}`);
      const root = page.locator(".okado-public-experience");
      const image = root.locator("img[data-template-art]");
      await expect(image).toHaveJSProperty("complete", true);
      expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      const rootBox = (await root.boundingBox())!;
      const imageBox = (await image.boundingBox())!;
      expect(imageBox.width).toBeCloseTo(rootBox.width, 0);
      expect(imageBox.height).toBeCloseTo(rootBox.height, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }
}
