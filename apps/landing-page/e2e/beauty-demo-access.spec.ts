import { expect, test } from "@playwright/test";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";

test.beforeEach(async ({ context, page, baseURL }) => {
  await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE, value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })), url: baseURL! }]);
  await context.route("**/_vercel/insights/**", route => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("Beauté : hero sans téléphone, tarif après la démo, vrai fond Rose poudré", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/instituts-beaute");
  const hero = page.getByTestId("sector-hero");
  const demo = page.locator("#demo");
  await expect(hero.locator("img")).toHaveCount(0);
  await expect(hero.getByRole("link", { name: "Essayer gratuitement", exact: true })).toBeVisible();
  await expect(hero.getByRole("link", { name: "Voir la démo", exact: true })).toHaveAttribute("href", "#demo");
  await expect(page.getByRole("complementary", { name: "Abonnement et essai" })).toHaveCount(1);
  expect(await page.evaluate(() => Boolean(document.querySelector("#demo")!.compareDocumentPosition(document.querySelector('aside[aria-label="Abonnement et essai"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(demo).not.toContainText(/Une attention, juste pour vous|Saisies non transmises|Essayez ici/);
  const phone = demo.getByTestId("demo-phone");
  const background = await phone.evaluate(element => getComputedStyle(element).backgroundImage);
  expect(background).toMatch(/beauty-rose-satin/);
  const backgroundUrl = background.match(/url\("?(.*?)"?\)/)![1];
  const response = await page.request.get(backgroundUrl);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/webp");
  expect((await response.body()).length).toBe(53056);
  await expect(phone.locator('[class*="screen"]')).toHaveCSS("background-image", "none");
  await phone.screenshot({ path: info.outputPath("beauty-real-background.png") });
  await page.goto("/instituts-beaute#demo-eyes");
  await expect(demo.getByTestId("demo-wheel")).toContainText("Teinture");
  await expect(phone).toHaveCSS("background-image", /beauty-rose-satin/);
  await page.goto("/restaurants");
  expect(await page.evaluate(() => Boolean(document.querySelector('aside[aria-label="Abonnement et essai"]')!.compareDocumentPosition(document.querySelector("#demo")!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(page.getByTestId("demo-phone")).toHaveCSS("background-image", "none");
  expect(errors).toEqual([]);
});

test("@visual-1280 accès à la démo Beauté sans obstacle sur les formats cibles", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Une seule matrice des formats.");
  for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1280, 720], [1280, 600], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/instituts-beaute");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const demo = page.locator("#demo");
    const box = (await demo.boundingBox())!;
    expect(box.y, `Démo remontée à ${width}px`).toBeLessThan(width >= 768 ? 600 : 830);
    await page.screenshot({ path: info.outputPath(`beauty-top-${width}-${height}.png`) });
    await page.getByTestId("sector-hero").getByRole("link", { name: "Voir la démo", exact: true }).click();
    await expect(page).toHaveURL(/#demo$/);
    await expect(demo.getByRole("button", { name: "Jouer", exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`beauty-demo-${width}-${height}.png`) });
  }
});
