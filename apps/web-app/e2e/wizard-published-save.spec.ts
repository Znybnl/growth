import { expect, test, type Page } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

type SavePayload = { id?: string; isActive: boolean; title: string; gameType: string; prizes: unknown[]; actions: unknown[] };
const saveLabel = "Enregistrer les modifications";
const fixture = (variant = "edit-published", template = "classic") =>
  `/dev/template-rendering-proof?mode=wizard-responsive-${variant}&template=${template}`;
const toolbar = (page: Page) => page.getByTestId("wizard-save-toolbar");
const footer = (page: Page) => page.getByTestId("wizard-footer");
const savedDialog = (page: Page) => page.getByRole("dialog").filter({ has: page.getByRole("button", { name: "Fermer la confirmation d’enregistrement" }) });
async function closeSaved(page: Page) {
  await savedDialog(page).getByRole("button", { name: "Fermer la confirmation d’enregistrement" }).click();
}

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { suggestions: [], items: [], assets: {} } }));
  await page.route("**/campaign/*/preview-embed?**", route => route.fulfill({ contentType: "text/html", body: "<p>Aperçu fictif</p>" }));
});

for (const [width, height] of [[1280, 720], [1280, 600], [390, 844]]) {
  test(`@visual-1280 jeu publié : une action claire à ${width}×${height}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await page.goto(fixture());
    await expect(toolbar(page).getByRole("button", { name: saveLabel, exact: true })).toBeInViewport();
    await expect(page.getByRole("button", { name: /^Publier/ })).toHaveCount(0);
    await expect(page.getByText("Les modifications enregistrées sont immédiatement visibles sur le jeu en ligne.")).toBeVisible();
    if (width === 1280) await captureVisualAt1280(page, info, "commandes-jeu-publie", height);
    else await page.screenshot({ path: info.outputPath("commandes-jeu-publie-mobile.png") });
    await selectWizardStep(page, 4);
    await footer(page).getByRole("button", { name: saveLabel, exact: true }).scrollIntoViewIfNeeded();
    await expect(footer(page).getByRole("button", { name: saveLabel, exact: true })).toBeInViewport();
    await expect(footer(page).getByRole("button")).toHaveCount(2); // Retour and save, no duplicate publication.
    await expect(page.getByRole("button", { name: /^Publier/ })).toHaveCount(0);
    await assertNoPageOverflow(page);
    if (width === 1280) await captureVisualAt1280(page, info, "derniere-etape-publiee", height);
    else await page.screenshot({ path: info.outputPath("derniere-etape-publiee-mobile.png") });
  });
}

for (const admin of [false, true]) for (const template of ["classic", "beauty-scratch-nude"]) {
  test(`sauvegarde publiée ${admin ? "administrateur" : "marchand"}/${template} : erreur, reprise et statut conservé`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const writes: SavePayload[] = [];
    let release: () => void = () => {};
    const pending = new Promise<void>(resolve => { release = resolve; });
    const endpoint = admin ? "**/api/admin/merchants/**/campaigns/setup" : "**/api/campaigns/setup";
    await page.route(endpoint, async route => {
      writes.push(route.request().postDataJSON());
      if (writes.length === 1) return route.fulfill({ status: 500, json: { error: "Erreur temporaire de sauvegarde" } });
      await pending;
      return route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } });
    });
    await page.goto(fixture(admin ? "edit-published-admin" : "edit-published", template));
    await selectWizardStep(page, 1);
    const name = page.getByPlaceholder("Ex. La roue gourmande de juin");
    await name.fill("Animation modifiée");
    await toolbar(page).getByRole("button", { name: saveLabel, exact: true }).click();
    const error = page.getByRole("dialog", { name: "Enregistrement impossible" });
    await expect(error).toBeVisible();
    await error.getByRole("button", { name: "Fermer", exact: true }).click();
    await expect(name).toHaveValue("Animation modifiée");
    await footer(page).getByRole("button", { name: saveLabel, exact: true }).click();
    await expect.poll(() => writes.length).toBe(2);
    await expect(toolbar(page).getByRole("button", { name: "Enregistrement…", exact: true })).toBeDisabled();
    await expect(footer(page).getByRole("button", { name: "Enregistrement…", exact: true })).toBeDisabled();
    release();
    await closeSaved(page);
    expect(writes[1]).toMatchObject({ isActive: true, title: "Animation modifiée", gameType: template.includes("scratch") ? "scratch" : "wheel" });
    expect(writes[1].prizes).toEqual(writes[0].prizes);
    expect(writes[1].actions).toEqual(writes[0].actions);
    await expect(page.getByRole("button", { name: /^Publier/ })).toHaveCount(0);
    await expect(toolbar(page).getByRole("button", { name: saveLabel, exact: true })).toBeEnabled();
  });
}

test("brouillon existant : enregistrer conserve le brouillon, publier bascule les commandes immédiatement", async ({ page }) => {
  const writes: SavePayload[] = [];
  await page.route("**/api/campaigns/setup", route => { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } }); });
  await page.goto(fixture("edit"));
  await toolbar(page).getByRole("button", { name: "Enregistrer le brouillon", exact: true }).click();
  await closeSaved(page);
  expect(writes[0].isActive).toBe(false);
  await expect(toolbar(page).getByRole("button", { name: "Publier", exact: true })).toBeVisible();
  await selectWizardStep(page, 4);
  await footer(page).getByRole("button", { name: "Publier la campagne", exact: true }).click();
  await page.getByRole("dialog", { name: "Publier sans action marketing ?" }).getByRole("button", { name: "Publier sans action", exact: true }).click();
  await closeSaved(page);
  expect(writes[1].isActive).toBe(true);
  await expect(page.getByRole("button", { name: /^Publier/ })).toHaveCount(0);
  await expect(footer(page).getByRole("button", { name: saveLabel, exact: true })).toBeEnabled();
});

test("nouveau jeu : une sauvegarde après première publication ne repasse jamais en brouillon", async ({ page }) => {
  const writes: SavePayload[] = [];
  await page.route("**/api/campaigns/setup", route => { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { campaign: { id: "new-fixture-game" } } }); });
  await page.goto(fixture("create"));
  await expect(toolbar(page).getByRole("button", { name: "Publier", exact: true })).toHaveCount(0);
  await footer(page).getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Nouvelle animation");
  await footer(page).getByRole("button", { name: "Continuer", exact: true }).click();
  await footer(page).getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByRole("button", { name: "Créer un lot", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Créer un lot", exact: true });
  await editor.getByLabel(/Nom du lot/).fill("Un cadeau");
  await editor.getByLabel(/Chance de gain/).fill("50");
  await editor.getByRole("button", { name: "Ajouter le lot", exact: true }).click();
  await footer(page).getByRole("button", { name: "Continuer", exact: true }).click();
  await footer(page).getByRole("button", { name: "Publier la campagne", exact: true }).click();
  await page.getByRole("dialog", { name: "Publier sans action marketing ?" }).getByRole("button", { name: "Publier sans action", exact: true }).click();
  await closeSaved(page);
  await expect(page.getByRole("button", { name: /^Publier/ })).toHaveCount(0);
  await toolbar(page).getByRole("button", { name: saveLabel, exact: true }).click();
  await page.getByRole("dialog", { name: "Publier sans action marketing ?" }).getByRole("button", { name: "Publier sans action", exact: true }).click();
  await closeSaved(page);
  expect(writes.map(write => write.isActive)).toEqual([true, true]);
  expect(writes[1].id).toBe("new-fixture-game");
});

test("jeu publié : validations complètes avant sauvegarde et avant prévisualisation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const writes: SavePayload[] = [];
  await page.route("**/api/campaigns/setup", route => { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } }); });
  await page.goto(fixture());
  await selectWizardStep(page, 1);
  const name = page.getByPlaceholder("Ex. La roue gourmande de juin");
  await name.fill("A");
  await toolbar(page).getByRole("button", { name: saveLabel, exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "trois caractères minimum" })).toBeVisible();
  expect(writes).toHaveLength(0);
  await toolbar(page).getByRole("button", { name: "Prévisualiser", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "Enregistrer avant de prévisualiser ?" });
  await confirm.getByRole("button", { name: "Enregistrer et prévisualiser", exact: true }).click();
  await expect(confirm).toContainText("trois caractères minimum");
  expect(writes).toHaveLength(0);
  await confirm.getByRole("button", { name: "Annuler", exact: true }).click();
  await name.fill("Animation valide");
  await toolbar(page).getByRole("button", { name: "Prévisualiser", exact: true }).click();
  await confirm.getByRole("button", { name: "Enregistrer et prévisualiser", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Version mobile", exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].isActive).toBe(true);
});

test("jeu publié : enregistrer avant de quitter conserve la publication et refuse un formulaire invalide", async ({ page }) => {
  const writes: SavePayload[] = [];
  await page.route("**/api/campaigns/setup", route => { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } }); });
  await page.goto(fixture());
  await selectWizardStep(page, 1);
  const name = page.getByPlaceholder("Ex. La roue gourmande de juin");
  await name.fill("A");
  await toolbar(page).getByRole("link", { name: "Retour aux jeux", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "Quitter le wizard ?", exact: true });
  await confirm.getByRole("button", { name: "Enregistrer et quitter", exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByRole("alert").filter({ hasText: "trois caractères minimum" })).toBeVisible();
  expect(writes).toHaveLength(0);
  await name.fill("Animation valide");
  await toolbar(page).getByRole("link", { name: "Retour aux jeux", exact: true }).click();
  await confirm.getByRole("button", { name: "Enregistrer et quitter", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].isActive).toBe(true);
});
