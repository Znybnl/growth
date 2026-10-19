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
  await expect(page.getByRole("heading", { name: "Les actions", exact: true })).toBeVisible();
  await expect(page.getByText("Les actions · Facultatif", { exact: true })).toHaveCount(0);
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

for (const width of [320, 390, 768, 1440]) {
  test(`${width}px : Mon compte partage les icônes et cartes des actions, liens éditables sans écriture implicite`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const writes: Record<string, unknown>[] = [];
    await page.route("**/api/account", route => {
      if (route.request().method() === "POST") writes.push(route.request().postDataJSON());
      return route.fulfill({ json: { user: { email: "fixture@example.test" } } });
    });
    await page.goto("/dev/template-rendering-proof?mode=account-marketing");
    const section = page.locator("#account-channels");
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole("heading", { name: "Liens marketing" })).toBeVisible();
    for (const key of ["appointment", "google", "instagram", "facebook", "tiktok", "tripadvisor", "custom"]) {
      const icon = section.locator(`[data-marketing-icon="${key}"]`);
      await expect(icon).toHaveCount(1);
      await expect(icon.locator("svg")).toHaveCount(1);
      expect(await icon.evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(40);
    }
    await expect(page.getByTestId("account-link-instagram")).toContainText("Renseigné");
    await expect(page.getByTestId("account-link-facebook")).toContainText("Optionnel");
    await expect(section.getByRole("button", { name: "Changer de fiche Google" })).toBeVisible();
    const brandPath = await section.locator('[data-marketing-icon="instagram"] path').getAttribute("d");
    await section.getByRole("textbox", { name: "Facebook", exact: true }).fill("https://facebook.com/fixture");
    await expect(page.getByTestId("account-link-facebook")).toContainText("Renseigné");
    await expect(section.getByRole("textbox", { name: "Instagram", exact: true })).toHaveValue("https://www.instagram.com/fixture/");
    expect(writes).toHaveLength(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await section.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await section.screenshot({ path: test.info().outputPath(`account-marketing-${width}.png`) });
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ locationId: "template-proof-merchant", facebookUrl: "https://facebook.com/fixture",
      instagramUrl: "https://www.instagram.com/fixture/", appointmentUrl: "https://booking.example.test" });

    await openActions(page);
    await page.getByRole("button", { name: "Ajouter une action", exact: true }).click();
    expect(await page.getByTestId("action-library-instagram").locator("path").first().getAttribute("d")).toBe(brandPath);
  });
}
test("bibliothèque : configurées en premier, ajout immédiat, doublon désactivé, clavier et destinations distinctes", async ({ page }) => {
  await openActions(page);
  await page.getByRole("button", { name: "Ajouter une action", exact: true }).click();
  await expect(library(page).getByRole("region", { name: "Vos actions configurées" }).locator("button")).toHaveCount(3);
  await expect(page.getByTestId("action-library-appointment")).toHaveCount(0);
  await expect(library(page).getByText("Réservation", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("action-library-instagram")).toBeDisabled();
  await expect(page.getByTestId("action-library-website")).toBeDisabled();
  await page.getByTestId("action-library-google").click();
  await expect(page.getByTestId("selected-action-2")).toContainText("Avis Google");
  await page.getByRole("button", { name: /Monter Avis Google/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("selected-action-1")).toContainText("Avis Google");
  await page.getByRole("button", { name: /Supprimer Avis Google/ }).click();
  await page.getByRole("status").getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByTestId("selected-action-1")).toContainText("Avis Google");
  const payload = await save(page);
  expect(payload.actions[0].id).toBe("legacy-instagram");
  expect(payload.actions[2].id).toBe("legacy-website");
  expect(payload.actions[0].label).toBe("Notre compte personnalisé");
  expect(payload.actions[2].url).toBe("https://fixture.example.test");
  expect(payload.actions[1].kind).toBe("google");
});
test("configuration : validation, annulation, erreur serveur, succès normalisé, modification propre au jeu", async ({ page }) => {
  const requests: unknown[] = [];
  let fail = true;
  await page.route("**/api/merchant/marketing-links", async route => {
    const body = route.request().postDataJSON(); requests.push(body);
    await route.fulfill({ status: fail ? 503 : 200, json: fail ? { error: "Réessayez cet enregistrement." } : { key: body.key, url: body.url } });
  });
  await openActions(page, "wizard-actions-empty", "scratch-nude-classic");
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

for (const width of [320, 1440]) {
  test(`${width}px : plusieurs liens personnalisés restent ajoutables sans écraser Mon compte`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const updates: unknown[] = [];
    await page.route("**/api/merchant/marketing-links", route => {
      const body = route.request().postDataJSON(); updates.push(body);
      return route.fulfill({ json: { key: body.key, url: body.url } });
    });
    await openActions(page, "wizard-actions-empty");
    await add(page, "custom");
    await page.getByRole("textbox", { name: "Lien de destination" }).fill("https://first.example.test");
    await page.getByRole("button", { name: "Enregistrer et ajouter" }).click();
    await expect(page.getByTestId("selected-action-0")).toContainText("first.example.test");
    expect(updates).toEqual([{ key: "custom", url: "https://first.example.test/", locationId: "template-proof-merchant" }]);

    await page.getByRole("button", { name: "Ajouter une action", exact: true }).click();
    await expect(page.getByTestId("action-library-custom")).toBeEnabled();
    await expect(page.getByTestId("action-library-custom")).not.toContainText("Déjà ajoutée");
    await page.getByTestId("action-library-custom").click();
    await expect(page.getByRole("textbox", { name: "Lien de destination" })).toHaveValue("");
    await expect(page.getByRole("dialog")).toContainText("Mon compte restera inchangé");
    await page.getByRole("textbox", { name: "Lien de destination" }).fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Ajouter au jeu", exact: true }).click();
    await expect(page.locator("#marketing-link-error")).toContainText("HTTPS");
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(page.getByTestId("selected-action-1")).toHaveCount(0);

    await add(page, "custom");
    await page.getByRole("textbox", { name: "Lien de destination" }).fill("https://second.example.test");
    await page.getByRole("button", { name: "Ajouter au jeu", exact: true }).click();
    await expect(page.getByTestId("selected-action-1")).toContainText("second.example.test");
    await page.getByTestId("selected-action-0").getByRole("button", { name: /Supprimer/ }).click();
    await page.getByRole("status").getByRole("button", { name: "Annuler" }).click();
    await expect(page.getByTestId("selected-action-0")).toContainText("first.example.test");
    expect(updates).toHaveLength(1);
    const payload = await save(page);
    expect(payload.actions.map((action: { url: string }) => action.url)).toEqual(["https://first.example.test/", "https://second.example.test/"]);
    expect(new Set(payload.actions.map((action: { id: string }) => action.id)).size).toBe(2);
  });
}

test("lien personnalisé déjà configuré : nouveau lien possible sans aucune écriture de profil", async ({ page }) => {
  let updates = 0;
  await page.route("**/api/merchant/marketing-links", route => { updates++; return route.fulfill({ json: {} }); });
  await openActions(page, "wizard-actions-custom-configured");
  await add(page, "custom");
  await expect(page.getByRole("textbox", { name: "Lien de destination" })).toHaveValue("https://saved-link.example.test");
  await page.getByRole("textbox", { name: "Lien de destination" }).fill("https://new-game-only.example.test");
  await page.getByRole("button", { name: "Ajouter au jeu" }).click();
  await add(page, "custom");
  await page.getByRole("textbox", { name: "Lien de destination" }).fill("https://another-game-only.example.test");
  await page.getByRole("button", { name: "Ajouter au jeu" }).click();
  const payload = await save(page);
  expect(payload.actions.slice(2).map((action: { url: string }) => action.url)).toEqual(["https://new-game-only.example.test/", "https://another-game-only.example.test/"]);
  expect(updates).toBe(0);
});

test("ancienne réservation conservée et modifiable sans la réintroduire dans la bibliothèque", async ({ page }) => {
  await openActions(page, "wizard-actions-legacy-booking");
  await expect(page.getByTestId("selected-action-2")).toContainText("Prendre rendez-vous");
  await page.getByRole("button", { name: "Ajouter une action", exact: true }).click();
  await expect(page.getByTestId("action-library-appointment")).toHaveCount(0);
  await expect(page.getByTestId("action-library-custom")).toBeEnabled();
  await page.keyboard.press("Escape");
  const payload = await save(page);
  expect(payload.actions[2]).toEqual({ id: "legacy-booking", kind: "custom", label: "Prendre rendez-vous", url: "https://booking.example.test" });
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
