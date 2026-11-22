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
  await page.goto("/dev/template-rendering-proof?mode=public&business=travel&template=travel-sunset-drive&background=%2335166c&prizes=headspa");
  await expect(page.getByTestId("christmas-wheel").locator("[data-segment-id]")).toHaveCount(8);
  await captureVisualAt1280(page, info, "sunset-huit-secteurs");
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

test("Sunset Drive adapte ses secteurs et conserve les lots en page et aperçu", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const mode of ["public", "game-preview"]) {
    for (const [prizes, expected] of [["default", 6], ["headspa", 8]] as const) {
      await page.goto(`/dev/template-rendering-proof?mode=${mode}&business=travel&template=travel-sunset-drive&background=%2335166c&prizes=${prizes}`);
      const wheel = page.getByTestId("christmas-wheel");
      await expect(wheel.locator("[data-segment-id]")).toHaveCount(expected);
      if (prizes === "headspa") {
        for (const id of ["discount15", "discount20", "voucher", "luxo", "headspa"]) await expect(wheel.locator(`[data-segment-id="${id}"]`)).toHaveCount(1);
        await expect(wheel.locator('[data-segment-id="lose"]')).toHaveCount(1);
        const labels = await wheel.locator("[data-wheel-label]").evaluateAll(nodes => nodes.map(node => {
          const rect = node.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        }));
        for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i], b = labels[j];
          expect(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top).toBe(false);
        }
        await page.screenshot({ path: info.outputPath(`sunset-8-${mode}.png`), fullPage: true, animations: "disabled" });
      }
      const button = wheel.getByRole("button", { name: "Jouer à la roue" });
      const bounds = await wheel.boundingBox();
      const buttonBounds = await button.boundingBox();
      expect(buttonBounds!.width / bounds!.width).toBeCloseTo(0.30, 2);
    }
  }
});

test("@visual-1280 Sunset Drive : couleurs fixes, police, taille et espacements dans le wizard", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/dev/template-rendering-proof?mode=wizard-responsive-edit&template=travel-sunset-drive&business=travel&secondary=Tentez%20votre%20chance');
  await selectWizardStep(page, 2);
  const primary = page.getByLabel("Couleur principale de la roue").first();
  await expect(primary).toBeDisabled();
  await expect(primary).toHaveValue("#ee3949");
  await expect(page.getByLabel("Couleur du texte principal")).toBeDisabled();
  await expect(page.getByLabel("Couleur du logo", { exact: true })).toBeDisabled();
  await page.locator('#wizard-appearance-colors').getByLabel("Police du texte").selectOption("playfair");
  await page.getByLabel("Taille de la police").first().fill("52");
  const spacings = ["Espacement sous le logo (px)", "Espacement entre le texte principal et le sous-titre (px)", "Espacement entre le texte et la roue (px)"];
  for (const label of spacings) await page.getByRole("slider", { name: label }).fill("0");
  async function previewMargins() {
    await page.getByRole("button", { name: "Voir l’aperçu", exact: true }).click();
    const preview = page.getByRole("dialog", { name: "Aperçu du jeu" }).getByTestId("draft-preview-viewport");
    const title = preview.locator("h1").first();
    const subtitle = preview.getByTestId("christmas-wheel-subtitle").first();
    await expect(title).toHaveCSS("color", "rgb(255, 240, 214)");
    await expect(title).toHaveCSS("font-family", /Playfair/);
    await expect(subtitle).toHaveCSS("color", "rgb(255, 240, 214)");
    await expect(preview.locator("header").first()).toHaveCSS("color", "rgb(255, 240, 214)");
    const values = await preview.evaluate(root => {
      const title = root.querySelector("h1")!;
      const subtitle = root.querySelector('[data-testid="christmas-wheel-subtitle"]')!;
      const wheel = root.querySelector('[data-testid="christmas-wheel"]')!;
      return [parseFloat(getComputedStyle(root.querySelector("header")!).marginBottom), parseFloat(getComputedStyle(subtitle).marginTop), parseFloat(getComputedStyle(wheel.parentElement!).marginTop), parseFloat(getComputedStyle(title).fontSize), parseFloat(getComputedStyle(root.querySelector("header p")!).fontSize)];
    });
    await page.keyboard.press("Escape");
    return values;
  }
  const zero = await previewMargins();
  expect(zero.slice(0, 3)).toEqual([0, 0, 0]);
  for (const label of spacings) await page.getByRole("slider", { name: label }).fill("40");
  const changed = await previewMargins();
  for (const margin of changed.slice(0, 3)) expect(margin).toBeGreaterThan(0);
  await page.getByLabel("Taille de la police").first().fill("34");
  const smaller = await previewMargins();
  expect(smaller[3]).toBeLessThan(changed[3]);
  await page.getByRole("slider", { name: "Taille du logo" }).fill("60");
  const smallLogo = await previewMargins();
  expect(smallLogo[4]).toBeLessThan(smaller[4]);
  await page.getByLabel("Couleur du texte principal").scrollIntoViewIfNeeded();
  await captureVisualAt1280(page, info, "sunset-reglages");
});

