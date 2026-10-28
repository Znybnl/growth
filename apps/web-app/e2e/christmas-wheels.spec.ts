import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CHRISTMAS_WHEEL_THEMES } from "../src/lib/christmas-wheel-themes";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] }, suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});

test("les six assets Noël sont servis et prévus dans le package Vercel", async ({ request }) => {
  for (const theme of CHRISTMAS_WHEEL_THEMES) {
    for (const suffix of ["", "-thumb"]) {
      const response = await request.get(`/images/wheel-templates/${theme.id}${suffix}.webp`);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("image/webp");
      expect((await response.body()).length).toBeLessThan(suffix ? 25_000 : 300_000);
    }
  }
  expect(readFileSync(resolve(__dirname, "../../../.vercelignore"), "utf8")).toContain("!apps/web-app/public/images/wheel-templates/christmas-*.webp");
});

for (const theme of CHRISTMAS_WHEEL_THEMES) {
  for (const width of [320, 390]) {
    test(`${theme.name} : vraie page mobile ${width}px et aperçu intégré`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (/hydration|hydrated/i.test(message.text())) errors.push(message.text()); });
      await page.setViewportSize({ width, height: 740 });
      await page.goto(`/dev/christmas-wheels?template=${theme.id}&mode=public`);
      await expect(page.locator('[data-fixture-ready="true"]')).toHaveCount(1);
      const scene = page.getByTestId("christmas-wheel-scene");
      const artwork = scene.locator(`img[data-template-art="${theme.id}"]`);
      await expect(artwork).toHaveJSProperty("complete", true);
      expect(await artwork.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      await expect(scene.getByRole("heading")).toHaveText("JOUEZ & GAGNEZ");
      const button = scene.getByRole("button", { name: "Jouer à la roue" });
      await expect(button).toBeInViewport();
      await expect(button.locator("svg")).toHaveCount(0);
      const labelIds = await scene.locator("[data-segment-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-segment-id")));
      for (let i = 0; i < 4; i++) expect(labelIds).toContain(`christmas-prize-${i}`);
      const subtitle = (await scene.getByTestId("christmas-wheel-subtitle").boundingBox())!;
      const pointer = (await scene.getByTestId("christmas-wheel-pointer").boundingBox())!;
      expect(pointer.y).toBeGreaterThan(subtitle.y + subtitle.height);
      await assertNoPageOverflow(page);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: info.outputPath(`${theme.id}-public-${width}.png`), fullPage: true, caret: "initial" });
      const publicHeadingFont = await scene.getByRole("heading").evaluate(node => parseFloat(getComputedStyle(node).fontSize) / node.closest("section")!.clientWidth);
      await page.goto(`/dev/christmas-wheels?template=${theme.id}`);
      await expect(page.locator('[data-fixture-ready="true"]')).toHaveCount(1);
      await expect(page.locator(`img[data-template-art="${theme.id}"]`)).toHaveJSProperty("complete", true);
      const previewHeadingFont = await page.getByTestId("christmas-wheel-scene").getByRole("heading").evaluate(node => parseFloat(getComputedStyle(node).fontSize) / node.closest("section")!.clientWidth);
      expect(previewHeadingFont).toBeCloseTo(publicHeadingFont, 3);
      await page.getByTestId("wizard-phone-preview").screenshot({ path: info.outputPath(`${theme.id}-embedded-${width}.png`), caret: "initial" });
      expect(errors).toEqual([]);
    });
  }

  test(`${theme.name} : un seul tirage, disque animé et contour/pointeur fixes`, async ({ page }) => {
    await page.goto(`/dev/christmas-wheels?template=${theme.id}&mode=interaction`);
    await expect(page.locator('[data-fixture-ready="true"]')).toHaveCount(1);
    const button = page.getByRole("button", { name: "Jouer à la roue" });
    await button.click();
    await expect(page.getByTestId("action-count")).toHaveText("1");
    await button.click();
    await expect(button).toBeDisabled();
    await expect(page.getByTestId("christmas-wheel-rotor")).not.toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    for (const testId of ["christmas-wheel-rim", "christmas-wheel-pointer"]) {
      await expect(page.getByTestId(testId)).toHaveCSS("transform", "none");
      expect(await page.getByTestId(testId).evaluate(node => node.closest('[data-testid="christmas-wheel-rotor"]'))).toBeNull();
    }
    await expect(page.getByTestId("result-count")).toHaveText("1", { timeout: 7000 });
    await expect(page.getByTestId("action-count")).toHaveText("1");
  });
}

