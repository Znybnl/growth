import { expect, test } from "@playwright/test";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";

test.beforeEach(async ({ context, baseURL, page }) => {
  await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE, value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })), url: baseURL! }]);
  await context.route(/https:\/\/[^/]*posthog\.com\//, route => route.abort());
  await context.route("**/_vercel/insights/**", route => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("le retrait côté commerce est local, bloqué après validation et réinitialisable", async ({ page }) => {
  const mutations: string[] = [];
  page.on("request", request => { if (request.method() !== "GET") mutations.push(request.url()); });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const path of ["/", "/instituts-beaute", "/restaurants"]) {
    await page.goto(path);
    const demo = page.locator("#demo");
    const storage = await page.evaluate(() => [Object.entries(localStorage), Object.entries(sessionStorage)]);
    await demo.getByRole("button", { name: "Jouer", exact: true }).click();
    await demo.getByRole("button", { name: "Jouer maintenant" }).click();
    await demo.getByRole("button", { name: "Recevoir mon gain", exact: true }).click();
    const link = demo.getByRole("button", { name: "Voir le retrait côté commerce" });
    await link.focus();
    await page.keyboard.press("Enter");
    const redemption = demo.getByTestId("merchant-redemption-demo");
    await expect(redemption.locator("..")).toBeFocused();
    const kpis = await demo.locator("dl").first().innerText();
    const confirm = redemption.getByRole("button", { name: "Simuler la validation par PIN" });
    await page.keyboard.press("Tab");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(redemption.getByRole("status")).toHaveText(/Lot déjà retiré le 16 octobre 2026 à 14:30/);
    await expect(redemption.getByRole("button", { name: "Retrait validé" })).toBeDisabled();
    expect(await demo.locator("dl").first().innerText()).toBe(kpis);
    expect(await page.evaluate(() => [Object.entries(localStorage), Object.entries(sessionStorage)])).toEqual(storage);
    await demo.getByRole("button", { name: "Redémarrer la démo" }).click();
    await expect(confirm).toBeEnabled();
    await expect(demo.getByRole("button", { name: "Jouer", exact: true })).toBeFocused();
  }
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});

test("la synthèse marchand et la relance gagnant sont distinctes et cohérentes", async ({ page }, info) => {
  for (const path of ["/", "/instituts-beaute"]) {
    await page.goto(path);
    const followup = page.locator("#suivi");
    await expect(followup.getByRole("heading", { name: /Votre animation avance/ })).toBeVisible();
    const digest = followup.getByTestId("merchant-digest-example");
    await expect(digest).toContainText("données fictives");
    await expect(digest.getByText("Lots récupérés sur la période", { exact: true })).toBeVisible();
    await expect(digest).toContainText("Les 2 retraits incluent 1 gain d’une semaine précédente.");
    await expect(digest.getByRole("row")).toHaveCount(4);
    const redeemedRow = digest.getByRole("row").filter({ hasText: "Camille Martin" });
    await expect(redeemedRow).toContainText("Récupéré");
    await expect(redeemedRow).not.toContainText(/nov\./);
    await expect(digest).toContainText("Illimité");
    await expect(digest).toContainText("Épuisé · 0");
    const reminder = followup.getByTestId("customer-reminder-example");
    await expect(reminder).toContainText("e-mail au gagnant");
    await expect(reminder).toContainText("Alex, votre cadeau vous attend encore.");
    await expect(reminder).toContainText("jusqu’au 7 novembre 2026");
    await expect(reminder).toContainText("Désactivée par défaut");
    await expect(reminder).toContainText("délai personnalisable");
    await expect(reminder).toContainText("sans rattrapage");
    await expect(reminder.getByRole("link", { name: "Comprendre la relance client" })).toHaveAttribute("href", "/aide/notifications-et-relances#section-3");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    if (path === "/instituts-beaute") await followup.screenshot({ path: info.outputPath("merchant-followup.png"), style: "header.sticky { visibility: hidden !important; }" });
  }
});

test("trois exemples Beauté complets avec fonds chargés, lots et conditions lisibles", async ({ page }, info) => {
  await page.goto("/instituts-beaute");
  const examples = page.locator("#exemples-metiers");
  await expect(examples.getByTestId("beauty-use-case")).toHaveCount(3);
  for (const title of ["Teinture des sourcils offerte", "Nail art sur 2 ongles offert", "Un produit découverte offert"]) {
    await expect(examples.getByRole("heading", { name: title })).toBeVisible();
  }
  await expect(examples).toContainText("Brow Lift acheté");
  await expect(examples).toContainText("semi-permanent achetée");
  await expect(examples).toContainText("Sans achat requis");
  await expect(examples).toContainText("Enseignes, lots et compositions fictifs");
  for (const image of await examples.locator("img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  }
  await expect(examples.getByText("Jeu mobile + affiche assortie", { exact: true })).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await examples.screenshot({ path: info.outputPath("beauty-examples.png"), style: "header.sticky { visibility: hidden !important; }" });
  await page.getByRole("link", { name: "Voir les exemples Regard, Ongles et Spa" }).click();
  await expect(page).toHaveURL(/#exemples-metiers$/);
});
