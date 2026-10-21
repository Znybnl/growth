import { expect, test, type Page } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

const suggestions = [
  { id: "mask", label: "MASQUE OFFERT", description: "Avec un soin visage payant.", estimatedUnitCost: 2 },
  { id: "hands", label: "SOIN DES MAINS", description: "Un soin découverte.", estimatedUnitCost: 5 },
  { id: "ritual", label: "RITUEL OFFERT", description: "Avec une prestation payante.", estimatedUnitCost: 10 },
  { id: "gift", label: "CADEAU SIGNATURE", description: "Sans obligation d’achat.", estimatedUnitCost: 20 },
].map((item, sortOrder) => ({ ...item, industry: "Beauté", icon: "gift", isActive: true, probability: 10, sortOrder }));

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route("**/api/**", (route) => route.fulfill({ json: { suggestions: [], items: [], assets: {}, emailCount: 0 } }));
  await page.route("**/api/prize-suggestions?**", (route) => route.fulfill({ json: { suggestions } }));
});

async function open(page: Page, width = 1280, height = 720) {
  await page.setViewportSize({ width, height });
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=classic");
  await selectWizardStep(page, 3);
}
async function library(page: Page) {
  await page.getByRole("button", { name: "Trouver des idées de lots", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Ajouter des lots", exact: true });
  await dialog.getByRole("tab", { name: "Compositions", exact: true }).click();
  return dialog;
}

test("@visual-1280 phase 4 : détail, remplacement confirmé, copie modifiable et sauvegarde sans PERDU", async ({ page }, info) => {
  const writes: Array<{ prizes: Array<Record<string, unknown>> }> = [];
  await page.route("**/api/campaigns/setup", (route) => { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } }); });
  await open(page);
  const dialog = await library(page);
  await expect(dialog.getByTestId("wizard-composition-card")).toHaveCount(3);
  for (const name of ["Budget maîtrisé", "Équilibré", "Généreux"]) {
    await expect(dialog.getByRole("button", { name: `Voir la composition : ${name}`, exact: true })).toBeInViewport({ ratio: 1 });
  }
  await captureVisualAt1280(page, info, "compositions", 720);
  await dialog.getByRole("button", { name: "Voir la composition : Équilibré", exact: true }).click();
  await expect(dialog.getByRole("list", { name: "Lots de la composition" }).getByRole("listitem")).toHaveCount(3);
  await expect(dialog).toContainText("70 %");
  await expect(dialog).toContainText("30 %");
  await dialog.getByRole("button", { name: "Utiliser cette composition", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Remplacer votre composition actuelle ?", exact: true })).toBeVisible();
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(1);
  await captureVisualAt1280(page, info, "composition-confirmer", 600);
  await expect(dialog.getByRole("button", { name: "Remplacer les lots", exact: true })).toBeInViewport();
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(1);
  expect(writes).toHaveLength(0);
  await dialog.getByRole("button", { name: "Utiliser cette composition", exact: true }).click();
  await dialog.getByRole("button", { name: "Remplacer les lots", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(3);
  await expect(page.getByTestId("wizard-losing-probability")).toContainText("30 %");
  await page.getByRole("button", { name: "Modifier MASQUE OFFERT", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Modifier le lot", exact: true });
  await expect(editor.getByLabel("Conditions d’utilisation")).toHaveValue("Avec un soin visage payant.");
  await expect(editor.getByRole("checkbox", { name: /Un achat est nécessaire/ })).toBeChecked();
  await editor.getByLabel(/Nom du lot/).fill("MASQUE PERSONNALISÉ");
  await editor.getByRole("button", { name: "Enregistrer le lot", exact: true }).click();
  await page.getByTestId("wizard-footer").getByRole("button", { name: "Enregistrer le brouillon", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].prizes.map((prize) => prize.probability)).toEqual([35, 23.33, 11.67]);
  expect(writes[0].prizes[0]).toMatchObject({ label: "MASQUE PERSONNALISÉ", totalQuantity: null, remainingQuantity: null, estimatedUnitCost: 2, purchaseRequired: true });
  expect(writes[0].prizes.every((prize) => typeof prize.id === "string" && prize.id.includes("-composition-") && prize.id.length < 120 && prize.label !== "PERDU")).toBe(true);
  await assertNoPageOverflow(page);
});

test("phase 4 : jeu vide, application directe et indépendance des onglets", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Supprimer -10% PROCHAINE VISITE", exact: true }).click();
  await page.getByRole("dialog", { name: "Supprimer ce lot ?", exact: true }).getByRole("button", { name: "Supprimer le lot", exact: true }).click();
  const dialog = await library(page);
  await dialog.getByRole("button", { name: "Voir la composition : Généreux", exact: true }).click();
  await dialog.getByRole("button", { name: "Utiliser cette composition", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(4);
  await expect(page.getByTestId("wizard-losing-probability")).toHaveCount(0);
  await expect(page.getByRole("img", { name: /100 % de chances de gagner et 0 % de chances de perdre/ })).toBeVisible();
  const reopened = await library(page);
  await reopened.getByRole("tab", { name: "Suggestions", exact: true }).click();
  await expect(reopened.getByRole("button", { name: /Ajouté :/ })).toHaveCount(4);
  await reopened.getByRole("tab", { name: "Compositions", exact: true }).click();
  await reopened.getByRole("button", { name: "Voir la composition : Budget maîtrisé", exact: true }).click();
  await reopened.getByRole("button", { name: "Utiliser cette composition", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(reopened).toBeVisible();
  await expect(reopened.getByRole("button", { name: "Utiliser cette composition", exact: true })).toBeVisible();
  await reopened.getByRole("tab", { name: "Suggestions", exact: true }).click();
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(4);
});

for (const width of [320, 390]) test(`phase 4 : navigation et confirmation contenues sur mobile ${width}`, async ({ page }, info) => {
  await open(page, width, 740);
  const dialog = await library(page);
  await expect(dialog.getByRole("tab", { name: "Compositions", exact: true })).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: info.outputPath(`compositions-mobile-${width}.png`), animations: "disabled" });
  await dialog.getByRole("button", { name: "Voir la composition : Budget maîtrisé", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Utiliser cette composition", exact: true })).toBeInViewport({ ratio: 1 });
  await dialog.getByRole("button", { name: "Utiliser cette composition", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Remplacer les lots", exact: true })).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: info.outputPath(`composition-confirmation-mobile-${width}.png`), animations: "disabled" });
  await assertNoPageOverflow(page);
  const dimensions = await dialog.evaluate((element) => ({ width: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1);
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await dialog.getByRole("button", { name: "Toutes les compositions", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Voir la composition : Budget maîtrisé", exact: true })).toBeFocused();
});

test("phase 4 : catalogue vide, erreur et clavier sans écriture", async ({ page }) => {
  let fail = true;
  await page.route("**/api/prize-suggestions?**", (route) => fail ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { suggestions: [] } }));
  await open(page);
  const dialog = await library(page);
  await expect(dialog.getByRole("alert")).toContainText("Impossible de charger");
  fail = false;
  await dialog.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(dialog).toContainText("Aucune composition disponible");
  await expect(dialog.getByRole("button", { name: "Utiliser cette composition", exact: true })).toHaveCount(0);
  await dialog.getByRole("tab", { name: "Compositions", exact: true }).focus();
  await page.keyboard.press("Home");
  await expect(dialog.getByRole("tab", { name: "Suggestions", exact: true })).toBeFocused();
  await page.keyboard.press("End");
  await expect(dialog.getByRole("tab", { name: "Compositions", exact: true })).toBeFocused();
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(1);
});
