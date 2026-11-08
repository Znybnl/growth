import { expect, test } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});

test("mobile : la progression est compacte et le contexte de campagne reste visible", async ({ page }, info) => {
  for (const [width, height] of [[320, 568], [390, 740], [412, 844]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-create");
    const wizard = page.locator(".okado-wizard");
    const progress = page.locator(".wizard-progress");
    const selector = page.getByRole("combobox", { name: "Étape de création" });

    await expect(page.getByRole("heading", { name: "Créer une campagne", level: 1 })).toBeVisible();
    await expect(progress.getByText("Progression")).toBeHidden();
    await expect(selector.locator("option:checked")).toHaveText("Étape 1/5");
    await expect(progress).toHaveCSS("box-shadow", "none");
    expect((await progress.boundingBox())!.height).toBeLessThanOrEqual(54);
    await page.screenshot({ path: info.outputPath(`wizard-mobile-first-step-${width}.png`), animations: "disabled" });
    if (width === 320) {
      const firstGameChoice = page.getByTestId("wizard-game-choices").getByRole("button").first();
      await expect(firstGameChoice.getByRole("heading")).toBeInViewport();
    }

    await selector.selectOption("1");
    await expect(wizard).toHaveAttribute("data-step-index", "1");
    await expect(wizard.locator(".wizard-heading h1")).toHaveText(/\S+/);
    await expect(page.getByRole("heading", { name: "La promesse", level: 2 })).toBeVisible();
    await expect(page.locator(".wizard-step-kicker")).toBeHidden();
    await assertNoPageOverflow(page);

    await selector.selectOption("2");
    const shortcuts = page.getByRole("navigation", { name: "Accès rapide aux réglages d’apparence" });
    await page.locator(".okado-workspace-shell > div > main").evaluate(node => { node.scrollTop = 0; });
    await page.screenshot({ path: info.outputPath(`wizard-mobile-navigation-${width}.png`), animations: "disabled" });
    await expect(shortcuts.getByRole("link")).toHaveCount(4);
    await expect(shortcuts.getByRole("link", { name: "Templates" })).toHaveAttribute("href", "#wizard-appearance-templates");
    await expect(shortcuts.getByRole("link", { name: "Couleurs et texte" })).toHaveAttribute("href", "#wizard-appearance-colors");
    await expect(shortcuts.getByRole("link", { name: "Logo" })).toHaveAttribute("href", "#wizard-appearance-logo");
    await expect(shortcuts.getByRole("link", { name: "Fond et autres réglages" })).toHaveAttribute("href", "#wizard-appearance-advanced");
    await shortcuts.getByRole("link", { name: "Logo" }).click();
    await expect(page).toHaveURL(/#wizard-appearance-logo$/);
    await expect(page.locator("#wizard-appearance-logo")).toBeInViewport();
    await assertNoPageOverflow(page);

    const selectedTemplate = page.getByTestId("classic-template-options").locator('button[aria-pressed="true"]');
    await expect(selectedTemplate).toHaveCount(1);
    await expect(selectedTemplate.getByText("Sélectionné")).toBeVisible();
  }
});

test("@visual-1280 : étapes et accès Apparence restent cohérents sur ordinateur", async ({ page }, info) => {
  for (const height of [600, 720]) {
    await page.setViewportSize({ width: 1280, height });
    await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit");
    await selectWizardStep(page, 2);
    await expect(page.getByRole("heading", { name: "Créer une campagne", level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Étapes de création" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Accès rapide aux réglages d’apparence" })).toBeHidden();
    await expect(page.locator("#wizard-appearance-advanced")).toBeVisible();
    await captureVisualAt1280(page, info, `wizard-apparence-navigation-${height}`, height);
  }
});
