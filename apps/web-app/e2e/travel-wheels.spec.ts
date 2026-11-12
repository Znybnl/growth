import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TRAVEL_WHEEL_THEMES } from "../src/lib/travel-wheel-themes";
import { rejectAnalyticsForVisualTests, captureVisualAt1280 } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] }, suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});

test("fonds Voyage présents dans le package Vercel", async ({ request }) => {
  expect(readFileSync(resolve(__dirname, "../../../.vercelignore"), "utf8")).toContain("!apps/web-app/public/images/templates/travel/*.webp");
  for (const theme of TRAVEL_WHEEL_THEMES) {
    const response = await request.get(theme.artwork);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/webp");
  }
});

for (const theme of TRAVEL_WHEEL_THEMES) {
  test(`${theme.name} : fond et proportions en mobile`, async ({ page }, info) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/dev/christmas-wheels?template=${theme.id}&mode=public`);
      const scene = page.getByTestId("christmas-wheel-scene");
      const artwork = page.locator(`img[data-template-art="${theme.id}"]`);
      await expect(artwork).toHaveJSProperty("complete", true);
      expect(await artwork.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      await expect(scene.locator("header")).toHaveCSS("border-top-width", "0px");
      if (theme.id === "travel-tropical") {
        await expect(scene.locator("h1")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await expect(scene.locator("h1")).toHaveCSS("color", `rgb(${parseInt(theme.logo.slice(1, 3), 16)}, ${parseInt(theme.logo.slice(3, 5), 16)}, ${parseInt(theme.logo.slice(5, 7), 16)})`);
        const blueSegmentLabels = scene.locator("[data-testid='christmas-wheel'] svg text");
        await expect(blueSegmentLabels.nth(1)).toHaveAttribute("fill", "#ffffff");
      }
      const wheel = await scene.getByTestId("christmas-wheel").boundingBox();
      const button = await scene.getByRole("button", { name: "Jouer à la roue" }).boundingBox();
      const center = await scene.getByTestId("travel-wheel-center").boundingBox();
      expect(wheel).not.toBeNull(); expect(button).not.toBeNull(); expect(center).not.toBeNull();
      expect(button!.width / wheel!.width).toBeLessThan(0.72);
      expect(button!.height / wheel!.width).toBeGreaterThan(0.14);
      expect(center!.width / wheel!.width).toBeLessThan(0.25);
      await expect(scene.getByTestId("christmas-wheel-pointer").locator("circle")).toHaveCount(1);
      await page.screenshot({ path: info.outputPath(`${theme.id}-${width}.png`), fullPage: true, animations: "disabled" });
    }
  });
}

test("@visual-1280 section Voyage dédiée dans les deux éditeurs", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const mode of ["wizard-responsive-edit", "editor-prize-budget"]) {
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=classic&business=travel`);
    if (mode.startsWith("wizard")) await selectWizardStep(page, 2);
    const section = page.getByTestId("travel-template-options");
    await expect(page.getByRole("heading", { name: "Templates Voyage" })).toBeVisible();
    await expect(section).not.toContainText("Noël");
    for (const theme of TRAVEL_WHEEL_THEMES) {
      const card = section.getByRole("button", { name: new RegExp(theme.name) });
      await card.click();
      await expect(card).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByTestId("classic-template-options").getByRole("button", { name: new RegExp(theme.name) })).toHaveCount(0);
      if (mode.startsWith("wizard")) {
        await page.getByRole("button", { name: "Voir l’aperçu", exact: true }).click();
        const preview = page.getByRole("dialog", { name: "Aperçu du jeu" }).frameLocator("iframe");
        const artwork = preview.locator(`img[data-template-art="${theme.id}"]`);
        await expect(artwork).toHaveJSProperty("complete", true);
        expect(await artwork.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
        await page.keyboard.press("Escape");
      }
    }
    await captureVisualAt1280(page, info, `voyage-${mode}`);
  }
});
