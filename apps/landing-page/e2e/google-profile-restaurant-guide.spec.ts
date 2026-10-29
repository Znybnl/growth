import { expect, test } from "@playwright/test";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";

const path = "/blog/creer-fiche-google-restaurant";
test.use({ contextOptions: { reducedMotion: "reduce" } });
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{
    name: ANALYTICS_CONSENT_COOKIE,
    value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })),
    url: baseURL!,
  }]);
});

test("guide restaurant : choisir son point d’entrée, consulter la carte et vérifier le bilan @visual-1280", async ({ page, request }, testInfo) => {
  if (testInfo.project.name === "desktop") await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  expect((await page.goto(path))?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Créer une fiche Google pour un restaurant : le guide pratique");
  await expect(page.getByRole("navigation", {
    name: page.viewportSize()!.width >= 1024 ? "Navigation principale" : "Navigation mobile",
  })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("restaurant-guide-header.png") });
  const entries = page.getByRole("navigation", { name: "Choisir votre situation" }).getByRole("link");
  await expect(entries).toHaveCount(3);
  for (const [index, id] of ["preparer", "rechercher", "completer"].entries()) {
    await entries.nth(index).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    const heading = page.locator(`#${id} h2`);
    await expect(heading).toBeInViewport();
    expect((await heading.boundingBox())!.y).toBeGreaterThanOrEqual(72);
  }
  const toc = page.getByLabel("Sommaire du guide", { exact: true });
  if (page.viewportSize()!.width < 1024) {
    await toc.locator("summary").click();
    await toc.getByRole("link", { name: "6. Ajouter une carte lisible avec les bons prix" }).click();
    await expect(page).toHaveURL(/#menu$/);
    await toc.locator("summary").click();
    await expect(toc).not.toHaveAttribute("open");
  }
  const figures = page.locator("article figure");
  await expect(figures).toHaveCount(2);
  for (const [index, figure] of (await figures.all()).entries()) {
    await figure.scrollIntoViewIfNeeded();
    await expect.poll(() => figure.getByRole("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    const originalLink = figure.getByRole("link", { name: /^Agrandir la capture/ });
    await originalLink.focus();
    const response = await request.get((await originalLink.getAttribute("href"))!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    const popup = page.waitForEvent("popup");
    await originalLink.press("Enter");
    const enlarged = await popup;
    await enlarged.waitForLoadState();
    expect(new URL(enlarged.url()).pathname).toBe(await originalLink.getAttribute("href"));
    await enlarged.close();
    await page.screenshot({ path: testInfo.outputPath(`restaurant-guide-capture-${index + 1}.png`) });
  }
  for (const id of ["horaires", "menu", "mesurer", "depannage"]) {
    const section = page.locator(`#${id}`);
    await section.evaluate(el => el.scrollIntoView({ behavior: "instant", block: "start" }));
    const region = section.getByRole("region");
    await region.focus();
    await expect(region).toBeFocused();
    if (page.viewportSize()!.width < 768) {
      expect(await region.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(await region.evaluate(el => el.clientWidth));
      for (const label of await region.locator('td > span[aria-hidden="true"]').all()) await expect(label).toBeVisible();
    }
    await page.screenshot({ path: testInfo.outputPath(`restaurant-guide-${id}.png`) });
  }
  await expect(page.locator("#mesurer")).toContainText("les 12 créneaux sont passés");
  await expect(page.locator("#mesurer")).toContainText("840 €");
  const optional = page.locator("#suivi-optionnel details");
  await expect(optional).not.toHaveAttribute("open");
  await optional.locator("summary").click();
  await expect(optional).toContainText("utm_source=google");
  await optional.locator("summary").click();
  const checklist = page.locator("#checklist");
  await expect(checklist.getByRole("checkbox")).toHaveCount(10);
  const checkbox = checklist.getByRole("checkbox").first();
  await checkbox.focus();
  await checkbox.press("Space");
  await expect(checkbox).toBeChecked();
  await checklist.evaluate(el => el.scrollIntoView({ behavior: "instant", block: "start" }));
  await page.screenshot({ path: testInfo.outputPath("restaurant-guide-checklist.png") });
  await expect(page.getByRole("link", { name: "Essayer une animation pour restaurant" })).toHaveAttribute("href", "/restaurants#demo");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(errors).toEqual([]);
});

test("guide restaurant : dépannage à 1280 × 600 @visual-1280", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Hauteur dense sur ordinateur");
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("restaurant-guide-600-header.png") });
  await page.locator("#depannage").evaluate(el => el.scrollIntoView({ behavior: "instant", block: "start" }));
  await expect(page.locator("#depannage h2")).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("restaurant-guide-600-help.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1280);
});
