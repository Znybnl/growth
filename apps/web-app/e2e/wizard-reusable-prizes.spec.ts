import { expect, test, type Page } from "@playwright/test";
import { rejectAnalyticsForVisualTests, captureVisualAt1280, assertNoPageOverflow } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

const previous = [
  { id: "old-limited", sourceCampaignId: "old-game", sourceCampaignTitle: "Le jeu du printemps", lastUsedAt: "2026-10-20T10:00:00Z", label: "SOIN OFFERT", probability: 10, estimatedUnitCost: 8, totalQuantity: 20, purchaseRequired: true, usageConditions: "Avec un rituel payant." },
  { id: "old-unlimited", sourceCampaignId: "old-game", sourceCampaignTitle: "Le jeu du printemps", lastUsedAt: "2026-10-19T10:00:00Z", label: "-10% PROCHAINE VISITE", probability: 20, estimatedUnitCost: 4, totalQuantity: null, purchaseRequired: false, usageConditions: "Sur une prestation au choix." },
];
test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route("**/api/**", (route) => route.fulfill({ json: { suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});
async function open(page: Page, width = 1280, height = 720, mode = "wizard-responsive-edit") {
  await page.setViewportSize({ width, height });
  await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=classic`);
  await selectWizardStep(page, 3);
  await page.getByRole("button", { name: "Trouver des idées de lots", exact: true }).click();
  return page.getByRole("dialog", { name: "Ajouter des lots", exact: true });
}

test("@visual-1280 phase 3 : copie limitée confirmée, indépendante, personnalisable et sans stock consommé", async ({ page }, info) => {
  const reads: string[] = [];
  await page.route("**/api/merchant/prize-library?**", (route) => { reads.push(route.request().url()); return route.fulfill({ json: { prizes: previous } }); });
  const writes: Array<{ prizes: Array<Record<string, unknown>> }> = [];
  await page.route("**/api/campaigns/setup", (route) => { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } }); });
  const library = await open(page);
  expect(reads).toHaveLength(0);
  await expect(library.getByRole("tab", { name: "Suggestions", exact: true })).toHaveAttribute("aria-selected", "true");
  await library.getByRole("tab", { name: "Mes lots", exact: true }).click();
  await expect(library.getByTestId("wizard-prize-suggestion-card")).toHaveCount(2);
  expect(new URL(reads[0]).searchParams.get("excludeCampaignId")).toBe("template-proof-campaign");
  await expect(library).toContainText("Le jeu du printemps");
  await captureVisualAt1280(page, info, "mes-lots", 720);
  await library.getByRole("button", { name: "Ajouter : SOIN OFFERT", exact: true }).click();
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(1);
  await expect(library.getByLabel("Nouveau stock initial")).toHaveValue("20");
  await expect(library).toContainText("Le stock restant de l’ancien jeu n’est jamais repris.");
  await library.getByLabel("Nouveau stock initial").fill("7");
  await captureVisualAt1280(page, info, "copie-confirmer-stock", 600);
  await expect(library.getByLabel("Nouveau stock initial")).toBeInViewport({ ratio: 1 });
  await library.getByRole("button", { name: "Ajouter le lot", exact: true }).click();
  await expect(library.getByRole("button", { name: "Ajouté : SOIN OFFERT", exact: true })).toBeDisabled();
  await library.getByRole("button", { name: "Ajouter : -10% PROCHAINE VISITE", exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(3);
  await library.getByRole("tab", { name: "Suggestions", exact: true }).click();
  await library.getByRole("tab", { name: "Mes lots", exact: true }).click();
  await expect(library.getByRole("button", { name: /Ajouté :/ })).toHaveCount(2);
  expect(reads).toHaveLength(1);
  await library.getByRole("button", { name: "Terminer", exact: true }).click();
  await page.getByRole("button", { name: "Modifier SOIN OFFERT", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Modifier le lot" });
  await expect(editor.getByRole("checkbox", { name: /Un achat est nécessaire/ })).toBeChecked();
  await expect(editor.getByLabel("Conditions d’utilisation")).toHaveValue("Avec un rituel payant.");
  await editor.getByLabel(/Nom du lot/).fill("SOIN PERSONNALISÉ");
  await editor.getByRole("button", { name: "Enregistrer le lot", exact: true }).click();
  await page.getByRole("button", { name: "Trouver des idées de lots", exact: true }).click();
  await library.getByRole("tab", { name: "Mes lots", exact: true }).click();
  await expect(library.getByRole("button", { name: "Ajouté : SOIN OFFERT", exact: true })).toBeDisabled();
  await library.getByRole("button", { name: "Terminer", exact: true }).click();
  await page.getByTestId("wizard-footer").getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].prizes[1]).toMatchObject({ label: "SOIN PERSONNALISÉ", probability: 10, totalQuantity: 7, remainingQuantity: 7, estimatedUnitCost: 8, usageConditions: "Avec un rituel payant.", purchaseRequired: true });
  expect(writes[0].prizes[1].id).not.toBe("old-limited");
  expect(writes[0].prizes[2]).toMatchObject({ totalQuantity: null, remainingQuantity: null, purchaseRequired: false });
  expect(writes[0].prizes.some((prize) => prize.id === "old-limited" || prize.id === "old-unlimited")).toBe(false);
});

for (const width of [320, 390]) {
  test(`phase 3 : stock, ajustement et annulation sur mobile ${width}`, async ({ page }, info) => {
    await page.route("**/api/merchant/prize-library?**", (route) => route.fulfill({ json: { prizes: [{ ...previous[0], probability: 70 }] } }));
    const library = await open(page, width, 740);
    await library.getByRole("tab", { name: "Mes lots", exact: true }).click();
    await library.getByRole("button", { name: "Ajouter : SOIN OFFERT", exact: true }).click();
    await library.getByLabel("Nouveau stock initial").fill("0");
    await library.getByRole("button", { name: "Ajouter le lot", exact: true }).click();
    await expect(library.getByRole("alert")).toContainText("nombre entier supérieur à 0");
    await library.getByLabel("Nouveau stock initial").fill("3.5");
    await library.getByRole("button", { name: "Ajouter le lot", exact: true }).click();
    await expect(page.getByTestId("wizard-prize-row")).toHaveCount(1);
    await library.getByRole("button", { name: "Annuler l’ajout", exact: true }).click();
    await expect(library.getByRole("button", { name: "Ajouter : SOIN OFFERT", exact: true })).toBeFocused();
    await library.getByRole("button", { name: "Ajouter : SOIN OFFERT", exact: true }).click();
    await library.getByLabel("Chance de gain pour ce lot (%)").fill("30");
    await library.getByRole("checkbox", { name: "Utiliser un stock illimité" }).check();
    await expect(library.getByRole("alert")).toHaveCount(0);
    await expect(library.getByRole("button", { name: "Ajouter le lot", exact: true })).toBeInViewport();
    await page.screenshot({ path: info.outputPath(`mes-lots-mobile-${width}.png`), animations: "disabled" });
    await library.getByRole("button", { name: "Ajouter le lot", exact: true }).click();
    await library.getByRole("button", { name: "Terminer", exact: true }).click();
    await expect(page.getByTestId("wizard-prize-row")).toHaveCount(2);
    await expect(page.getByTestId("wizard-prize-row").first().getByRole("spinbutton")).toHaveValue("50");
    await assertNoPageOverflow(page);
  });
}

test("phase 3 : chargement, panne/réessai, état vide et onglets au clavier", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let outcome = "error";
  await page.route("**/api/merchant/prize-library?**", async (route) => {
    if (outcome === "error") { await gate; await route.fulfill({ status: 503, json: {} }); }
    else await route.fulfill({ json: { prizes: [] } });
  });
  const library = await open(page);
  await library.getByRole("tab", { name: "Suggestions", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(library.getByRole("tab", { name: "Mes lots", exact: true })).toBeFocused();
  await expect(library.getByRole("status").filter({ hasText: "Chargement de vos lots" })).toBeVisible();
  release();
  await expect(library.getByRole("alert")).toContainText("Impossible de charger vos lots");
  outcome = "empty";
  await library.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(library.getByRole("heading", { name: "Vous n’avez pas encore de lots enregistrés." })).toBeVisible();
  await library.getByRole("button", { name: "Explorer les suggestions", exact: true }).click();
  await expect(library.getByRole("tab", { name: "Suggestions", exact: true })).toBeFocused();
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(1);
});

test("phase 3 : administration utilise uniquement la bibliothèque de l’établissement cible", async ({ page }) => {
  const reads: string[] = [];
  await page.route(/\/api\/admin\/merchants\/[^/]+\/locations\/[^/]+\/prize-library/, (route) => {
    reads.push(route.request().url()); return route.fulfill({ json: { prizes: previous } });
  });
  const library = await open(page, 1280, 720, "wizard-responsive-admin");
  await library.getByRole("tab", { name: "Mes lots", exact: true }).click();
  await expect(library.getByTestId("wizard-prize-suggestion-card")).toHaveCount(2);
  expect(new URL(reads[0]).pathname).toBe("/api/admin/merchants/fixture-account/locations/template-proof-merchant/prize-library");
});

test("phase 3 : routes réelles refusées sans session", async ({ request }) => {
  for (const path of ["/api/merchant/prize-library", "/api/admin/merchants/foreign/locations/foreign/prize-library"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});
