import { expect, test } from "@playwright/test";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";
import { beautyDemoRewards } from "../src/lib/demo-examples";

test.beforeEach(async ({ context, baseURL, page }) => {
  await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE, value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })), url: baseURL! }]);
  await context.route("**/_vercel/insights/**", route => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("les trois secteurs, lots et destinations restent cohérents sans collecte", async ({ page }, info) => {
  const outgoing: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (request.method() !== "GET" || /posthog\.com/.test(request.url())) outgoing.push(request.url()); });
  await page.goto("/?utm_source=fixture&utm_campaign=multisector_607");
  const models = page.locator("#modeles").getByRole("button", { name: /^Voir le modèle / });
  await expect(models).toHaveCount(6);
  await expect(models.nth(0)).toHaveAccessibleName("Voir le modèle Nude Élégance — Ticket à gratter");
  await expect(models.nth(1)).toHaveAccessibleName("Voir le modèle Classique — Roue de la fortune");
  await expect(models.nth(2)).toHaveAccessibleName("Voir le modèle Confetti — Ticket à gratter");
  const storage = await page.evaluate(() => [Object.entries(localStorage), Object.entries(sessionStorage)]);
  const demo = page.locator("#demo");
  const choices = demo.getByRole("navigation", { name: "Activité de la démo" });
  const gifts = page.locator("#fonctionnalites");
  for (const [label, business] of [["Beauté & bien-être", "L’atelier beauté"], ["Restaurants & cafés", "Le bistro"], ["Boutiques & commerces", "La petite boutique"]]) {
    await choices.getByRole("link", { name: label }).click();
    await expect(choices.getByRole("link", { name: label })).toHaveAttribute("aria-current", "true");
    await expect(demo.getByTestId("demo-phone")).toContainText(business);
  }
  for (const [label, reward, hash] of [["Beauté", "French offerte", "beauty"], ["Restaurant", "Dessert offert", "restaurant"], ["Commerce", "Produit découverte", "retail"]]) {
    await gifts.getByRole("button", { name: label, exact: true }).click();
    await expect(gifts).toContainText(reward);
    await expect(gifts.getByRole("link", { name: "Essayer cet univers" })).toHaveAttribute("href", `#demo-${hash}`);
    if (hash !== "beauty") await expect(gifts).not.toContainText("15 %");
  }
  await gifts.screenshot({ path: info.outputPath("retail-gifts.png") });
  await page.locator("#cas-usage").getByRole("link", { name: "Essayer le ticket boutique" }).click();
  await expect(page).toHaveURL(/utm_source=fixture.*#demo-retail$/);
  await expect(demo.getByTestId("demo-phone")).toContainText("La petite boutique");
  await demo.getByRole("button", { name: "Jouer", exact: true }).click();
  await demo.getByRole("button", { name: "Jouer maintenant" }).click();
  await expect(demo.getByRole("button", { name: "Révéler le ticket" })).toBeFocused();
  await demo.getByTestId("demo-phone").screenshot({ path: info.outputPath("retail-ticket.png") });
  await page.keyboard.press("Enter");
  await expect(demo.getByRole("heading", { name: /Félicitations.*un produit découverte/ })).toBeFocused();
  await demo.getByLabel("E-mail de démonstration").fill("local@example.test");
  await demo.getByRole("button", { name: "Recevoir mon gain" }).click();
  await demo.getByRole("button", { name: "Voir l’e-mail" }).click();
  await expect(demo.getByTestId("demo-phone")).toContainText("un produit découverte");
  await expect(demo.getByTestId("demo-phone")).toContainText("prochaine visite");
  await demo.getByTestId("demo-phone").screenshot({ path: info.outputPath("retail-mail.png") });
  await choices.getByRole("link", { name: "Beauté & bien-être" }).click();
  await choices.getByRole("link", { name: "Boutiques & commerces" }).click();
  await demo.getByRole("button", { name: "Jouer", exact: true }).click();
  await demo.getByRole("button", { name: "Jouer maintenant" }).click();
  await demo.getByRole("button", { name: "Révéler le ticket" }).click();
  await expect(demo.getByLabel("E-mail de démonstration")).toHaveValue("");
  expect(await page.evaluate(() => [Object.entries(localStorage), Object.entries(sessionStorage)])).toEqual(storage);
  expect(outgoing).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("le ticket se gratte au pointeur et les liens directs survivent au rechargement", async ({ page }) => {
  await page.goto("/#demo-retail");
  await page.reload();
  const demo = page.locator("#demo");
  await expect(demo.getByTestId("demo-phone")).toContainText("La petite boutique");
  await demo.getByRole("button", { name: "Jouer", exact: true }).click();
  await demo.getByRole("button", { name: "Jouer maintenant" }).click();
  const canvas = demo.getByTestId("demo-scratch");
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + 15, bounds.y + 20);
  await page.mouse.down();
  for (let y = 20; y < bounds.height - 10; y += 18) {
    await page.mouse.move(bounds.x + bounds.width - 15, bounds.y + y, { steps: 12 });
    await page.mouse.move(bounds.x + 15, bounds.y + y + 9, { steps: 12 });
    if (await demo.getByRole("heading", { name: /Félicitations/ }).count()) break;
  }
  await page.mouse.up();
  await expect(demo.getByRole("heading", { name: /Félicitations.*un produit découverte/ })).toBeVisible();
});

test("les six spécialités adaptent le lot jusqu’à l’e-mail dans la démo commune", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/instituts-beaute");
  const demo = page.locator("#demo");
  for (const [id, item] of Object.entries(beautyDemoRewards)) {
    await page.locator("#exemples-metiers").getByRole("tab", { name: item.label, exact: true }).click();
    await page.getByRole("tabpanel").getByRole("link", { name: "Essayer cet exemple" }).click();
    await expect(page).toHaveURL(new RegExp(`#demo-${id}$`));
    await expect(demo.getByTestId("demo-wheel")).toContainText(item.wheelLabel);
    for (const label of item.otherLabels) await expect(demo.getByTestId("demo-wheel")).toContainText(label);
    await demo.getByRole("button", { name: "Jouer", exact: true }).click();
    await demo.getByRole("button", { name: "Jouer maintenant" }).click();
    await expect(demo.getByRole("heading", { name: `Félicitations ! Vous avez remporté « ${item.reward} »` })).toBeFocused();
    await demo.getByRole("button", { name: "Recevoir mon gain" }).click();
    await demo.getByRole("button", { name: "Voir l’e-mail" }).click();
    await expect(demo.getByTestId("demo-phone")).toContainText(item.reward);
  }
});

