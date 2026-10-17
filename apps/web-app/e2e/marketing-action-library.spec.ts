import { expect, test, type Page } from "@playwright/test";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";

test.use({ actionTimeout: 15000 });
test.beforeEach(async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE, url: baseURL!,
    value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })) }]);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] }, suggestions: [], items: [], assets: {} } }));
  await page.route("**/api/campaigns/setup", route => route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } }));
});
async function openActions(page: Page, mode = "wizard-actions", template = "classic") {
  await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=${template}`);
  await page.getByRole("button", { name: /05.*actions/i }).click();
}
const library = (page: Page) => page.getByRole("dialog", { name: "Ajouter une action", exact: true });
async function add(page: Page, key: string) {
  await page.getByRole("button", { name: "Ajouter une action", exact: true }).click();
  await page.getByTestId(`action-library-${key}`).click();
}
async function save(page: Page) {
  const request = page.waitForRequest(request => request.url().endsWith("/api/campaigns/setup") && request.method() === "POST");
  await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).last().click();
  const payload = (await request).postDataJSON();
  await expect(page.getByRole("dialog", { name: "Votre jeu est enregistré.", exact: true })).toBeVisible();
  return payload;
}
test("bibliothèque : configurées en premier, ajout immédiat, doublon désactivé, clavier et destinations distinctes", async ({ page }) => {
  await openActions(page);
  await page.getByRole("button", { name: "Ajouter une action", exact: true }).click();
  await expect(library(page).getByRole("region", { name: "Vos actions configurées" }).locator("button")).toHaveCount(4);
  await expect(page.getByTestId("action-library-instagram")).toBeDisabled();
  await expect(page.getByTestId("action-library-website")).toBeDisabled();
  await page.getByTestId("action-library-appointment").click();
  await expect(page.getByTestId("selected-action-2")).toContainText("Réservation");
  await add(page, "google");
  await expect(page.getByTestId("selected-action-3")).toContainText("Avis Google");
  await page.getByRole("button", { name: /Monter Avis Google/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("selected-action-2")).toContainText("Avis Google");
  await page.getByRole("button", { name: /Supprimer Avis Google/ }).click();
  await page.getByRole("status").getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByTestId("selected-action-2")).toContainText("Avis Google");
  const payload = await save(page);
  expect(payload.actions.map((action: { id: string }) => action.id).slice(0, 2)).toEqual(["legacy-instagram", "legacy-website"]);
  expect(payload.actions[0].label).toBe("Notre compte personnalisé");
  expect(payload.actions[1].url).toBe("https://fixture.example.test");
  expect(payload.actions[3].kind).toBe("custom");
  expect(payload.actions[3].url).toBe("https://booking.example.test/");
});
test("configuration : validation, annulation, erreur serveur, succès normalisé, modification propre au jeu", async ({ page }) => {
  const requests: unknown[] = [];
  let fail = true;
  await page.route("**/api/merchant/marketing-links", async route => {
    const body = route.request().postDataJSON(); requests.push(body);
    await route.fulfill({ status: fail ? 503 : 200, json: fail ? { error: "Réessayez cet enregistrement." } : { key: body.key, url: body.url } });
  });
  await openActions(page, "wizard-actions-empty", "nude-scratch");
  await add(page, "tiktok");
  await page.getByRole("textbox", { name: "Lien ou nom du compte" }).fill("http://tiktok.com/@fixture");
  await page.getByRole("button", { name: "Enregistrer et ajouter" }).click();
  await expect(page.locator("#marketing-link-error")).toContainText("HTTPS");
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("selected-action-0")).toHaveCount(0);
  await add(page, "tiktok");
  await page.getByRole("textbox", { name: "Lien ou nom du compte" }).fill("@fixture");
  await page.getByRole("button", { name: "Enregistrer et ajouter" }).click();
  await expect(page.locator("#marketing-link-error")).toContainText("Réessayez");
  await expect(page.getByTestId("selected-action-0")).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Enregistrer et ajouter" }).click();
  await expect(page.getByTestId("selected-action-0")).toContainText("TikTok");
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual({ key: "tiktok", url: "https://www.tiktok.com/@fixture", locationId: "template-proof-merchant" });
  await page.getByRole("button", { name: /Modifier TikTok/ }).click();
  await page.getByRole("textbox", { name: "Lien ou nom du compte" }).fill("@gameonly");
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer", exact: true }).click();
  expect(requests).toHaveLength(2);
  await page.getByRole("button", { name: /Supprimer TikTok/ }).click();
  await page.getByRole("button", { name: "Ajouter une action", exact: true }).click();
  await expect(page.getByTestId("action-library-tiktok")).toContainText("@fixture");
  await page.getByTestId("action-library-tiktok").click();
  await expect(page.getByRole("status").getByRole("button", { name: "Annuler" })).toBeDisabled();
  const payload = await save(page);
  expect(payload.actions).toHaveLength(1);
  expect(payload.actions[0].url).toBe("https://www.tiktok.com/@fixture");
});
test("drag desktop conserve les identifiants et l’ordre envoyé", async ({ page }) => {
  await openActions(page);
  await page.getByRole("button", { name: /Déplacer Site web/ }).dragTo(page.getByTestId("selected-action-0"));
  await expect(page.getByTestId("selected-action-0")).toContainText("Site web");
  const payload = await save(page);
  expect(payload.actions.map((action: { id: string }) => action.id)).toEqual(["legacy-website", "legacy-instagram"]);
});
test("ancienne action invalide conservée et corrigeable, publication bloquée", async ({ page }) => {
  let posts = 0;
  await page.route("**/api/campaigns/setup", route => { posts++; return route.fulfill({ json: {} }); });
  await openActions(page, "wizard-actions-invalid");
  await expect(page.getByTestId("selected-action-0")).toContainText("Lien à corriger");
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Une action marketing doit être corrigée avant de publier la campagne.");
  expect(posts).toBe(0);
  await page.getByRole("button", { name: "Corriger", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Lien ou nom du compte" })).toHaveValue("http://instagram.com/fixture");
  await page.getByRole("textbox", { name: "Lien ou nom du compte" }).fill("@corrige");
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByTestId("selected-action-0")).toContainText("@corrige");
});
test("enregistrement en cours : double validation et fermeture ne créent pas d’action en double", async ({ page }) => {
  let requests = 0;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/merchant/marketing-links", async route => {
    requests++;
    const body = route.request().postDataJSON();
    await pending;
    await route.fulfill({ json: { key: body.key, url: body.url } });
  });
  await openActions(page, "wizard-actions-empty");
  await add(page, "facebook");
  await page.getByRole("textbox", { name: "Lien de destination" }).fill("https://facebook.com/fixture");
  await page.getByRole("button", { name: "Enregistrer et ajouter" }).click();
  await expect(page.getByRole("button", { name: "Enregistrement…" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Configurer Facebook", exact: true })).toBeVisible();
  release();
  await expect(page.getByTestId("selected-action-0")).toContainText("Facebook");
  expect(requests).toBe(1);
  await expect(page.getByTestId("selected-action-1")).toHaveCount(0);
});
for (const mode of ["wizard-actions-empty", "editor-actions-empty"]) {
  test(`${mode} : publication sans action seulement après confirmation, brouillon sans avertissement`, async ({ page }) => {
    let posts = 0;
    await page.route("**/api/campaigns/setup", route => { posts++; return route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } }); });
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=classic`);
    if (mode.startsWith("wizard")) {
      const payload = await save(page); expect(payload.isActive).toBe(false); expect(payload.actions).toEqual([]);
      await page.getByRole("dialog").getByRole("button", { name: /Fermer/ }).click();
      await page.getByRole("button", { name: "Publier", exact: true }).click();
    } else {
      await page.getByRole("switch", { name: "Activer la campagne", exact: true }).check();
      await page.getByRole("button", { name: "Enregistrer", exact: true }).first().click();
    }
    const warning = page.getByRole("dialog", { name: "Publier sans action marketing ?" });
    await expect(warning).toBeVisible();
    const before = posts;
    await warning.getByRole("button", { name: "Annuler" }).click();
    await expect(warning).toHaveCount(0); expect(posts).toBe(before);
    if (mode.startsWith("wizard")) await page.getByRole("button", { name: "Publier", exact: true }).click();
    else await page.getByRole("button", { name: "Enregistrer", exact: true }).first().click();
    const request = page.waitForRequest(request => request.url().endsWith("/api/campaigns/setup") && request.method() === "POST");
    await warning.getByRole("button", { name: "Publier sans action", exact: true }).click();
    const body = (await request).postDataJSON();
    expect(body.isActive).toBe(true); expect(body.actions).toEqual([]);
    expect(posts).toBe(before + 1);
  });
}
test("assistance : configuration sur le compte et l’établissement cibles, pas le profil admin", async ({ page }) => {
  let body: unknown;
  await page.route("**/api/admin/merchants/fixture-account/locations/template-proof-merchant/marketing-links", route => {
    body = route.request().postDataJSON(); return route.fulfill({ json: body });
  });
  await openActions(page, "wizard-actions-admin");
  await add(page, "facebook");
  await page.getByRole("textbox", { name: "Lien de destination" }).fill("https://facebook.com/fixture");
  await page.getByRole("button", { name: "Enregistrer et ajouter" }).click();
  await expect(page.getByTestId("selected-action-2")).toContainText("Facebook");
  expect(body).toEqual({ key: "facebook", url: "https://facebook.com/fixture" });
});
for (const width of [320, 390, 768, 1440]) {
  test(`${width}px : cartes et popin sans débordement, focus/Escape et lisibilité`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await openActions(page);
    await page.getByRole("main").screenshot({ path: info.outputPath(`actions-${width}.png`) });
    await page.getByRole("button", { name: "Ajouter une action", exact: true }).click();
    await expect(library(page)).toBeVisible();
    const box = await library(page).boundingBox();
    if (width === 1440) { expect(box!.width).toBeGreaterThanOrEqual(680); expect(box!.width).toBeLessThanOrEqual(760); }
    if (width < 640) expect(box!.width).toBe(width);
    await expect(page.getByTestId("selected-action-0")).toHaveCSS("border-radius", "12px");
    await library(page).screenshot({ path: info.outputPath(`library-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const overflow = await library(page).evaluate(element => element.scrollWidth > element.clientWidth + 1);
    expect(overflow).toBe(false);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(await library(page).evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(library(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ajouter une action", exact: true })).toBeFocused();
    expect(errors).toEqual([]);
  });
}
