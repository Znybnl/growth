import { expect, test } from "@playwright/test";
import { selectWizardStep } from "./helpers/wizard-step";
import { captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route("**/api/**", (route) => route.fulfill({ json: { campaign: { actions: [] }, suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});

test("la catégorie générale est nommée Autres templates pour les roues et tickets", async ({ page }) => {
  test.setTimeout(90_000);
  for (const mode of ["wizard-responsive-edit", "editor-prize-budget"]) {
    for (const template of ["classic", "scratch-nude-classic"]) {
      await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=${template}&business=beauty`, { waitUntil: "domcontentloaded" });
      if (mode.startsWith("wizard")) await selectWizardStep(page, 2);
      await expect(page.getByRole("heading", { name: "Autres templates", exact: true })).toBeVisible();
    }
  }
});

test("Noël rose poudré est classé Beauté et reste disponible aux autres secteurs", async ({ page }) => {
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=classic&business=beauty", { waitUntil: "domcontentloaded" });
  await selectWizardStep(page, 2);
  const beautyGallery = page.locator('section[aria-labelledby="beauty-wheel-templates-title"]');
  const christmasRose = beautyGallery.getByRole("button", { name: /Noël rose poudré/ });
  await expect(christmasRose).toBeVisible();
  await expect(page.getByTestId("classic-template-options").getByRole("button", { name: /Noël rose poudré/ })).toHaveCount(0);
  await christmasRose.click();
  await expect(christmasRose).toHaveAttribute("aria-pressed", "true");

  await page.goto("/dev/template-rendering-proof?mode=editor-prize-budget&template=classic&business=beauty", { waitUntil: "domcontentloaded" });
  const editorChristmasRose = page.locator('section[aria-labelledby="beauty-wheel-templates-title"]').getByRole("button", { name: /Noël rose poudré/ });
  await expect(editorChristmasRose).toBeVisible();

  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=classic&business=retail", { waitUntil: "domcontentloaded" });
  await selectWizardStep(page, 2);
  await expect(page.getByTestId("classic-template-options").getByRole("button", { name: /Noël rose poudré/ })).toBeVisible();
});

test("@visual-1280 le ticket Noël rose poudré est dans Templates Beauté sans doublon", async ({ page }, testInfo) => {
  test.setTimeout(90_000);

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["wizard-responsive-edit", "editor-prize-budget"]) {
      const assetsLoaded = mode === "editor-prize-budget"
        ? page.waitForResponse((response) => response.url().includes("/api/campaigns/template-proof-campaign/assets"))
        : null;
      await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=scratch-nude-classic&business=beauty`, { waitUntil: "domcontentloaded" });
      if (assetsLoaded) await assetsLoaded;
      if (mode.startsWith("wizard")) await selectWizardStep(page, 2);

      const beautyGallery = page.locator('section[aria-labelledby="beauty-scratch-templates-title"]');
      const christmasRose = beautyGallery.getByRole("button", { name: /Noël rose poudré/ });
      await expect(christmasRose).toBeVisible();
      await expect(page.getByTestId("classic-template-options").getByRole("button", { name: /Noël rose poudré/ })).toHaveCount(0);
      await christmasRose.click();
      await expect(christmasRose).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("textbox", { name: /Couleur principale du ticket/ })).toHaveValue("#c6a0aa");
      if (width === 1280) {
        await page.setViewportSize({ width: 1280, height: 720 });
        await christmasRose.scrollIntoViewIfNeeded();
        await captureVisualAt1280(page, testInfo, `${mode}-beauty-christmas-rose-scratch`);
      }
    }
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  for (const mode of ["wizard-responsive-edit", "editor-prize-budget"]) {
    const assetsLoaded = mode === "editor-prize-budget"
      ? page.waitForResponse((response) => response.url().includes("/api/campaigns/template-proof-campaign/assets"))
      : null;
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=scratch-nude-classic&business=retail`, { waitUntil: "domcontentloaded" });
    if (assetsLoaded) await assetsLoaded;
    if (mode.startsWith("wizard")) await selectWizardStep(page, 2);
    await expect(page.getByTestId("classic-template-options").getByRole("button", { name: /Noël rose poudré/ })).toBeVisible();
  }
});