test("personnalisation texte/logo et remplacement du fond natif sans fuite entre templates", async ({ page }) => {
  await page.goto("/dev/christmas-wheels");
  await expect(page.locator('[data-fixture-ready="true"]')).toHaveCount(1);
  const scene = page.getByTestId("christmas-wheel-scene");
  await page.getByLabel("Titre de test").fill("Une belle surprise\npour vous");
  await page.getByLabel("Nom de test").fill("Maison Camille");
  await expect(scene.getByRole("heading")).toHaveText("Une belle surprise pour vous");
  await expect(scene).toContainText("Maison Camille");
  await page.getByLabel("Logo de test").selectOption("image");
  await expect(scene.locator("header img")).toHaveJSProperty("complete", true);
  await expect(scene.locator("header span")).toHaveCount(0);
  await page.getByLabel("Fond de test").selectOption("image");
  await expect(scene.locator("img[data-template-art]")).toHaveCount(0);
  await page.getByLabel("Modèle de test").selectOption("christmas-traditional");
  await expect(scene.locator("img[data-template-art]")).toHaveCount(0);
  await page.getByLabel("Fond de test").selectOption("native");
  await expect(scene.locator('img[data-template-art="christmas-traditional"]')).toHaveCount(1);
  await page.getByLabel("Couleur du titre").fill("#134e4a");
  await expect(scene.getByRole("heading")).toHaveCSS("color", "rgb(19, 78, 74)");
  await expect(scene.getByRole("heading")).toHaveCSS("-webkit-text-fill-color", "rgb(19, 78, 74)");
  await page.getByLabel("Fond de test").selectOption("color");
  await expect(scene.locator("img")).toHaveCount(1); // Logo only.
  await expect(scene).toHaveCSS("background-color", "rgb(224, 242, 254)");
});

test("@visual-1280 les trois modèles dans le vrai wizard, 1280×720 et 1280×600", async ({ page }, info) => {
  const warnings: string[] = [];
  page.on("console", message => {
    if (message.text().includes("/images/wheel-templates/christmas-") && /invalid.*position/i.test(message.text())) warnings.push(message.text());
  });
  for (const height of [720, 600]) {
    await page.setViewportSize({ width: 1280, height });
    await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=classic&business=beauty");
    await selectWizardStep(page, 2);
    for (const theme of CHRISTMAS_WHEEL_THEMES) {
      const card = page.getByRole("button", { name: new RegExp(theme.name) });
      await card.scrollIntoViewIfNeeded(); await card.click();
      await expect(card.locator("img")).toHaveJSProperty("complete", true);
      await captureVisualAt1280(page, info, theme.id, height);
      await expect(page.getByTestId("wizard-footer").getByRole("button", { name: /Enregistrer/ })).toBeEnabled();
      await page.getByRole("button", { name: "Voir l’aperçu", exact: true }).click();
      const phone = page.getByRole("dialog", { name: "Aperçu du jeu" }).frameLocator("iframe");
      await expect(phone.getByRole("button", { name: "Jouer à la roue" })).toBeInViewport();
      await expect(phone.locator(`img[data-template-art="${theme.id}"]`)).toHaveJSProperty("complete", true);
      await captureVisualAt1280(page, info, `${theme.id}-apercu`, height);
      await page.keyboard.press("Escape");
    }
  }
  expect(warnings).toEqual([]);
});

test("@visual-1280 sélection dans l'éditeur classique et le wizard d'un commerce", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/dev/template-rendering-proof?mode=editor-prize-budget&template=classic&business=retail");
  for (const theme of CHRISTMAS_WHEEL_THEMES) {
    const card = page.getByRole("button", { name: new RegExp(theme.name) });
    await card.scrollIntoViewIfNeeded(); await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(`img[data-template-art="${theme.id}"]`).first()).toHaveJSProperty("complete", true);
  }
  await captureVisualAt1280(page, info, "noel-editeur-classique");
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=classic&business=retail");
  await selectWizardStep(page, 2);
  for (const theme of CHRISTMAS_WHEEL_THEMES) {
    const card = page.getByRole("button", { name: new RegExp(theme.name) });
    await card.scrollIntoViewIfNeeded(); await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
  }
  await captureVisualAt1280(page, info, "noel-wizard-commerce");
});