test("Sunset Drive : couleurs verrouillées dans l’éditeur classique", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/dev/template-rendering-proof?mode=editor-prize-budget&template=travel-sunset-drive&business=retail&secondary=Tentez%20votre%20chance');
  await page.getByLabel("Activer le mode expert").click();
  await expect(page.getByLabel("Couleur principale", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Couleur du texte principal", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Couleur du logo", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Couleur du logo", { exact: true })).toBeDisabled();
  const preview = page.locator('[data-template-id="travel-sunset-drive"]').first();
  const title = preview.locator("h1").first();
  await expect(title).toBeAttached();
  await expect(title).toHaveCSS("color", "rgb(255, 240, 214)");
  await expect(preview.getByTestId("christmas-wheel-subtitle")).toHaveCSS("color", "rgb(255, 240, 214)");
  await expect(preview.locator("header")).toHaveCSS("color", "rgb(255, 240, 214)");
  const logo = preview.locator("header p");
  const initialLogoSize = parseFloat(await logo.evaluate(el => getComputedStyle(el).fontSize));
  await page.getByRole("slider", { name: "Taille du logo" }).fill("60");
  await expect.poll(async () => parseFloat(await logo.evaluate(el => getComputedStyle(el).fontSize))).toBeLessThan(initialLogoSize);
  await page.getByRole("button", { name: "Playfair Display", exact: true }).first().click();
  await expect(title).toHaveCSS("font-family", /Playfair/);
  const size = page.getByLabel("Taille du texte (px)").first();
  const before = parseFloat(await title.evaluate(el => getComputedStyle(el).fontSize));
  await size.fill("52");
  await expect.poll(async () => parseFloat(await title.evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThan(before);
  for (const [label, selector, property] of [
    ["Espacement sous le logo (px)", "header", "marginBottom"],
    ["Espacement entre le texte principal et le sous-titre (px)", '[data-testid="christmas-wheel-subtitle"]', "marginTop"],
    ["Espacement entre le texte et la roue (px)", '[data-testid="christmas-wheel"]', "parentMarginTop"],
  ] as const) {
    await page.getByRole("slider", { name: label }).fill("0");
    await expect.poll(async () => parseFloat(await preview.locator(selector).first().evaluate((el, prop) => getComputedStyle(prop === "parentMarginTop" ? el.parentElement! : el)[prop === "parentMarginTop" ? "marginTop" : prop], property))).toBe(0);
  }
});

test("Sunset Drive conserve les couleurs fixes avec des réglages enregistrés différents", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const mode of ["public", "game-preview"]) {
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&business=travel&template=travel-sunset-drive&background=%2335166c&ink=%234488aa&secondary=Texte%20mixte`);
    const scene = page.getByTestId("christmas-wheel-scene");
    await expect(scene.locator("h1")).toHaveCSS("color", "rgb(255, 240, 214)");
    await expect(scene.getByTestId("christmas-wheel-subtitle")).toHaveCSS("color", "rgb(255, 240, 214)");
    await expect(scene.locator("header")).toHaveCSS("color", "rgb(255, 240, 214)");
  }
});
