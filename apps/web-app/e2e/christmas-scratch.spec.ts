import { expect, test } from "@playwright/test";
import { CHRISTMAS_SCRATCH_TEMPLATES, christmasScratchTemplate } from "../src/lib/christmas-scratch-templates";
const SELECTABLE_FESTIVE_TEMPLATES = CHRISTMAS_SCRATCH_TEMPLATES.filter(({ id }) => id !== "scratch-christmas-retro");
const NON_SEASONAL_TEMPLATES = new Set([
  "scratch-christmas-evergreen",
  "scratch-christmas-champagne",
  "scratch-christmas-retro",
  "scratch-christmas-noir-or",
]);
const ISSUE_724_ILLUSTRATED_TEMPLATES = new Set([
  "scratch-christmas-evergreen",
  "scratch-christmas-champagne",
  "scratch-christmas-retro",
  "scratch-christmas-noir-or",
]);
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";
test.use({ hasTouch: true });
test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] }, suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});
for (const item of CHRISTMAS_SCRATCH_TEMPLATES) {
  const theme = christmasScratchTemplate(item.id)!;
  for (const width of [320, 390]) test(`${theme.name} ticket mobile ${width}px : texture opaque et aperçu`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 740 });
    await page.goto(`/dev/christmas-scratch?template=${theme.id}&mode=public`);
    await expect(page.locator('[data-fixture-ready="true"]')).toHaveCount(1);
    const foil = page.locator(`canvas[data-foil-texture="${theme.id}"]`);
    await expect(foil).toHaveAttribute("data-foil-loaded", "true");
    const expectedScratchShape = theme.scratchShape ?? "default";
    await expect(foil).toHaveAttribute("data-scratch-shape", expectedScratchShape);
    const surface = page.getByTestId("scratch-ticket-surface");
    await expect(surface).toHaveAttribute("data-scratch-shape", expectedScratchShape);
    if (["scratch-christmas-evergreen", "scratch-christmas-champagne", "scratch-christmas-noir-or"].includes(theme.id)) {
      const geometry = await surface.evaluate((element) => {
        const surfaceElement = element as HTMLElement;
        const style = getComputedStyle(surfaceElement);
        const transform = new DOMMatrixReadOnly(style.transform);
        return {
          ratio: surfaceElement.offsetWidth / surfaceElement.offsetHeight,
          rotationDeg: Math.atan2(transform.b, transform.a) * (180 / Math.PI),
          clipPath: style.clipPath,
        };
      });
      expect(geometry.ratio).toBeCloseTo(1.55, 1);
      expect(Math.abs(geometry.rotationDeg)).toBeGreaterThanOrEqual(0.8);
      expect(Math.abs(geometry.rotationDeg)).toBeLessThanOrEqual(1.3);
      expect(geometry.clipPath).toContain("polygon(");
    }
    const [surfaceClip, foilClip] = await Promise.all([
      surface.evaluate(element => getComputedStyle(element).clipPath),
      foil.evaluate(element => getComputedStyle(element).clipPath),
    ]);
    expect(foilClip).toBe(surfaceClip);
    const pixels = await foil.evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d")!;
      return [
        Array.from(ctx.getImageData(260, 215, 1, 1).data),
        Array.from(ctx.getImageData(20, 20, 1, 1).data),
      ];
    });
    expect(pixels[0][3]).toBe(255);
    expect(pixels[1][3]).toBe(255);
    if (ISSUE_724_ILLUSTRATED_TEMPLATES.has(theme.id)) {
      await expect(foil).not.toHaveAttribute("data-foil-instruction");
      const backdrop = page.getByTestId("scratch-result-backdrop");
      await expect(backdrop).toBeVisible();
      const badge = page.getByTestId(theme.id === "scratch-christmas-retro" ? "retro-scratch-logo-badge" : "issue724-scratch-logo-badge");
      await expect(badge).toBeVisible();
      const badgeBounds = (await badge.boundingBox())!;
      expect(badgeBounds.width).toBeGreaterThanOrEqual(theme.id === "scratch-christmas-retro" ? 64 : 74);
      expect(badgeBounds.width).toBeLessThanOrEqual(theme.id === "scratch-christmas-retro" ? 88 : 96);
    }
    await expect(surface).toBeInViewport();
    if (theme.id === "scratch-christmas-retro") {
      expect(pixels[0][0] - pixels[0][2]).toBeGreaterThan(20);
      const headingWeight = await page.getByRole("heading").evaluate(element => Number(getComputedStyle(element).fontWeight));
      expect(headingWeight).toBeGreaterThanOrEqual(700);
    }
    await expect(page.getByText("Le résultat s'affiche automatiquement.", { exact: true })).toHaveCount(0);
    const experience = page.locator(".okado-public-experience");
    const artwork = experience.locator(`img[data-template-art="${theme.id}"]`);
    await expect(artwork).toHaveJSProperty("complete", true);
    if (theme.id === "scratch-christmas-evergreen") {
      await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.currentSrc)).toContain("festive-gift-wrap-green-background-v3.webp");
      await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    }
    const experienceBounds = (await experience.boundingBox())!;
    const artworkBounds = (await artwork.boundingBox())!;
    expect(artworkBounds.y + artworkBounds.height).toBeGreaterThanOrEqual(experienceBounds.y + experienceBounds.height - 1);
    await assertNoPageOverflow(page);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: info.outputPath(`${theme.id}-public-${width}.png`), fullPage: true, caret: "initial" });
    await page.goto(`/dev/christmas-scratch?template=${theme.id}`);
    await expect(page.locator('[data-fixture-ready="true"]')).toHaveCount(1);
    await expect(page.locator(`canvas[data-foil-texture="${theme.id}"]`)).toHaveAttribute("data-foil-loaded", "true");
    const previewScreen = page.locator('[data-testid="wizard-phone-preview"] > div.h-full');
    const previewSurface = page.getByTestId("wizard-phone-preview").locator(`[data-template-id="${theme.id}"]`);
    const previewArtwork = previewSurface.locator(`img[data-template-art="${theme.id}"]`);
    await expect(previewSurface).toBeVisible();
    const [surfaceBottom, screenBottom, artworkBottom] = await Promise.all([
      previewSurface.evaluate((element) => element.getBoundingClientRect().bottom),
      previewScreen.evaluate((element) => element.getBoundingClientRect().bottom),
      previewArtwork.evaluate((element) => element.getBoundingClientRect().bottom),
    ]);
    expect(surfaceBottom).toBeGreaterThanOrEqual(screenBottom - 1);
    expect(artworkBottom).toBeGreaterThanOrEqual(screenBottom - 1);
    await page.getByTestId("wizard-phone-preview").screenshot({ path: info.outputPath(`${theme.id}-embedded-${width}.png`), caret: "initial" });
    expect(errors).toEqual([]);
  });
  test(`${theme.name} : grattage réel et une seule révélation`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`/dev/christmas-scratch?template=${theme.id}&mode=interaction`);
    await expect(page.locator('[data-fixture-ready="true"]')).toHaveCount(1);
    const foil = page.locator("canvas");
    await expect(page.getByTestId("scratch-result-label")).toHaveCount(0);
    await expect(page.getByText("Ticket à gratter", { exact: false })).toHaveCount(0);
    await expect(foil).toHaveAttribute("data-foil-loaded", "true");
    await page.evaluate(() => document.fonts.ready);
    const box = (await foil.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    if (ISSUE_724_ILLUSTRATED_TEMPLATES.has(theme.id)) {
      await expect(page.getByTestId("scratch-result-backdrop")).toBeVisible();
      await expect(page.getByTestId("scratch-result-label")).toHaveText("UNE SURPRISE");
    }
    for (let row = 1; row < 12 && await foil.count(); row++) {
      const y = box.y + box.height * row / 12;
      await page.mouse.move(box.x + box.width * (row % 2 ? .05 : .95), y, { steps: 10 });
      await page.mouse.move(box.x + box.width * (row % 2 ? .95 : .05), y, { steps: 20 });
    }
    await page.mouse.up();
    await expect(page.getByTestId("scratch-starts")).toHaveText("1");
    await expect(page.getByTestId("scratch-reveals")).toHaveText("1");
    await expect(page.getByText("UNE SURPRISE").last()).toBeVisible();
  });
}
test("fonds manuels, titre et logo image restent personnalisables", async ({ page }) => {
  await page.goto("/dev/christmas-scratch");
  await expect(page.locator('[data-fixture-ready="true"]')).toHaveCount(1);
  await page.getByLabel("Titre de test").fill("Votre surprise\nà découvrir");
  await expect(page.getByRole("heading")).toHaveText("Votre surprise à découvrir");
  await page.getByLabel("Logo de test").selectOption("image");
  const logo = page.getByRole("img", { name: "Logo", exact: true });
  await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.getByLabel("Fond de test").selectOption("image");
  await expect(page.locator("img[data-template-art]")).toHaveCount(0);
  await page.getByLabel("Modèle de test").selectOption("scratch-christmas-traditional");
  await expect(page.locator("img[data-template-art]")).toHaveCount(0);
  await page.getByLabel("Fond de test").selectOption("color");
  await expect(page.locator('[data-template-id="scratch-christmas-traditional"]')).toHaveCSS("background-color", "rgb(224, 242, 254)");
  await page.getByLabel("Fond de test").selectOption("native");
  await expect(page.locator('img[data-template-art="scratch-christmas-traditional"]')).toHaveCount(1);
});

