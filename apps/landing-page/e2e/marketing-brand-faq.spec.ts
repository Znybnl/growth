import { expect, test } from "@playwright/test";
import { accountConnectionFaq } from "../src/lib/marketing-faqs";

for (const route of ["/", "/restaurants", "/instituts-beaute"]) {
  test(`${route}: identité, CTA, FAQ et navigation sans débordement`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();

    const brand = page.locator('header a[aria-label="Retour à l\'accueil Okado"]');
    await expect(brand.locator("svg.lucide-star")).toBeVisible();
    await expect(brand).toContainText("Okado");
    const headerCta = page.locator('header a[href$="/inscription"]');
    await expect(headerCta).toBeVisible();
    await expect(headerCta).toHaveCSS("color", "rgb(255, 255, 255)");
    expect(await headerCta.getAttribute("href")).toMatch(/^https:\/\/app\.okado\.app\/inscription$/);

    // Check every CTA (including the one on the dark Beauty section), not just the header.
    for (const cta of await page.locator('a[href$="/inscription"][class*="bg-"]').all()) {
      await expect(cta).toHaveCSS("color", "rgb(255, 255, 255)");
      if (route === "/instituts-beaute") {
        await expect(cta).toHaveCSS("background-color", "rgb(108, 0, 246)");
      }
    }
    if (route === "/instituts-beaute") {
      await expect(page.locator("footer svg.lucide-star")).toBeVisible();
      await page.getByRole("link", { name: "Démarrer mon essai gratuit" }).screenshot({
        path: testInfo.outputPath("dark-section-cta.png"),
      });
    }

    const question = page.locator("#faq summary").filter({ hasText: accountConnectionFaq.question });
    await question.click();
    await expect(question.locator("..").locator("p")).toHaveText(accountConnectionFaq.answer);
    await expect(question.locator("..").locator("p")).toBeVisible();
    await question.locator("..").screenshot({ path: testInfo.outputPath("faq.png") });

    if (route !== "/") {
      const structuredFaq = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
        scripts.flatMap((script) => JSON.parse(script.textContent ?? "{}")["@graph"] ?? [])
          .find((item) => item["@type"] === "FAQPage"),
      );
      expect(structuredFaq.mainEntity).toContainEqual({
        "@type": "Question", name: accountConnectionFaq.question,
        acceptedAnswer: { "@type": "Answer", text: accountConnectionFaq.answer },
      });
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    // Elements can overlap without causing scroll: check the new logo against the header CTA.
    const logoBox = (await brand.boundingBox())!;
    const ctaBox = (await headerCta.boundingBox())!;
    expect(logoBox.x + logoBox.width + 8).toBeLessThanOrEqual(ctaBox.x);
    expect(ctaBox.x + ctaBox.width).toBeLessThanOrEqual(page.viewportSize()!.width);

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: testInfo.outputPath("header-hero.png") });
    await brand.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("h1")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("Beauté : survol, focus clavier et CTA secondaire lisibles", async ({ page, isMobile }) => {
  await page.goto("/instituts-beaute");
  const cta = page.locator('header a[href$="/inscription"]');
  if (!isMobile) {
    await cta.hover();
    await expect(cta).toHaveCSS("background-color", "rgb(87, 0, 206)");
  } else {
    // Tailwind correctly disables hover on touch-only devices.
    await expect(cta).toHaveCSS("background-color", "rgb(108, 0, 246)");
  }
  await expect(cta).toHaveCSS("color", "rgb(255, 255, 255)");
  await page.mouse.move(0, 0);
  await page.locator('header a[aria-label="Retour à l\'accueil Okado"]').focus();
  for (let index = 0; index < 6 && !(await cta.evaluate((element) => element === document.activeElement)); index++) {
    await page.keyboard.press("Tab");
  }
  await expect(cta).toBeFocused();
  await expect(cta).toHaveCSS("outline-style", "solid");
  await expect(cta).toHaveCSS("outline-width", "2px");
  await expect(page.locator('a[href="#demo"]')).toHaveCSS("color", "rgb(81, 48, 73)");
});
