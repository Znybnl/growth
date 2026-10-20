import { expect, test, type Page } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

const ideas = Array.from({ length: 10 }, (_, index) => ({
  id: `audit-idea-${index}`, industry: "Beauté", icon: "gift", isActive: true, sortOrder: index,
  label: `${index + 1}. RITUEL VISAGE ET CORPS — UNE PARENTHÈSE DE SOIN POUR VOTRE PROCHAINE VISITE`,
  description: "Valable avec un soin visage payant, sur rendez-vous, selon les disponibilités de l’établissement. Les conditions restent personnalisables par le marchand.",
  probability: 2, estimatedUnitCost: 4,
}));

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route("**/api/**", (route) => route.fulfill({ json: { suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});

async function open(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=classic");
  await selectWizardStep(page, 3);
}

test("@visual-1280 audit SFD : catalogue dense, libellés longs, tableau et panneau à 1280×720/600", async ({ page }, info) => {
  await page.route("**/api/prize-suggestions?**", (route) => route.fulfill({ json: { suggestions: ideas } }));
  for (const height of [720, 600]) {
    await open(page, 1280, height);
    await page.getByRole("button", { name: "Trouver des idées de lots", exact: true }).click();
    const library = page.getByRole("dialog", { name: "Ajouter des lots" });
    const content = library.getByTestId("wizard-prize-library-content");
    await expect(library.getByTestId("wizard-prize-suggestion-card")).toHaveCount(10);
    expect(await content.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
    expect(await library.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await captureVisualAt1280(page, info, "catalogue-dense", height);
    for (let index = 0; index < 10; index += 1) {
      await library.getByTestId("wizard-prize-suggestion-card").nth(index).getByRole("button").click();
    }
    await expect(library.getByRole("button", { name: /Ajouté :/ })).toHaveCount(10);
    await expect(library.getByRole("button", { name: "Terminer", exact: true })).toBeInViewport();
    await captureVisualAt1280(page, info, "catalogue-fin-de-liste", height);
    await library.getByRole("button", { name: "Terminer", exact: true }).click();
    const rows = page.getByTestId("wizard-prize-row");
    await expect(rows).toHaveCount(11);
    await rows.nth(1).scrollIntoViewIfNeeded();
    const row = rows.nth(1);
    expect(await row.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    const cost = (await row.locator(":scope > p").last().boundingBox())!;
    const actions = (await row.locator(":scope > div").last().boundingBox())!;
    expect(cost.x + cost.width).toBeLessThanOrEqual(actions.x);
    await captureVisualAt1280(page, info, "composition-libelles-longs", height);
    await row.getByRole("button", { name: /^Modifier / }).click();
    const editor = page.getByRole("dialog", { name: "Modifier le lot" });
    await expect(editor.getByLabel(/Nom du lot/)).toHaveValue(ideas[0].label);
    await expect(editor.getByLabel(/Nom du lot/)).toHaveAttribute("maxlength", "120");
    await expect(editor.getByText(`${ideas[0].label.length}/120 caractères`, { exact: true })).toBeVisible();
    await expect(editor.getByRole("button", { name: "Enregistrer le lot", exact: true })).toBeInViewport();
    await captureVisualAt1280(page, info, "editeur-libelle-long", height);
    await page.keyboard.press("Escape");
    await assertNoPageOverflow(page);
  }
});

test("audit SFD : catalogue dense et panneau sur mobile 320/390 px", async ({ page }, info) => {
  await page.route("**/api/prize-suggestions?**", (route) => route.fulfill({ json: { suggestions: ideas } }));
  for (const width of [320, 390]) {
    await open(page, width, 740);
    await page.getByRole("button", { name: "Trouver des idées de lots", exact: true }).click();
    const library = page.getByRole("dialog", { name: "Ajouter des lots" });
    await expect(library.getByTestId("wizard-prize-suggestion-card")).toHaveCount(10);
    expect(await library.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath(`catalogue-mobile-${width}.png`), animations: "disabled" });
    await library.getByTestId("wizard-prize-suggestion-card").last().getByRole("button").click();
    await expect(library.getByRole("button", { name: "Terminer", exact: true })).toBeInViewport();
    await library.getByRole("button", { name: "Terminer", exact: true }).click();
    const row = page.getByTestId("wizard-prize-row").last();
    await row.scrollIntoViewIfNeeded();
    expect((await row.getByRole("button", { name: ideas[9].label, exact: true }).boundingBox())!.y)
      .toBeGreaterThanOrEqual((await page.getByTestId("wizard-save-toolbar").boundingBox())!.y + (await page.getByTestId("wizard-save-toolbar").boundingBox())!.height);
    expect(await row.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath(`composition-mobile-${width}.png`), animations: "disabled" });
    await row.getByRole("button", { name: /^Modifier / }).click();
    const editor = page.getByRole("dialog", { name: "Modifier le lot" });
    expect(await editor.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await expect(editor.getByRole("button", { name: "Enregistrer le lot", exact: true })).toBeInViewport();
    await page.screenshot({ path: info.outputPath(`editeur-mobile-${width}.png`), animations: "disabled" });
    await page.keyboard.press("Escape");
    await assertNoPageOverflow(page);
  }
});

test("@visual-1280 audit SFD : états erreur puis vide de la bibliothèque", async ({ page }, info) => {
  let failed = true;
  await page.route("**/api/prize-suggestions?**", (route) => route.fulfill(failed
    ? { status: 503, json: { error: "indisponible" } }
    : { json: { suggestions: [] } }));
  await open(page, 1280, 600);
  await page.getByRole("button", { name: "Trouver des idées de lots", exact: true }).click();
  const library = page.getByRole("dialog", { name: "Ajouter des lots" });
  await expect(library.getByRole("alert")).toBeVisible();
  await captureVisualAt1280(page, info, "bibliotheque-erreur", 600);
  failed = false;
  await library.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(library.getByRole("heading", { name: "Aucune suggestion pour cette activité" })).toBeVisible();
  await captureVisualAt1280(page, info, "bibliotheque-vide", 600);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Trouver des idées de lots", exact: true })).toBeFocused();
});
