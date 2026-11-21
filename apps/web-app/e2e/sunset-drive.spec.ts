import { expect, test } from "@playwright/test";
import { captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] }, suggestions: [], items: [], assets: {} } }));
});

test("Sunset Drive : typographie, fond, lots et interaction", async ({ page }, info) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/dev/template-rendering-proof?mode=public&business=travel&template=travel-sunset-drive&background=%2335166c&headline=Sunset%20Drive&secondary=Tentez%20votre%20chance`);
    const scene = page.getByTestId("christmas-wheel-scene");
    const heading = scene.locator("h1");
    const subtitle = scene.getByTestId("christmas-wheel-subtitle");
    await expect(heading).toHaveCSS("text-transform", "uppercase");
    await expect(heading).toHaveCSS("font-weight", "800");
    await expect(subtitle).toHaveCSS("font-weight", "600");
    await expect(subtitle).toHaveCSS("font-style", "italic");
    await expect(subtitle).toHaveText("Tentez votre chance");
    await expect(heading).toHaveCSS("color", "rgb(255, 240, 214)");
    await expect(subtitle).toHaveCSS("color", "rgb(255, 240, 214)");
    if (width === 390) {
      expect(parseFloat(await heading.evaluate(e => getComputedStyle(e).fontSize))).toBeCloseTo(42.12, 1);
      expect(parseFloat(await subtitle.evaluate(e => getComputedStyle(e).fontSize))).toBeCloseTo(19.89, 1);
    }
    await expect(page.locator('img[data-template-art="travel-sunset-drive"]')).toHaveJSProperty("complete", true);
    await expect(scene.getByTestId("christmas-wheel").locator("[data-segment-id]").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`sunset-${width}.png`), fullPage: true, animations: "disabled" });
  }
  await page.goto('/dev/christmas-wheels?template=travel-sunset-drive&mode=interaction');
  await page.getByRole("button", { name: "Jouer à la roue" }).click();
  await expect(page.getByTestId("action-count")).toHaveText("1");
  await page.getByRole("button", { name: "Jouer à la roue" }).click();
  await expect(page.getByTestId("result-count")).toHaveText("1", { timeout: 8000 });
});

test("@visual-1280 Sunset Drive dans les éditeurs", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const mode of ["wizard-responsive-edit", "editor-prize-budget"]) {
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=classic&business=travel`);
    if (mode.startsWith("wizard")) await selectWizardStep(page, 2);
    const card = page.getByTestId("travel-template-options").getByRole("button", { name: /Sunset Drive/ });
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await card.scrollIntoViewIfNeeded();
    await captureVisualAt1280(page, info, `sunset-${mode}`);
  }
});

test("Sunset Drive disponible hors secteur Voyage et taille du titre modifiable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const mode of ["wizard-responsive-edit", "editor-prize-budget"]) {
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=classic&business=retail`);
    if (mode.startsWith("wizard")) await selectWizardStep(page, 2);
    const card = page.getByTestId("classic-template-options").getByRole("button", { name: /Sunset Drive/ });
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/template-rendering-proof?mode=public&business=travel&template=travel-sunset-drive&background=%2335166c&headingSize=48');
  expect(parseFloat(await page.locator('h1').first().evaluate(e => getComputedStyle(e).fontSize))).toBeCloseTo(50.54, 1);
});
