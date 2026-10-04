import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BEAUTY_WHEEL_THEMES, beautyWheelDefaultBackground, beautyWheelLogoColor, beautyWheelLegibleText } from "../src/lib/beauty-wheel-themes";
import { beautyScratchTemplate } from "../src/lib/beauty-scratch-templates";
import { buildBeautyWheelSegmentColors } from "../src/lib/beauty-wheel-segments";
import { wheelPaletteForTemplate } from "../src/lib/campaign-defaults";
import { parseCampaignSetupInput } from "../src/lib/merchant-input";

test("le packaging Vercel inclut le nouveau fond Rose malgré l’exclusion globale WebP", () => {
  const ignore = readFileSync(resolve(process.cwd(), "../../.vercelignore"), "utf8");
  expect(ignore).toContain("*.webp");
  expect(ignore).toContain("!apps/web-app/public/images/wheel-templates/beauty-rose-satin.webp");
  expect(ignore).toContain("!apps/web-app/public/images/scratch-templates/*.webp");
  expect(readFileSync(resolve(process.cwd(), "public/images/wheel-templates/beauty-rose-satin.webp")).byteLength).toBe(53056);
});

test("Noir & Or remplace Éditorial chic sans changer son identifiant, le ticket ni les données sources", () => {
  const theme = BEAUTY_WHEEL_THEMES.find((item) => item.id === "beauty-editorial")!;
  expect(theme.name).toBe("Noir & Or");
  expect(BEAUTY_WHEEL_THEMES).toHaveLength(6);
  expect(theme.text).toBe("#e4c17c");
  expect(beautyWheelLogoColor(theme.id)).toBe("#f6e7c6");
  const scratch = beautyScratchTemplate("beauty-scratch-noir-or")!;
  expect(beautyWheelDefaultBackground(theme.id, { mode: "color", color: theme.background })).toBe(scratch.background);
  expect(scratch.name).toBe("Noir & Or Signature");
  expect(beautyWheelDefaultBackground(theme.id, { mode: "color", color: "#f4f0e8" })).toBeNull();
  const current = parseCampaignSetupInput({ title: "Test", gameType: "wheel", accent: {}, rewardRules: {}, presentation: { logo: {}, background: {}, heading: {}, button: {}, layout: {}, wheel: {}, poster: { wheel: {} }, email: {} } }, "fixture").presentation.wheel;
  const saved = { ...current };
  expect(wheelPaletteForTemplate(theme.id, current).rimColor).toBe("#b99a68");
  expect(current).toEqual(saved);
  for (let count = 2; count <= 8; count += 1) {
    const palette = buildBeautyWheelSegmentColors(theme.id, count, theme.primary, theme.secondary);
    expect(new Set(palette).size).toBeLessThanOrEqual(3);
    for (let index = 0; index < count; index += 1) {
      expect(palette[index]).not.toBe(palette[(index + 1) % count]);
      expect(beautyWheelLegibleText(palette[index], theme.text)).not.toBe(palette[index]);
    }
  }
});

for (const mode of ["preview", "public"]) {
  for (const width of [320, 390]) {
    test(`Noir & Or ${mode} ${width}px : titre or, logo ivoire, lots contrastés, roue centrée`, async ({ page }) => {
      await page.route("**/api/public/campaign/fixture-wheel-backgrounds?*", (route) => route.fulfill({ json: { campaign: { actions: [] } } }));
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/dev/beauty-wheel-backgrounds?template=beauty-editorial&mode=${mode}`);
      const surface = page.locator('[data-template-id="beauty-editorial"]');
      await expect(surface.getByRole("heading", { name: "Tournez la roue et tentez de gagner !" })).toHaveCSS("color", "rgb(228, 193, 124)");
      await expect(surface.getByText("VOTRE ÉTABLISSEMENT", { exact: true })).toHaveCSS("color", "rgb(246, 231, 198)");
      await expect(surface.getByTestId("beauty-wheel-colored-rim")).toHaveAttribute("stroke", "#b99a68");
      const button = surface.getByRole("button", { name: "Jouer à la roue" });
      await expect(button).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(button.locator("svg")).toHaveCount(0);
      const surfaceBox = (await surface.boundingBox())!;
      const center = (await button.boundingBox())!;
      expect(center.x + center.width / 2).toBeCloseTo(surfaceBox.x + surfaceBox.width / 2, 0);
      const labels = surface.locator("svg text");
      expect(await labels.allTextContents()).toContain("-10%PROCHAINEVISITE");
      for (const label of await labels.all()) {
        const colors = await label.evaluate((node) => ({ text: node.getAttribute("fill"), segment: node.parentElement!.querySelector("path")!.getAttribute("fill") }));
        expect(colors.text).toBe(beautyWheelLegibleText(colors.segment!, "#e4c17c"));
      }
    });
  }
  test(`une campagne Éditorial chic enregistrée conserve son fond et ses couleurs explicites (${mode})`, async ({ page }) => {
    await page.route("**/api/public/campaign/fixture-wheel-backgrounds?*", (route) => route.fulfill({ json: { campaign: { actions: [] } } }));
    await page.goto(`/dev/beauty-wheel-backgrounds?template=beauty-editorial&mode=${mode}&background=legacy`);
    const surface = page.locator('[data-template-id="beauty-editorial"]');
    await expect(surface.locator("img[data-template-art]")).toHaveCount(0);
    await expect(surface.getByRole("heading", { name: "Tournez la roue et tentez de gagner !" })).toHaveCSS("color", "rgb(23, 22, 20)");
    await expect(surface.getByText("VOTRE ÉTABLISSEMENT", { exact: true })).toHaveCSS("color", "rgb(23, 22, 20)");
  });
}

test("miniatures Rose et Noir & Or : noms et fonds fidèles sans doublon", async ({ page }) => {
  await page.goto("/dev/beauty-wheel-backgrounds?mode=gallery");
  await expect(page.getByRole("button", { name: /Noir & Or/ })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Éditorial chic/ })).toHaveCount(0);
  const noir = page.getByRole("button", { name: /Noir & Or/ });
  await expect(noir.getByTestId("beauty-thumbnail-logo")).toHaveCSS("color", "rgb(246, 231, 198)");
  await expect(noir.locator("img")).toHaveAttribute("src", /beauty-noir-or/);
  await expect(page.getByRole("button", { name: /Rose poudré/ }).locator("img")).toHaveAttribute("src", /beauty-rose-satin/);
});
