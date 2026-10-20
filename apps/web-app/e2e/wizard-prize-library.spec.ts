import { expect, test, type Page } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

const suggestions = [
  { id: "mask", label: "MASQUE OFFERT", description: "Avec un soin visage payant.", probability: 10, estimatedUnitCost: 4 },
  { id: "care", label: "SOIN DES MAINS", description: "Un instant de soin à découvrir lors de votre prochaine visite.", probability: 20, estimatedUnitCost: 6 },
  { id: "discount", label: "-15% RITUEL", description: "Sur un rituel visage et corps à tarif normal.", probability: 40, estimatedUnitCost: 8 },
  { id: "gift", label: "CADEAU DÉCOUVERTE", description: "Un cadeau sans obligation d’achat.", probability: 5, estimatedUnitCost: 2 },
].map((item, index) => ({ ...item, industry: "Beauté", icon: index === 2 ? "discount" : "gift", isActive: true, sortOrder: index }));

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route("**/api/**", (route) => route.fulfill({ json: { suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});

async function openLibrary(page: Page, width = 1280, height = 720) {
  await page.setViewportSize({ width, height });
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=classic");
  await selectWizardStep(page, 3);
  await page.getByRole("button", { name: "Trouver des idées de lots", exact: true }).click();
  return page.getByRole("dialog", { name: "Ajouter des lots", exact: true });
}

test("@visual-1280 phase 2 : ajouts multiples, doublons, ajustement explicite et sauvegarde des champs suggérés", async ({ page }, info) => {
  const queries: string[] = [];
  await page.route("**/api/prize-suggestions?**", (route) => {
    queries.push(route.request().url());
    return route.fulfill({ json: { suggestions } });
  });
  const writes: Array<{ prizes: Array<{ id: string; label: string; probability: number; totalQuantity: number | null; estimatedUnitCost: number; usageConditions: string; purchaseRequired: boolean }> }> = [];
  await page.route("**/api/campaigns/setup", (route) => {
    writes.push(route.request().postDataJSON());
    return route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } });
  });
  const library = await openLibrary(page);
  await expect(library.getByTestId("wizard-prize-suggestion-card")).toHaveCount(4);
  const bounds = (await library.boundingBox())!;
  expect(bounds.width).toBeGreaterThanOrEqual(800);
  expect(bounds.width).toBeLessThanOrEqual(900);
  expect(new URL(queries[0]).searchParams.get("industry")).toBe("Beauté");
  const cards = library.getByTestId("wizard-prize-suggestion-card");
  expect((await cards.nth(1).boundingBox())!.x).toBeGreaterThan((await cards.first().boundingBox())!.x);
  await captureVisualAt1280(page, info, "bibliotheque-suggestions", 720);

  await library.getByRole("button", { name: "Ajouter : MASQUE OFFERT", exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(library.getByRole("button", { name: "Ajouté : MASQUE OFFERT", exact: true })).toBeDisabled();
  await library.getByRole("button", { name: "Ajouter : SOIN DES MAINS", exact: true }).click();
  await expect(library).toBeVisible();
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(3);
  await library.getByRole("button", { name: "Ajouter : -15% RITUEL", exact: true }).click();
  await expect(library.getByRole("heading", { name: "Ajustez la chance de ce lot" })).toBeVisible();
  await expect(library.getByRole("spinbutton")).toHaveValue("40");
  await expect(library.getByRole("alert")).toContainText("20 points");
  await captureVisualAt1280(page, info, "suggestion-ajuster-probabilite", 600);
  await expect(library.getByRole("spinbutton")).toBeInViewport();
  await expect(library.getByRole("alert")).toBeInViewport();
  await expect(library.getByRole("button", { name: "Ajouter le lot", exact: true })).toBeInViewport();
  await library.getByRole("button", { name: "Ajouter avec les 20 % disponibles", exact: true }).click();
  await expect(library.getByRole("button", { name: "Ajouté : -15% RITUEL", exact: true })).toBeDisabled();
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(4);
  await expect(page.getByTestId("wizard-prize-row").first().getByRole("spinbutton")).toHaveValue("50");

  await library.getByRole("button", { name: "Ajouter : CADEAU DÉCOUVERTE", exact: true }).click();
  await expect(library.getByRole("alert")).toContainText("5 points");
  await expect(page.getByRole("alert").filter({ hasText: /100 %/ })).toHaveCount(1);
  await library.getByRole("button", { name: "Ajouter le lot", exact: true }).click();
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(5);
  await library.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect(library).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Trouver des idées de lots", exact: true })).toBeFocused();
  expect(writes).toHaveLength(0);

  await page.getByTestId("wizard-prize-row").first().getByRole("spinbutton").fill("45");
  await page.getByRole("button", { name: "Modifier MASQUE OFFERT", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Modifier le lot" });
  await expect(editor.getByRole("checkbox", { name: /Un achat est nécessaire/ })).toBeChecked();
  await expect(editor.getByLabel("Conditions d’utilisation")).toHaveValue("Avec un soin visage payant.");
  await editor.getByLabel(/Nom du lot/).fill("MASQUE PERSONNALISÉ");
  await editor.getByRole("button", { name: "Enregistrer le lot", exact: true }).click();
  await page.getByRole("button", { name: "Trouver des idées de lots", exact: true }).click();
  await expect(library.getByRole("button", { name: "Ajouté : MASQUE OFFERT", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByTestId("wizard-footer").getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].prizes.map((prize) => prize.probability)).toEqual([45, 10, 20, 20, 5]);
  expect(writes[0].prizes[1]).toMatchObject({ label: "MASQUE PERSONNALISÉ", totalQuantity: null, estimatedUnitCost: 4, usageConditions: "Avec un soin visage payant.", purchaseRequired: true });
  expect(writes[0].prizes.some((prize) => /perdu/i.test(prize.label))).toBe(false);
});

test("phase 2 : suppression, réajout et abandon d’un ajustement ne changent pas les autres lots", async ({ page }) => {
  await page.route("**/api/prize-suggestions?**", (route) => route.fulfill({ json: { suggestions } }));
  const library = await openLibrary(page);
  await library.getByRole("button", { name: "Ajouter : MASQUE OFFERT", exact: true }).click();
  await library.getByRole("button", { name: "Terminer", exact: true }).click();
  await page.getByRole("button", { name: "Supprimer MASQUE OFFERT", exact: true }).click();
  await page.getByRole("dialog", { name: "Supprimer ce lot ?" }).getByRole("button", { name: "Supprimer le lot" }).click();
  await page.getByRole("button", { name: "Trouver des idées de lots", exact: true }).click();
  await expect(library.getByRole("button", { name: "Ajouter : MASQUE OFFERT", exact: true })).toBeEnabled();
  await library.getByRole("button", { name: "Ajouter : MASQUE OFFERT", exact: true }).click();
  await library.getByRole("button", { name: "Ajouter : SOIN DES MAINS", exact: true }).click();
  await library.getByRole("button", { name: "Ajouter : -15% RITUEL", exact: true }).click();
  await library.getByRole("button", { name: "Retour aux suggestions", exact: true }).click();
  await expect(library.getByRole("button", { name: "Ajouter : -15% RITUEL", exact: true })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(3);
  await expect(page.getByTestId("wizard-losing-probability")).toContainText("20 %");
});

for (const width of [320, 390]) {
  test(`phase 2 : bibliothèque et ajustement sur mobile ${width}px`, async ({ page }, info) => {
    await page.route("**/api/prize-suggestions?**", (route) => route.fulfill({ json: { suggestions } }));
    const library = await openLibrary(page, width, 740);
    expect((await library.boundingBox())!.width).toBe(width);
    expect((await library.boundingBox())!.height).toBe(740);
    const cards = library.getByTestId("wizard-prize-suggestion-card");
    expect((await cards.first().boundingBox())!.x).toBe((await cards.nth(1).boundingBox())!.x);
    await expect(library.getByRole("button", { name: "Terminer", exact: true })).toBeInViewport();
    await library.getByRole("button", { name: "Ajouter : SOIN DES MAINS", exact: true }).click();
    await library.getByRole("button", { name: "Ajouter : -15% RITUEL", exact: true }).click();
    await library.getByRole("spinbutton").fill("20");
    await expect(library.getByRole("alert")).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`bibliotheque-mobile-${width}.png`), animations: "disabled" });
    await library.getByRole("button", { name: "Ajouter le lot", exact: true }).click();
    await page.keyboard.press("Tab");
    expect(await library.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    await assertNoPageOverflow(page);
    await page.keyboard.press("Escape");
    await expect(library).toHaveCount(0);
    await expect(page.getByTestId("wizard-losing-probability")).toContainText("10 %");
  });
}

test("phase 2 : chargement, erreur puis nouvel essai, et état vide accessibles", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let outcome: "error" | "empty" = "error";
  await page.route("**/api/prize-suggestions?**", async (route) => {
    if (outcome === "error") {
      await gate;
      await route.fulfill({ status: 503, json: { error: "indisponible" } });
    } else {
      await route.fulfill({ json: { suggestions: [] } });
    }
  });
  const library = await openLibrary(page);
  await expect(library.getByRole("status").filter({ hasText: "Chargement des suggestions" })).toBeVisible();
  release();
  await expect(library.getByRole("alert")).toContainText("Impossible de charger");
  outcome = "empty";
  await library.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(library.getByRole("heading", { name: "Aucune suggestion pour cette activité" })).toBeVisible();
  await library.getByRole("button", { name: "Retour à ma composition", exact: true }).click();
  await expect(page.getByRole("button", { name: "Créer un lot", exact: true })).toBeVisible();
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(1);
});
