import { expect, test } from "@playwright/test";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";

test.beforeEach(async ({ context, baseURL, page }) => {
  await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE, value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })), url: baseURL! }]);
  await context.route(/https:\/\/[^/]*posthog\.com\//, route => route.abort());
  await context.route("**/_vercel/insights/**", route => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("la démo reste locale et ne propose plus de validation marchand", async ({ page }) => {
  const mutations: string[] = [];
  page.on("request", request => { if (request.method() !== "GET") mutations.push(request.url()); });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const path of ["/", "/instituts-beaute", "/restaurants"]) {
    await page.goto(path);
    const demo = page.locator("#demo");
    await expect(demo.getByTestId("merchant-redemption-demo")).toHaveCount(0);
    await expect(demo).not.toContainText(/validation du retrait|Simuler la validation par PIN/);
    const kpis = await demo.locator("dl").first().innerText();
    const storage = await page.evaluate(() => [Object.entries(localStorage), Object.entries(sessionStorage)]);
    await demo.getByRole("button", { name: "Jouer", exact: true }).click();
    await demo.getByRole("button", { name: "Jouer maintenant" }).click();
    await demo.getByRole("button", { name: "Recevoir mon gain", exact: true }).click();
    await expect(demo.getByRole("button", { name: "Voir le retrait côté commerce" })).toHaveCount(0);
    await expect(demo.getByRole("heading", { name: "Votre gain est confirmé !" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(demo.getByRole("button", { name: "Voir l’e-mail" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(demo.getByRole("heading", { name: "Votre e-mail de gain" })).toBeFocused();
    expect(await demo.locator("dl").first().innerText()).toBe(kpis);
    expect(await page.evaluate(() => [Object.entries(localStorage), Object.entries(sessionStorage)])).toEqual(storage);
    await demo.getByRole("button", { name: "Redémarrer la démo" }).click();
    await expect(demo.getByRole("button", { name: "Jouer", exact: true })).toBeFocused();
  }
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});

test("la synthèse marchand et la relance gagnant sont distinctes et cohérentes", async ({ page }, info) => {
  for (const path of ["/instituts-beaute"]) {
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

test("six spécialités Beauté avec un seul panneau visible et navigation clavier", async ({ page }, info) => {
  await page.goto("/instituts-beaute");
  const examples = page.locator("#exemples-metiers");
  await expect(examples.getByRole("tab")).toHaveCount(6);
  const specialties = [
    ["Ongles", "French offerte", "nails"], ["Regard · cils & sourcils", "Brow Lift offert", "eyes"],
    ["Soins visage & corps", "Masque offert", "care"], ["Massage & Spa", "10 minutes de massage offertes", "spa"],
    ["Coiffure", "Brushing offert", "hair"], ["Institut généraliste", "Complément de prestation offert", "general"],
  ];
  for (const [label, reward, id] of specialties) {
    await examples.getByRole("tab", { name: label, exact: true }).click();
    const panel = examples.getByRole("tabpanel");
    await expect(panel).toHaveCount(1);
    await expect(panel).toContainText(reward);
    await expect(panel).toContainText("Exemple fictif");
    await expect(panel.getByRole("link", { name: "Essayer cet exemple" })).toHaveAttribute("href", `#demo-${id}`);
    const image = panel.locator("img");
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  }
  const last = examples.getByRole("tab", { name: "Institut généraliste" });
  await last.focus();
  await page.keyboard.press("ArrowRight");
  await expect(examples.getByRole("tab", { name: "Ongles", exact: true })).toBeFocused();
  await page.keyboard.press("End");
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute("aria-selected", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await examples.screenshot({ path: info.outputPath("beauty-examples.png"), style: "header.sticky { visibility: hidden !important; }" });
  await page.getByRole("link", { name: "Explorer les six spécialités beauté" }).click();
  await expect(page).toHaveURL(/#exemples-metiers$/);
});
