import { expect, test } from "@playwright/test";
import { selectWizardStep } from "./helpers/wizard-step";

test.beforeEach(async ({ page }) => {
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

