import { expect, test } from "@playwright/test";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";

const articles = [
  { path: "/blog/programme-fidelite-institut-beaute", sections: ["comparatif", "budget"] },
  { path: "/blog/roue-fortune-institut-beaute", sections: ["lots", "projection"] },
] as const;

test("guides Beauté : lecture des tableaux et accès à la roue mobile @visual-1280", async ({ page, context, baseURL }, info) => {
  test.skip(info.project.name !== "desktop", "Matrice commune ordinateur et mobile");
  test.setTimeout(90_000);
  await context.addCookies([{
    name: ANALYTICS_CONSENT_COOKIE,
    value: encodeURIComponent(JSON.stringify({
      version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now(),
    })),
    url: baseURL!,
  }]);
  await context.route("**/_vercel/insights/**", route => route.abort());

  for (const [width, height] of [[1280, 720], [1280, 600], [390, 844]]) {
    await page.setViewportSize({ width, height });
    for (const article of articles) {
      const response = await page.goto(article.path);
      expect(response?.status()).toBe(200);
      expect(await response?.text()).toContain('"BlogPosting"');
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.okado.app${article.path}`);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: info.outputPath(`${article.path.split("/").pop()}-${width}x${height}.png`) });
      for (const id of article.sections) {
        const section = page.locator(`#${id}`);
        const table = section.getByRole("table");
        await table.scrollIntoViewIfNeeded();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        if (width < 768) {
          const region = section.getByRole("region");
          expect(await region.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(await region.evaluate(el => el.clientWidth));
        }
        await table.screenshot({
          path: info.outputPath(`${id}-${width}x${height}.png`),
          style: "header.sticky { visibility: hidden !important; }",
        });
      }
    }
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#demo-mobile").getByRole("link", { name: "Jouer à la démo Beauté" }).click();
  await expect(page).toHaveURL(/\/instituts-beaute#demo-care$/);
  const demo = page.locator("#demo");
  await expect(demo).toContainText("Soins visage & corps");
  await demo.getByRole("button", { name: "Jouer", exact: true }).click();
  await demo.getByRole("button", { name: "Jouer maintenant" }).click();
  await expect(demo.getByRole("heading", { name: /Félicitations.*un masque offert/ })).toBeVisible();
  await demo.getByRole("button", { name: "Recevoir mon gain" }).click();
  await demo.getByRole("button", { name: "Voir l’e-mail" }).click();
  await expect(demo.getByRole("heading", { name: "Votre e-mail de gain" })).toBeVisible();
  await demo.getByTestId("demo-phone").screenshot({
    path: info.outputPath("demo-e-mail-mobile.png"),
    style: "header.sticky { visibility: hidden !important; }",
  });
});
