import { expect, test } from "@playwright/test";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";

test.beforeEach(async ({ context, baseURL, page }) => {
  await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE, value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })), url: baseURL! }]);
  await context.route("**/_vercel/insights/**", route => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("les modèles se parcourent et l’aperçu se referme au clavier sans appel métier", async ({ page }, info) => {
  const mutations: string[] = [];
  const analytics: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (request.method() !== "GET") mutations.push(request.url()); });
  await page.route(/https:\/\/[^/]*posthog\.com\//, route => { analytics.push(route.request().url()); return route.abort(); });
  for (const path of ["/", "/ticket-a-gratter"]) {
    await page.goto(path);
    const gallery = page.locator("#modeles");
    await expect(gallery.getByRole("button", { name: /^Voir le modèle / })).toHaveCount(6);
    const carousel = gallery.getByRole("region", { name: "Galerie des modèles de jeux" });
    await gallery.getByRole("button", { name: "Modèles suivants" }).click();
    await expect.poll(() => carousel.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    await gallery.getByRole("button", { name: "Modèles précédents" }).click();
    await expect.poll(() => carousel.evaluate(element => element.scrollLeft)).toBeLessThanOrEqual(5);
    const opener = gallery.getByRole("button", { name: "Voir le modèle Nude Élégance — Ticket à gratter", exact: true });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Nude Élégance" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Exemple fictif");
    const close = dialog.getByRole("button", { name: "Fermer l’aperçu du modèle" });
    await expect(close).toBeFocused();
    await page.keyboard.press("Tab");
    // Native dialogs may allow a stop in browser chrome. The page behind the
    // modal must stay inert; do not require the browser's own UI to be trapped.
    expect(await page.evaluate(() => document.activeElement === document.body || Boolean(document.activeElement?.closest("dialog")))).toBe(true);
    await page.keyboard.press("Shift+Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    if (path === "/") await gallery.screenshot({ path: info.outputPath("models.png"), style: "header.sticky { visibility: hidden !important; }" });
  }
  expect(mutations).toEqual([]);
  expect(analytics).toEqual([]);
  expect(errors).toEqual([]);
});

test("l’accueil expose les bons secteurs et un suivi compact", async ({ page }, info) => {
  await page.goto("/");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
  const hero = page.getByRole("region", { name: /Donnez à vos clients/ });
  await expect(hero.getByRole("link", { name: "Essayer gratuitement", exact: true })).toHaveAttribute("href", "https://app.okado.app/inscription");
  await expect(hero.getByRole("link", { name: "Voir la démo", exact: true })).toHaveAttribute("href", "#demo");
  await expect(hero).toContainText("QR code");
  await expect(hero).toContainText("Scannez pour jouer");
  await expect(hero).not.toContainText("QR code de votre campagne");
  await expect(hero.locator("strong").filter({ hasText: "Un masque" })).toContainText(/Un masque\s*offert\./);
  await expect(hero).toContainText("Avec un soin visage payant.");
  const gameImage = hero.locator("img");
  await expect.poll(() => gameImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(gameImage).toHaveAttribute("width", "780");
  await expect(gameImage).toHaveAttribute("height", "1688");
  const sectors = page.locator("#cas-usage");
  for (const [label, href] of [["Explorer la beauté", "/instituts-beaute"], ["Explorer la restauration", "/restaurants"], ["Découvrir les possibilités", "#demo"]]) {
    await expect(sectors.getByRole("link", { name: label })).toHaveAttribute("href", href);
  }
  await expect(page.locator("#suivi dt")).toHaveText(["Participations", "Gains attribués", "Lots récupérés"]);
  await expect(page.locator("#suivi")).toContainText("Il ne prouve pas, à lui seul, une vente supplémentaire");
  await expect(page.locator("#suivi").getByTestId("merchant-digest-example")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("home-hero.png") });
  await page.locator("#fonctionnalites").screenshot({ path: info.outputPath("gift-suggestions.png"), style: "header.sticky { visibility: hidden !important; }" });
});

test("l’accueil reste contenu et le CTA précède l’illustration aux largeurs du brief", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "La matrice complète est exécutée une seule fois.");
  for (const width of [320, 360, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth), String(width)).toBeLessThanOrEqual(width);
    if (width < 768) {
      const hero = page.getByRole("region", { name: /Donnez à vos clients/ });
      const cta = (await hero.getByRole("link", { name: "Essayer gratuitement", exact: true }).boundingBox())!;
      const image = (await hero.getByRole("img").boundingBox())!;
      expect(cta.y + cta.height).toBeLessThan(image.y);
      expect(cta.y + cta.height).toBeLessThan(850);
    }
  }
});
