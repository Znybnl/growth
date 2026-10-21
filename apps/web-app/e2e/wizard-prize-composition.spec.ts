import { expect, test, type Page } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route("**/api/**", (route) => route.fulfill({ json: { suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

async function openPrizeStep(page: Page, width: number) {
  await page.setViewportSize({ width, height: 820 });
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=classic");
  await selectWizardStep(page, 3);
  await expect(page.getByTestId("wizard-prizes-step")).toBeVisible();
}

test("phase 1 : gérer les lots gagnants, calculer PERDU sans l’ajouter à la composition", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) && request.url().includes("/api/")) {
      writes.push(request.postData() ?? "");
    }
  });

  await openPrizeStep(page, 1280);
  const table = page.getByTestId("wizard-prize-table");
  await expect(table.getByTestId("wizard-prize-row")).toHaveCount(1);
  await expect(page.getByTestId("wizard-losing-probability")).toContainText("50 %");
  await expect(page.getByTestId("wizard-prize-distribution").getByTestId("wizard-losing-probability-segment")).toBeVisible();
  await expect(table.getByTestId("wizard-prize-row").filter({ hasText: "PERDU" })).toHaveCount(0);

  await table.getByRole("button", { name: "Dupliquer -10% PROCHAINE VISITE" }).click();
  const duplicate = page.getByRole("dialog", { name: "Dupliquer un lot" });
  await duplicate.getByLabel(/Chance de gain/).fill("25");
  await duplicate.getByRole("button", { name: "Ajouter le lot" }).click();
  await expect(table.getByTestId("wizard-prize-row")).toHaveCount(2);
  await expect(table.getByTestId("wizard-losing-probability")).toContainText("25 %");

  await page.getByRole("button", { name: "Créer un lot", exact: true }).click();
  const create = page.getByRole("dialog", { name: "Créer un lot" });
  await create.getByLabel(/Nom du lot/).fill("MASQUE OFFERT");
  await create.getByLabel(/Chance de gain/).fill("10");
  await create.getByLabel("Stock disponible").fill("12");
  await create.getByLabel("Conditions d’utilisation").fill("Avec un soin visage payant");
  await create.getByRole("button", { name: "Ajouter le lot" }).click();
  await expect(table.getByTestId("wizard-prize-row")).toHaveCount(3);
  await expect(table.getByTestId("wizard-losing-probability")).toContainText("15 %");

  await table.getByTestId("wizard-prize-row").nth(0).getByRole("button", { name: "Modifier -10% PROCHAINE VISITE" }).click();
  const edit = page.getByRole("dialog", { name: "Modifier le lot" });
  await edit.getByLabel(/Nom du lot/).fill("-15% PROCHAINE VISITE");
  await edit.getByLabel(/Chance de gain/).fill("60");
  await expect(page.getByRole("img", { name: /95 % de chances de gagner et 5 % de chances de perdre/ })).toBeVisible();
  await edit.getByRole("button", { name: "Enregistrer le lot" }).click();
  await expect(table.getByTestId("wizard-prize-row").first()).toContainText("-15% PROCHAINE VISITE");
  await expect(table.getByTestId("wizard-losing-probability")).toContainText("5 %");

  await table.getByTestId("wizard-prize-row").nth(2).getByRole("button", { name: "Supprimer MASQUE OFFERT" }).click();
  const confirmation = page.getByRole("dialog", { name: "Supprimer ce lot ?" });
  await confirmation.getByRole("button", { name: "Supprimer le lot" }).click();
  await expect(table.getByTestId("wizard-prize-row")).toHaveCount(2);
  await expect(table.getByTestId("wizard-losing-probability")).toContainText("15 %");
  await expect(table.getByTestId("wizard-prize-row").filter({ hasText: "PERDU" })).toHaveCount(0);
  await assertNoPageOverflow(page);
  expect(writes).toEqual([]);
});

