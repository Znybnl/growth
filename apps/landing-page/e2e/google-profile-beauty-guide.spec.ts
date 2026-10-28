import { expect, test } from "@playwright/test";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";

// Capture the settled layout using the site's supported reduced-motion preference.
test.use({ contextOptions: { reducedMotion: "reduce" } });

test("guide Google : captures lisibles, agrandissement et tableaux sans débordement @visual-1280", async ({ page, context, baseURL, request }, testInfo) => {
  if (testInfo.project.name === "desktop") {
    await page.setViewportSize({ width: 1280, height: 720 });
  }
  await context.addCookies([{
    name: ANALYTICS_CONSENT_COOKIE,
    value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })),
    url: baseURL!,
  }]);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/blog/creer-fiche-google-institut-beaute");
  await expect(page.locator("h1")).toContainText("Créer une fiche Google");
  await expect(page.getByRole("navigation", {
    name: page.viewportSize()!.width >= 1024 ? "Navigation principale" : "Navigation mobile",
  })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("google-guide-header.png") });

  const entry = page.getByRole("navigation", { name: "Choisir votre situation" });
  await expect(entry.getByRole("link")).toHaveCount(3);
  for (const [label, id] of [
    ["Je crée ma première fiche", "preparer"],
    ["Une fiche existe, sans accès", "rechercher"],
    ["Je gère une fiche validée", "completer"],
  ]) {
    await entry.getByRole("link", { name: new RegExp(label) }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    const heading = page.locator(`#${id}`).getByRole("heading");
    await expect(heading).toBeInViewport();
    expect((await heading.boundingBox())!.y).toBeGreaterThanOrEqual(72);
  }
  const toc = page.getByLabel("Sommaire du guide", { exact: true });
  if (page.viewportSize()!.width < 1024) {
    await expect(toc).not.toHaveAttribute("open");
    await toc.getByText("Sommaire des étapes", { exact: true }).click();
    await expect(toc).toHaveAttribute("open", "");
    await toc.getByRole("link", { name: "7. Ajouter trois prestations avec prix et durée" }).click();
    await expect(page).toHaveURL(/#services$/);
    await toc.getByText("Sommaire des étapes", { exact: true }).click();
    await expect(toc).not.toHaveAttribute("open");
  }

  const figures = page.locator("article figure");
  await expect(figures).toHaveCount(2);
  for (let index = 0; index < 2; index++) {
    const figure = figures.nth(index);
    const image = figure.getByRole("img");
    await figure.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
    await expect(figure.locator("time")).toHaveAttribute("datetime", "2026-10-27");
    const link = figure.getByRole("link", { name: /^Agrandir la capture/ });
    await link.focus();
    await expect(link).toBeFocused();
    const original = await request.get((await link.getAttribute("href"))!);
    expect(original.status()).toBe(200);
    expect(original.headers()["content-type"]).toContain("image/jpeg");
    await page.screenshot({ path: testInfo.outputPath(`google-guide-step-${index + 1}.png`) });
    if (index === 1) {
      const newPage = context.waitForEvent("page");
      await link.press("Enter");
      const enlarged = await newPage;
      await enlarged.waitForLoadState();
      expect(new URL(enlarged.url()).pathname).toBe(await link.getAttribute("href"));
      await enlarged.close();
    }
  }
  const optional = page.locator("#suivi-optionnel details");
  await expect(optional).not.toHaveAttribute("open");
  await optional.locator("summary").click();
  await expect(optional).toHaveAttribute("open", "");
  await expect(optional).toContainText("utm_source=google");
  await optional.locator("summary").click();

  const checklist = page.locator("#checklist");
  await expect(checklist.getByRole("checkbox")).toHaveCount(9);
  const first = checklist.getByRole("checkbox").first();
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await checklist.evaluate(element => element.scrollIntoView({ behavior: "instant", block: "start" }));
  await expect(checklist.getByRole("heading")).toBeInViewport({ ratio: 1 });
  expect((await checklist.getByRole("heading").boundingBox())!.y).toBeGreaterThanOrEqual(110);
  await page.screenshot({ path: testInfo.outputPath("google-guide-checklist.png") });
  await first.uncheck();
  const tables = await page.getByRole("region").filter({ has: page.getByRole("table") }).all();
  for (const [index, region] of tables.entries()) {
    await region.scrollIntoViewIfNeeded();
    await region.focus();
    await expect(region).toBeFocused();
    if (page.viewportSize()!.width < 768) {
      const bounds = (await region.boundingBox())!;
      expect(await region.evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(Math.ceil(bounds.width));
      for (const row of await region.locator("tbody tr").all()) {
        for (const cell of await row.locator("th, td").all()) {
          const box = (await cell.boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(bounds.x);
          expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
        }
        for (const label of await row.locator('td > span[aria-hidden="true"]').all()) {
          await expect(label).toBeVisible();
        }
      }
    }
    await page.screenshot({ path: testInfo.outputPath(`google-guide-table-${index + 1}.png`) });
  }
  await expect(page.locator("#optimiser h2")).toHaveText("Améliorer une fiche Google déjà validée");
  await expect(page.locator("#mesurer")).toContainText("les six créneaux sont tous passés");
  const takeaway = page.getByText("À retenir", { exact: true }).locator("..");
  await takeaway.scrollIntoViewIfNeeded();
  await expect(takeaway.getByRole("link")).toHaveAttribute("href", "/instituts-beaute#demo");
  await page.screenshot({ path: testInfo.outputPath("google-guide-analysis.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(errors).toEqual([]);
});

test("guide Google : parcours et dépannage à 1280 × 600 @visual-1280", async ({ page, context, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Contrôle de hauteur dense sur ordinateur");
  await context.addCookies([{
    name: ANALYTICS_CONSENT_COOKIE,
    value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })),
    url: baseURL!,
  }]);
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("/blog/creer-fiche-google-institut-beaute");
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("google-guide-600-header.png") });
  await page.locator("#depannage").getByRole("heading").scrollIntoViewIfNeeded();
  await expect(page.getByRole("table", { name: "Fiche Google : première vérification et prochaine action" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("google-guide-600-help.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1280);
});
