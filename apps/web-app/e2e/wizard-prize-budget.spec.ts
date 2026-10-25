import { expect, test, type Page } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route("**/api/**", (route) => route.fulfill({ json: { suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});
async function open(page: Page, width = 1280, mode = "wizard-responsive-edit", template = "classic") {
  await page.setViewportSize({ width, height: 720 });
  await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=${template}`);
  await selectWizardStep(page, 3);
}
async function removeFirst(page: Page) {
  await page.getByRole("button", { name: "Supprimer -10% PROCHAINE VISITE", exact: true }).click();
  await page.getByRole("dialog", { name: "Supprimer ce lot ?", exact: true }).getByRole("button", { name: "Supprimer le lot", exact: true }).click();
}
async function add(page: Page, label: string, probability: string, cost?: string) {
  await page.getByRole("button", { name: "Créer un lot", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Créer un lot", exact: true });
  await editor.getByLabel(/Nom du lot/).fill(label);
  await editor.getByLabel(/Chance de gain/).fill(probability);
  if (cost !== undefined) await editor.getByLabel(/^Coût unitaire estimé/).fill(cost);
  await editor.getByRole("button", { name: "Ajouter le lot", exact: true }).click();
}

test("@visual-1280 phase 5 : exemple SFD, budget réactif, coût inconnu et saisie explicite zéro", async ({ page }, info) => {
  const writes: Array<{ prizes: Array<{ label: string; estimatedUnitCost: number; estimatedUnitCostKnown?: boolean }> }> = [];
  await page.route("**/api/campaigns/setup", (route) => { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } }); });
  await open(page);
  await removeFirst(page);
  await add(page, "RITUEL", "3", "20");
  await add(page, "MASQUE", "17", "4");
  await add(page, "RÉDUCTION", "30", "6");
  const budget = page.getByTestId("wizard-prize-budget");
  await expect(budget.getByTestId("wizard-budget-average")).toContainText("3,08");
  await expect(budget.getByTestId("wizard-budget-projection")).toContainText("308,00");
  await budget.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await captureVisualAt1280(page, info, "budget-complet", 720);
  await page.getByRole("button", { name: "Modifier MASQUE", exact: true }).click();
  let editor = page.getByRole("dialog", { name: "Modifier le lot", exact: true });
  await editor.getByLabel(/^Coût unitaire estimé/).fill("");
  await editor.getByRole("button", { name: "Enregistrer le lot", exact: true }).click();
  await expect(budget).toContainText("Estimation incomplète");
  await expect(budget.getByTestId("wizard-budget-average")).toHaveText("—");
  await budget.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await captureVisualAt1280(page, info, "budget-incomplet", 600);
  await budget.getByRole("button", { name: "Renseigner le coût de MASQUE", exact: true }).click();
  editor = page.getByRole("dialog", { name: "Modifier le lot", exact: true });
  await expect(editor.getByLabel(/^Coût unitaire estimé/)).toHaveValue("");
  await editor.getByLabel(/^Coût unitaire estimé/).fill("9");
  await editor.getByRole("button", { name: "Annuler", exact: true }).click();
  await editor.getByRole("button", { name: "Continuer l’édition", exact: true }).click();
  await expect(editor.getByRole("alert").filter({ hasText: "Abandonner les modifications" })).toHaveCount(0);
  await editor.getByRole("button", { name: "Annuler", exact: true }).click();
  await editor.getByRole("button", { name: "Abandonner", exact: true }).click();
  await expect(budget).toContainText("Estimation incomplète");
  await page.getByTestId("wizard-footer").getByRole("button", { name: "Enregistrer le brouillon", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].prizes.find((item) => item.label === "MASQUE")).toMatchObject({ estimatedUnitCost: 0, estimatedUnitCostKnown: false });
  const savedDialog = page.getByRole("dialog", { name: "Votre jeu est enregistré.", exact: true });
  await expect(savedDialog).toBeVisible();
  await expect(savedDialog.getByRole("button", { name: "Fermer la confirmation d’enregistrement", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(savedDialog).toBeHidden();
  await budget.getByRole("button", { name: "Renseigner le coût de MASQUE", exact: true }).click();
  editor = page.getByRole("dialog", { name: "Modifier le lot", exact: true });
  await editor.getByLabel(/^Coût unitaire estimé/).fill("0");
  await editor.getByRole("button", { name: "Enregistrer le lot", exact: true }).click();
  await expect(budget).not.toContainText("Estimation incomplète");
  await expect(budget.getByTestId("wizard-budget-average")).toContainText("2,40");
});

test("phase 5 : état vide et trois entrées vers les bons onglets", async ({ page }) => {
  await open(page); await removeFirst(page);
  for (const [button, tab] of [["Créer rapidement", "Compositions"], ["Explorer les suggestions", "Suggestions"], ["Retrouver mes lots précédents", "Mes lots"]]) {
    await page.getByRole("button", { name: new RegExp(`^${button}`) }).click();
    const dialog = page.getByRole("dialog", { name: "Ajouter des lots", exact: true });
    await expect(dialog.getByRole("tab", { name: tab, exact: true })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("wizard-prize-row")).toHaveCount(0);
  }
  await page.getByRole("button", { name: /^Créer mes lots/ }).click();
  await expect(page.getByRole("dialog", { name: "Créer un lot", exact: true })).toBeVisible();
});

test("@visual-1280 phase 5 : paramètres explicites, limites et sauvegarde sans correction silencieuse", async ({ page }, info) => {
  const writes: Array<{ rewardRules: { availabilityDurationDays: number; participationIntervalDays: number } }> = [];
  await page.route("**/api/campaigns/setup", (route) => { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } }); });
  await open(page);
  const rules = page.getByTestId("wizard-prize-rules");
  await rules.locator("summary").click();
  await rules.getByLabel("Durée de validité du gain (jours)", { exact: false }).fill("366");
  await rules.getByLabel("Délai minimum entre deux participations (jours)", { exact: false }).fill("0");
  await expect(rules.locator('[aria-invalid="true"]')).toHaveCount(2);
  await rules.getByLabel("Durée de validité du gain (jours)", { exact: false }).evaluate((element) => element.scrollIntoView({ block: "center" }));
  await captureVisualAt1280(page, info, "regles-invalides", 600);
  await page.getByTestId("wizard-footer").getByRole("button", { name: "Enregistrer le brouillon", exact: true }).click();
  expect(writes).toHaveLength(0);
  await rules.getByLabel("Durée de validité du gain (jours)", { exact: false }).fill("30");
  await rules.getByLabel("Délai minimum entre deux participations (jours)", { exact: false }).fill("2");
  await expect(rules.locator('[aria-invalid="true"]')).toHaveCount(0);
  await rules.locator("summary").click();
  await expect(rules.locator("summary")).toContainText("Valable 30 jours");
  await expect(rules.locator("summary")).toContainText("tous les 2 jours");
  await page.getByTestId("wizard-footer").getByRole("button", { name: "Enregistrer le brouillon", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].rewardRules).toMatchObject({ availabilityDurationDays: 30, participationIntervalDays: 2 });
});

for (const width of [320, 390]) test(`phase 5 : budget, coût manquant et panneau mobile ${width}`, async ({ page }, info) => {
  await open(page, width);
  const budget = page.getByTestId("wizard-prize-budget");
  await budget.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expect(budget).toContainText("Estimation incomplète");
  await page.screenshot({ path: info.outputPath(`budget-mobile-${width}.png`), animations: "disabled" });
  await assertNoPageOverflow(page);
  const bounds = await budget.evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
  await budget.getByRole("button", { name: /^Renseigner le coût/ }).click();
  const editor = page.getByRole("dialog", { name: "Modifier le lot", exact: true });
  await editor.getByLabel(/^Coût unitaire estimé/).fill("1");
  await expect(editor.getByRole("button", { name: "Enregistrer le lot", exact: true })).toBeInViewport();
  await editor.getByRole("button", { name: "Enregistrer le lot", exact: true }).click();
  await expect(budget.getByTestId("wizard-budget-average")).toContainText("0,50");
});

for (const template of ["classic", "scratch-nude-classic"]) test(`phase 5 : jeu publié ${template}, règles et valeurs conservées`, async ({ page }) => {
  const writes: Array<{ isActive: boolean; gameType: string; prizes: Array<{ probability: number; totalQuantity: null; estimatedUnitCostKnown?: boolean }> }> = [];
  await page.route("**/api/campaigns/setup", (route) => { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } }); });
  await open(page, 1280, "wizard-responsive-edit-published", template);
  await page.getByTestId("wizard-footer").getByRole("button", { name: "Enregistrer les modifications", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({ isActive: true, gameType: template.includes("scratch") ? "scratch" : "wheel" });
  expect(writes[0].prizes[0]).toMatchObject({ probability: 50, totalQuantity: null, estimatedUnitCostKnown: false });
});

test("@visual-1280 phase 5 : coût inconnu préservé dans l’éditeur classique", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/dev/template-rendering-proof?mode=editor-prize-budget&template=classic");
  const cost = page.getByLabel("Coût unitaire", { exact: true });
  await expect(cost).toHaveValue("");
  await cost.fill("0");
  await expect(cost).toHaveValue("0");
  await cost.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await captureVisualAt1280(page, info, "cout-classique-zero", 720);
  await cost.fill("");
  await expect(cost).toHaveValue("");
  await assertNoPageOverflow(page);
});