test("grattage tactile réel et aperçu non interactif", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto("/dev/christmas-scratch?mode=interaction");
  await expect(page.locator('[data-fixture-ready="true"]')).toHaveCount(1);
  const foil = page.locator("canvas");
  await expect(foil).toHaveAttribute("data-foil-loaded", "true");
  const box = (await foil.boundingBox())!;
  for (let row = 2; row <= 10 && await foil.count(); row++) {
    for (let column = 2; column <= 10 && await foil.count(); column++) {
      if ((row - 6) ** 2 + (column - 6) ** 2 > 20) continue;
      await page.touchscreen.tap(box.x + box.width * column / 12, box.y + box.height * row / 12);
    }
  }
  await expect(page.getByTestId("scratch-starts")).toHaveText("1");
  await expect(page.getByTestId("scratch-reveals")).toHaveText("1");
  await page.goto("/dev/christmas-scratch");
  await expect(foil).toHaveAttribute("data-foil-loaded", "true");
  await foil.tap();
  await expect(page.getByTestId("scratch-foil-first-paint")).toHaveCount(1);
});

test("@visual-1280 tickets festifs dans l'éditeur classique, tous secteurs", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/dev/template-rendering-proof?mode=editor-prize-budget&template=scratch-nude-classic&business=retail");
  await expect(page.getByRole("button", { name: /Rayons rétro/ })).toHaveCount(0);
  for (const item of SELECTABLE_FESTIVE_TEMPLATES) {
    const theme = christmasScratchTemplate(item.id)!;
    const card = page.getByRole("button", { name: new RegExp(theme.name) });
    await card.scrollIntoViewIfNeeded(); await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    if (NON_SEASONAL_TEMPLATES.has(theme.id)) await expect(card).not.toContainText(/noël/i);
    await expect(page.locator(`canvas[data-foil-texture="${theme.id}"]`)).toHaveAttribute("data-foil-loaded", "true");
  }
  await captureVisualAt1280(page, info, "tickets-festifs-editeur-classique");
});
test("@visual-1280 tickets festifs dans le wizard et aperçu, 1280×720 / 1280×600", async ({ page }, info) => {
  const imageWarnings: string[] = [];
  page.on("console", message => {
    if (/beauty-foil-|wheel-templates\/christmas-/.test(message.text()) && /invalid.*position|height value of 0/i.test(message.text())) imageWarnings.push(message.text());
  });
  for (const height of [720, 600]) {
    await page.setViewportSize({ width: 1280, height });
    await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=scratch-nude-classic&business=retail");
    await selectWizardStep(page, 2);
    await expect(page.getByRole("button", { name: /Rayons rétro/ })).toHaveCount(0);
    for (const item of SELECTABLE_FESTIVE_TEMPLATES) {
      const theme = christmasScratchTemplate(item.id)!;
      const card = page.getByRole("button", { name: new RegExp(theme.name) });
      await card.scrollIntoViewIfNeeded(); await card.click();
      await expect(card).toHaveAttribute("aria-pressed", "true");
      if (NON_SEASONAL_TEMPLATES.has(theme.id)) await expect(card).not.toContainText(/noël/i);
      await captureVisualAt1280(page, info, theme.id, height);
      await page.getByRole("button", { name: "Voir l’aperçu", exact: true }).click();
      const frame = page.getByRole("dialog", { name: "Aperçu du jeu" }).frameLocator("iframe");
      await expect(frame.locator(`canvas[data-foil-texture="${theme.id}"]`)).toHaveAttribute("data-foil-loaded", "true");
      await captureVisualAt1280(page, info, `${theme.id}-apercu`, height);
      await page.keyboard.press("Escape");
    }
  }
  expect(imageWarnings).toEqual([]);
});