test("phase 1 : mise en page compacte et édition utilisable sur mobile", async ({ page }, info) => {
  await openPrizeStep(page, 390);
  const table = page.getByTestId("wizard-prize-table");
  await expect(table.getByTestId("wizard-prize-row")).toHaveCount(1);
  await table.getByRole("spinbutton").fill("35");
  await expect(page.getByTestId("wizard-losing-probability")).toContainText("65 %");
  await table.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("lots-mobile.png"), animations: "disabled" });
  await assertNoPageOverflow(page);
  await table.getByRole("button", { name: "Modifier -10% PROCHAINE VISITE" }).click();
  const editor = page.getByRole("dialog", { name: "Modifier le lot" });
  await expect(editor).toBeVisible();
  expect((await editor.boundingBox())!.width).toBeGreaterThanOrEqual(380);
  await expect(editor.getByLabel(/Chance de gain/)).toBeVisible();
  await expect(editor.getByLabel(/Chance de gain/)).toHaveValue("35");
  await page.screenshot({ path: info.outputPath("editeur-mobile.png"), animations: "disabled" });
  await editor.getByRole("button", { name: "Fermer l’édition du lot" }).click();
  await expect(editor.getByText("Abandonner les modifications ?")).toHaveCount(0);
  await expect(editor).toHaveCount(0);
});

test("@visual-1280 phase 1 : dépasser provisoirement 100 %, ajuster en ligne puis enregistrer une composition valide", async ({ page }, info) => {
  const payloads: Array<{ prizes: Array<{ label: string; probability: number }>; rewardRules: { availableAfterHours: number; availabilityDurationDays: number; participationIntervalDays: number } }> = [];
  await page.route("**/api/campaigns/setup", async (route) => {
    payloads.push(route.request().postDataJSON());
    await route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } });
  });
  await openPrizeStep(page, 1280);
  const table = page.getByTestId("wizard-prize-table");
  const rules = page.getByTestId("wizard-prize-rules");
  const header = table.getByTestId("wizard-prize-table-header");
  for (const name of ["Chance", "Stock", "Coût"]) {
    await expect(header.getByText(name, { exact: true })).toHaveCSS("text-align", "left");
  }
  expect(Math.abs((await header.getByText("Chance", { exact: true }).boundingBox())!.x - (await table.getByRole("spinbutton").first().boundingBox())!.x)).toBeLessThan(1);
  await expect(rules).not.toHaveAttribute("open", "");
  expect((await rules.boundingBox())!.y).toBeGreaterThan((await table.boundingBox())!.y);

  await table.getByRole("button", { name: "Dupliquer -10% PROCHAINE VISITE" }).click();
  const duplicate = page.getByRole("dialog", { name: "Dupliquer un lot" });
  await duplicate.getByLabel(/Chance de gain/).fill("60");
  await expect(duplicate.getByRole("alert")).toContainText("dépassent 100 % de 10 points");
  await expect(page.getByRole("alert").filter({ hasText: /100 %/ })).toHaveCount(1);
  await captureVisualAt1280(page, info, "depassement-dans-editeur", 600);
  await expect(duplicate.getByRole("alert")).toBeInViewport();
  await duplicate.getByRole("button", { name: "Ajouter le lot" }).click();
  await expect(duplicate).toHaveCount(0);
  await expect(table.getByTestId("wizard-prize-row")).toHaveCount(2);
  await expect(page.getByRole("alert").filter({ hasText: /100 %/ })).toHaveCount(1);

  await page.getByTestId("wizard-footer").getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Composez vos lots", exact: true })).toBeVisible();
  await page.getByTestId("wizard-footer").getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /100 %/ })).toHaveCount(1);
  expect(payloads).toHaveLength(0);

  await table.getByRole("spinbutton").first().fill("40");
  await expect(page.getByRole("alert").filter({ hasText: /100 %/ })).toHaveCount(0);
  await expect(page.getByTestId("wizard-losing-probability")).toHaveCount(0);
  await table.getByRole("button", { name: "Modifier -10% PROCHAINE VISITE" }).last().click();
  const edit = page.getByRole("dialog", { name: "Modifier le lot" });
  const purchase = edit.getByRole("checkbox", { name: /Un achat est nécessaire/ });
  const conditions = edit.getByLabel("Conditions d’utilisation");
  expect((await purchase.boundingBox())!.y).toBeLessThan((await conditions.boundingBox())!.y);
  await edit.getByLabel(/Chance de gain/).fill("70");
  await expect(edit.getByRole("alert")).toContainText("dépassent 100 % de 10 points");
  await edit.getByRole("button", { name: "Enregistrer le lot" }).click();
  await expect(edit).toHaveCount(0);
  await expect(page.getByRole("alert").filter({ hasText: /100 %/ })).toHaveCount(1);
  await table.getByRole("spinbutton").first().fill("20");
  await expect(page.getByTestId("wizard-losing-probability")).toContainText("10 %");

  await rules.locator("summary").click();
  await rules.getByRole("checkbox", { name: /Le gain est utilisable à partir du lendemain/ }).check();
  await rules.getByLabel("Durée de validité du gain (jours)").fill("45");
  await rules.getByLabel("Délai minimum entre deux participations (jours)").fill("3");
  await expect(rules.locator("summary")).toContainText("Utilisable dès demain · Valable 45 jours · 1 participation tous les 3 jours");
  await rules.locator("summary").click();
  await page.getByTestId("wizard-prizes-step").scrollIntoViewIfNeeded();
  await captureVisualAt1280(page, info, "composition-et-regles", 720);
  await table.scrollIntoViewIfNeeded();
  await captureVisualAt1280(page, info, "tableau-et-probabilites", 600);

  await page.getByTestId("wizard-footer").getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect.poll(() => payloads.length).toBe(1);
  expect(payloads[0].prizes.map((prize) => prize.probability)).toEqual([20, 70]);
  expect(payloads[0].prizes.some((prize) => /perdu/i.test(prize.label))).toBe(false);
  expect(payloads[0].rewardRules).toMatchObject({ availableAfterHours: 24, availabilityDurationDays: 45, participationIntervalDays: 3 });
});

