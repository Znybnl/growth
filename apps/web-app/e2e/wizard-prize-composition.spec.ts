import { expect, test, type Page } from "@playwright/test";
import { assertNoPageOverflow, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
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

test("phase 1 : mise en page compacte et édition utilisable sur mobile", async ({ page }) => {
  await openPrizeStep(page, 390);
  const table = page.getByTestId("wizard-prize-table");
  await expect(table.getByTestId("wizard-prize-row")).toHaveCount(1);
  await assertNoPageOverflow(page);
  await table.getByRole("button", { name: "Modifier -10% PROCHAINE VISITE" }).click();
  const editor = page.getByRole("dialog", { name: "Modifier le lot" });
  await expect(editor).toBeVisible();
  expect((await editor.boundingBox())!.width).toBeGreaterThanOrEqual(380);
  await expect(editor.getByLabel(/Chance de gain/)).toBeVisible();
  await editor.getByRole("button", { name: "Fermer l’édition du lot" }).click();
  await expect(editor.getByText("Abandonner les modifications ?")).toHaveCount(0);
  await expect(editor).toHaveCount(0);
});
