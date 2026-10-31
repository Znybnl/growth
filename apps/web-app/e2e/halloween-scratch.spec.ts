import { expect, test } from "@playwright/test";
import { rejectAnalyticsForVisualTests, assertNoPageOverflow } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] }, suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});

for (const viewport of [{ width: 1280, height: 720 }, { width: 1280, height: 600 }, { width: 390, height: 844 }]) {
  test(`@visual-1280 Halloween ticket : page et iframe ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.goto("/dev/halloween-scratch?mode=public");
    const foil = page.locator('canvas[data-foil-texture="scratch-halloween-gold"]');
    await expect(foil).toHaveAttribute("data-foil-loaded", "true");
    expect(await foil.evaluate((node: HTMLCanvasElement) => node.getContext("2d")!.getImageData(260, 215, 1, 1).data[3])).toBe(255);
    await expect(page.getByAltText("Spécial Halloween")).toBeVisible();
    await assertNoPageOverflow(page);
    await page.screenshot({ path: info.outputPath(`halloween-public-${viewport.width}x${viewport.height}.png`) });
    await page.goto("/dev/halloween-scratch?mode=live");
    const frame = page.frameLocator("iframe");
    await expect(frame.locator('canvas[data-foil-texture="scratch-halloween-gold"]')).toHaveAttribute("data-foil-loaded", "true");
    const art = frame.locator('img[data-template-art="scratch-halloween-gold"]');
    await expect.poll(() => art.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
    expect(await art.evaluate(node => node.getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(740);
    await page.getByTestId("wizard-phone-preview").screenshot({ path: info.outputPath(`halloween-live-${viewport.width}x${viewport.height}.png`) });
  });
}

test("ticket Halloween : grattage réel, résultat et rappel unique", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/halloween-scratch?mode=interaction");
  const foil = page.locator("canvas");
  await expect(foil).toHaveAttribute("data-foil-loaded", "true");
  await page.evaluate(() => document.fonts.ready);
  const box = (await foil.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  for (let row = 1; row < 12 && await foil.count(); row++) {
    const y = box.y + box.height * row / 12;
    await page.mouse.move(box.x + box.width * .05, y, { steps: 10 });
    await page.mouse.move(box.x + box.width * .95, y, { steps: 20 });
  }
  await page.mouse.up();
  await expect(page.getByTestId("scratch-starts")).toHaveText("1");
  await expect(page.getByTestId("scratch-reveals")).toHaveText("1");
  await expect(page.getByText("UNE SURPRISE HALLOWEEN").last()).toBeVisible();
});

test("sauvegarde du template Halloween avec les réglages existants", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.route("**/api/campaigns/setup", route => route.fulfill({ json: { campaign: { id: "fixture-halloween-saved" } } }));
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=scratch-nude-classic&business=retail");
  await selectWizardStep(page, 2);
  await page.getByRole("button", { name: /Halloween doré/ }).click();
  const save = page.waitForRequest(r => r.url().endsWith("/api/campaigns/setup") && r.method() === "POST");
  await page.getByTestId("wizard-save-toolbar").getByRole("button", { name: /Enregistrer/ }).click();
  const payload = (await save).postDataJSON();
  expect(payload.gameType).toBe("scratch");
  expect(payload.presentation.layout.templateId).toBe("scratch-halloween-gold");
  expect(payload.presentation.heading.fontFamily).toBe("bodoni");
  expect(payload.presentation.logo.textColor).toBe("#ffffff");
  expect(payload.prizes.length).toBeGreaterThan(0);
});

test("logo et texte personnalisables, décor Halloween fixe", async ({ page }) => {
  await page.goto("/dev/halloween-scratch");
  await page.getByLabel("Titre de test").fill("Ma surprise\nHalloween");
  await expect(page.getByRole("heading")).toHaveText("Ma surprise Halloween");
  await page.getByLabel("Logo de test").selectOption("image");
  await expect.poll(() => page.getByRole("img", { name: "Logo", exact: true }).evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  await page.getByLabel("Fond de test").selectOption("image");
  await expect(page.locator('img[data-template-art="scratch-halloween-gold"]')).toHaveCount(1);
  await expect(page.getByAltText("Spécial Halloween")).toBeVisible();
});

for (const height of [720, 600]) test(`@visual-1280 sélection Halloween wizard et éditeur ${height}px`, async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height });
  for (const mode of ["editor-prize-budget", "wizard-responsive-edit"]) {
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=scratch-nude-classic&business=retail`);
    if (mode.startsWith("wizard")) await selectWizardStep(page, 2);
    const card = page.getByRole("button", { name: /Halloween doré/ });
    await card.scrollIntoViewIfNeeded(); await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("scratch-template-thumbnail-scratch-halloween-gold")).toHaveCount(1);
    await assertNoPageOverflow(page);
    await page.screenshot({ path: info.outputPath(`halloween-${mode}-${height}.png`) });
  }
});

test("sélectionner Halloween conserve la promesse principale par défaut", async ({ page }) => {
  const initialPromise = "Grattez le ticket pour jouer !";
  for (const mode of ["wizard-responsive-edit", "editor-prize-budget"]) {
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=scratch-nude-classic&business=retail&headline=${encodeURIComponent(initialPromise)}`);
    const promise = mode.startsWith("wizard")
      ? page.getByLabel(/Promesse affichée au client/)
      : page.getByLabel("Phrase affichée sur la page de jeu");
    if (mode.startsWith("wizard")) await selectWizardStep(page, 2);
    const card = page.getByRole("button", { name: /Halloween doré/ });
    await card.scrollIntoViewIfNeeded();
    await card.click();
    if (mode.startsWith("wizard")) await selectWizardStep(page, 1);
    await expect(promise).toHaveValue(initialPromise);
  }
});