test("le ticket accepte aussi les gestes tactiles natifs", async ({ page }, info) => {
  test.skip(!info.project.use.hasTouch, "Contrôle du toucher sur les projets mobiles.");
  await page.goto("/#demo-retail");
  const demo = page.locator("#demo");
  await demo.getByRole("button", { name: "Jouer", exact: true }).click();
  await demo.getByRole("button", { name: "Jouer maintenant" }).click();
  const canvas = demo.getByTestId("demo-scratch");
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!;
  outer: for (let y = .15; y < .9; y += .2) {
    for (let x = .15; x < .9; x += .2) {
      await page.touchscreen.tap(bounds.x + bounds.width * x, bounds.y + bounds.height * y);
      if (await demo.getByRole("heading", { name: /Félicitations/ }).count()) break outer;
    }
  }
  await expect(demo.getByRole("heading", { name: /Félicitations.*un produit découverte/ })).toBeVisible();
});

test("changer d’activité annule la rotation et respecte l’historique", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#demo-restaurant");
  const demo = page.locator("#demo");
  await demo.getByRole("button", { name: "Jouer", exact: true }).click();
  await demo.getByRole("button", { name: "Jouer maintenant" }).click();
  await demo.getByRole("navigation", { name: "Activité de la démo" }).getByRole("link", { name: "Boutiques & commerces" }).click();
  await page.waitForTimeout(2300);
  await expect(demo.getByRole("heading", { name: /Félicitations/ })).toHaveCount(0);
  await expect(demo.getByRole("button", { name: "Jouer", exact: true })).toBeVisible();
  await page.goBack();
  await expect(demo.getByTestId("demo-phone")).toContainText("Le bistro");
});

test("@visual-1280 repères du hero dégagés et sélecteur accessible", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Une seule matrice visuelle.");
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const hero = page.getByRole("region", { name: /Donnez à vos clients/ });
    const phone = (await hero.locator("img").boundingBox())!;
    const label = (await hero.locator('[class*="journeySteps"] > span').nth(1).boundingBox())!;
    expect(label.y, `${width}: label under the full phone`).toBeGreaterThan(phone.y + phone.height + 6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: info.outputPath(`home-${width}.png`) });
    await page.goto("/#demo-retail");
    const choices = page.getByRole("navigation", { name: "Activité de la démo" });
    await expect(choices.getByRole("link", { name: "Boutiques & commerces" })).toHaveAttribute("aria-current", "true");
    expect((await choices.boundingBox())!.y).toBeGreaterThan(140);
    await page.screenshot({ path: info.outputPath(`demo-${width}.png`) });
  }
});