test("audit SFD : stock initial d’un nouveau lot et stock indépendant de sa copie dans un jeu existant", async ({ page }) => {
  const payloads: Array<{ prizes: Array<{ id: string; label: string; totalQuantity: number | null; remainingQuantity: number | null }> }> = [];
  await page.route("**/api/campaigns/setup", (route) => {
    payloads.push(route.request().postDataJSON());
    return route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } });
  });
  await openPrizeStep(page, 1280);
  await page.getByRole("button", { name: "Créer un lot", exact: true }).click();
  const create = page.getByRole("dialog", { name: "Créer un lot" });
  await create.getByLabel(/Nom du lot/).fill("SOIN OFFERT");
  await create.getByLabel("Stock disponible").fill("0");
  await create.getByRole("button", { name: "Ajouter le lot" }).click();
  await expect(create.getByRole("alert")).toContainText("supérieure à 0");
  await create.getByLabel("Stock disponible").fill("12");
  await create.getByRole("button", { name: "Ajouter le lot" }).click();
  await page.getByRole("button", { name: "Modifier SOIN OFFERT", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Modifier le lot" });
  await expect(edit.getByLabel("Stock disponible")).toHaveValue("12");
  await edit.getByLabel("Stock disponible").fill("4");
  await edit.getByRole("button", { name: "Enregistrer le lot" }).click();
  await page.getByRole("button", { name: "Dupliquer SOIN OFFERT", exact: true }).click();
  const duplicate = page.getByRole("dialog", { name: "Dupliquer un lot" });
  await expect(duplicate.getByLabel("Stock disponible")).toHaveValue("12");
  await duplicate.getByLabel(/Nom du lot/).fill("COPIE SOIN OFFERT");
  await duplicate.getByRole("button", { name: "Ajouter le lot" }).click();
  await page.getByTestId("wizard-footer").getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect.poll(() => payloads.length).toBe(1);
  const original = payloads[0].prizes.find((prize) => prize.label === "SOIN OFFERT")!;
  const copy = payloads[0].prizes.find((prize) => prize.label === "COPIE SOIN OFFERT")!;
  expect(original).toMatchObject({ totalQuantity: 12, remainingQuantity: 4 });
  expect(copy).toMatchObject({ totalQuantity: 12, remainingQuantity: 12 });
  expect(copy.id).not.toBe(original.id);
});

test("audit SFD : total à 0 %, publication et poursuite bloquées avec une seule alerte", async ({ page }) => {
  const writes: unknown[] = [];
  page.on("request", (request) => { if (request.method() === "POST" && request.url().includes("/api/")) writes.push(request.url()); });
  await openPrizeStep(page, 1280);
  await page.getByTestId("wizard-prize-row").getByRole("spinbutton").fill("0");
  await expect(page.getByText("Aucun lot gagnant configuré", { exact: true })).toBeVisible();
  await expect(page.getByTestId("wizard-losing-probability")).toContainText("100 %");
  await page.getByTestId("wizard-footer").getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Composez vos lots", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /supérieure à 0/ })).toHaveCount(1);
  expect(writes).toHaveLength(0);
});
