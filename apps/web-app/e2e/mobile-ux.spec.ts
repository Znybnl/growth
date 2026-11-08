import { expect, test } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

test.beforeEach(async ({ context, baseURL }) => {
  test.setTimeout(90_000);
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await context.route(/https:\/\//, route => route.abort());
  await context.route("**/api/**", route => route.fulfill({ json: { suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});

test("enregistrer puis prévisualiser réserve un onglet et le ferme en cas d’échec", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await context.route("**/campaign/template-proof-campaign?preview=1", route => route.fulfill({ contentType: "text/html", body: "<h1>Mode prévisualisation</h1>" }));
  for (const success of [true, false]) {
    await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-published");
    await selectWizardStep(page, 1);
    await page.locator("textarea").first().fill("Un titre à sauvegarder explicitement");
    await page.getByTestId("wizard-mobile-actions").getByRole("button", { name: "Aperçu", exact: true }).click();
    const confirmation = page.getByRole("dialog", { name: "Enregistrer avant de prévisualiser ?" });
    await expect(confirmation).toBeVisible();
    await context.route("**/api/campaigns/setup", async route => {
      expect(route.request().postDataJSON().subtitle).toBe("Un titre à sauvegarder explicitement");
      await route.fulfill({ status: success ? 200 : 500, json: success ? { campaign: { id: "template-proof-campaign" } } : { error: "Échec fictif" } });
    });
    const opened = page.waitForEvent("popup");
    await confirmation.getByRole("button", { name: "Enregistrer et prévisualiser", exact: true }).click();
    const popup = await opened;
    if (success) {
      await expect(popup).toHaveURL(/\/campaign\/template-proof-campaign\?preview=1$/);
      await popup.close();
    } else {
      await expect.poll(() => popup.isClosed()).toBe(true);
      await expect(confirmation).toBeVisible();
      await expect(confirmation.getByRole("alert")).toBeVisible();
    }
    await context.unroute("**/api/campaigns/setup");
  }
});

test("un navigateur bloquant les onglets garde un aperçu intégré utilisable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => { window.open = () => null; });
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-create");
  await page.getByTestId("wizard-mobile-actions").getByRole("button", { name: "Aperçu", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Aperçu du jeu" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Aperçu du jeu" })).toHaveCount(0);
});

test("@visual-1280 KPI, axes et conversion restent lisibles du mobile au bureau", async ({ page }, info) => {
  for (const width of [320, 390, 412, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/dev/template-rendering-proof?mode=dashboard-responsive-mobile");
    const grid = page.getByTestId("dashboard-kpis");
    expect((await grid.evaluate(element => getComputedStyle(element).gridTemplateColumns)).split(" ")).toHaveLength(width < 768 ? 2 : 4);
    expect(await grid.locator(".okado-metric-card__value").evaluateAll(elements => elements.every(element => element.scrollWidth <= element.clientWidth + 1))).toBe(true);
    const description = page.getByText("Données fictives pour le contrôle responsive de l’accueil.", { exact: true });
    if (width < 768) await expect(description).toBeHidden(); else await expect(description).toBeVisible();
    const plot = page.getByTestId("activity-plot");
    await plot.scrollIntoViewIfNeeded();
    await page.getByLabel("Période d'analyse").selectOption("30");
    await expect.poll(async () => plot.locator("text").last().evaluate(element => {
      const scale = (element as SVGGraphicsElement).getScreenCTM()?.a ?? 0;
      return Math.round(Number.parseFloat(getComputedStyle(element).fontSize) * scale);
    })).toBeGreaterThanOrEqual(11);
    const dates = await plot.locator("text").filter({ hasText: /oct\./ }).evaluateAll(elements => elements.map(element => {
      const r = element.getBoundingClientRect(); return { left: r.left, right: r.right };
    }));
    for (let i = 1; i < dates.length; i++) expect(dates[i].left).toBeGreaterThan(dates[i - 1].right);
    const recent = page.getByRole("table", { name: "Vos dernières campagnes" });
    await recent.scrollIntoViewIfNeeded();
    if (width < 768) {
      const cells = recent.locator("tbody tr").first().locator("td[data-align=right]");
      const tops = await cells.evaluateAll(elements => elements.map(element => Math.round(element.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
    }
    await assertNoPageOverflow(page);
    await page.screenshot({ path: info.outputPath(`accueil-${width}.png`), animations: "disabled" });
    if (width === 1280) await captureVisualAt1280(page, info, "accueil-mobile-ux");
  }
});

test("recherche et statut se combinent, les cartes mobiles gardent les noms et masquent la consommation", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/dev/campaign-list-proof");
  const table = page.getByRole("table", { name: "Campagnes et indicateurs" });
  await expect(table.getByText("Taux de consommation", { exact: true }).last()).toBeHidden();
  const longTitle = table.getByText("Ticket du samedi au nom volontairement très long", { exact: true });
  expect(await longTitle.evaluate(element => getComputedStyle(element).webkitLineClamp)).toBe("2");
  await page.getByRole("searchbox").fill("SAMEDI");
  await page.getByLabel("Statut", { exact: true }).selectOption("paused");
  await page.getByRole("button", { name: "Filtrer", exact: true }).click();
  await expect(page).toHaveURL(/q=SAMEDI&status=paused/);
  await expect(table.getByRole("rowheader")).toHaveCount(1);
  await expect(longTitle).toBeVisible();
  await page.getByLabel("Statut", { exact: true }).selectOption("active");
  await page.getByRole("button", { name: "Filtrer", exact: true }).click();
  await expect(page.getByText("Aucune campagne trouvée", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Effacer", exact: true }).click();
  await expect(table.getByRole("rowheader")).toHaveCount(2);
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.getByLabel("Statut", { exact: true })).toHaveValue("all");
  await assertNoPageOverflow(page);
});

test("@visual-1280 barre compacte, accès Plus et cookies sans rangée réservée", async ({ page }, info) => {
  for (const width of [320, 390, 412, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit");
    const toolbar = page.getByTestId("wizard-save-toolbar");
    if (width < 768) {
      expect((await toolbar.boundingBox())!.height).toBeLessThanOrEqual(72);
      await expect(toolbar.getByRole("button", { name: "Enregistrer", exact: true })).toBeVisible();
      await expect(toolbar.getByRole("button", { name: "Aperçu", exact: true })).toBeVisible();
      await toolbar.getByRole("button", { name: "Plus d’actions du jeu" }).click();
      for (const name of ["QR code de diffusion", "QR code de prévisualisation", "Affiche", "Modifier l’e-mail de gain", "Publier la campagne", "Retour aux jeux"]) await expect(page.getByRole("menuitem", { name, exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Ouvrir le menu", exact: true }).click();
    }
    const before = (await page.context().cookies()).find(cookie => cookie.name === "okado_analytics_consent")?.value;
    await page.getByRole("button", { name: "Gérer les cookies", exact: true }).click();
    const preferences = page.getByRole("region", { name: "Votre choix de mesure d’audience" });
    await expect(preferences).toBeVisible();
    await preferences.getByRole("button", { name: "Continuer sans modifier mon choix" }).click();
    expect((await page.context().cookies()).find(cookie => cookie.name === "okado_analytics_consent")?.value).toBe(before);
    expect(await page.locator(".okado-workspace-shell").evaluate(element => Math.round(element.getBoundingClientRect().height))).toBe(720);
    await expect(page.locator(".okado-cookie-floating-trigger")).toBeHidden();
    await assertNoPageOverflow(page);
    await page.screenshot({ path: info.outputPath(`wizard-${width}.png`), animations: "disabled" });
    if (width === 1280) await captureVisualAt1280(page, info, "wizard-mobile-ux", 600);
  }
});

test("aperçu mobile : confirmation avant sauvegarde et conservation du brouillon sans sauvegarde", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  const writes: string[] = [];
  page.on("request", request => { if (request.method() === "POST" && request.url().includes("/api/")) writes.push(request.url()); });
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit");
  await selectWizardStep(page, 1);
  const title = page.locator("textarea").first();
  await title.fill("Un titre encore non enregistré");
  const parentUrl = page.url();
  const confirmation = page.getByRole("dialog", { name: "Enregistrer avant de prévisualiser ?" });
  await page.getByTestId("wizard-mobile-actions").getByRole("button", { name: "Aperçu", exact: true }).click();
  await expect(confirmation).toBeVisible();
  const popupPromise = page.waitForEvent("popup");
  await confirmation.getByRole("button", { name: "Prévisualiser sans enregistrer", exact: true }).click();
  const popup = await popupPromise;
  await popup.setViewportSize({ width: 390, height: 740 });
  await expect(popup).toHaveURL(/\/campaign\/template-proof-campaign\?preview=1$/);
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  expect(page.url()).toBe(parentUrl);
  await popup.close();
  await expect(title).toHaveValue("Un titre encore non enregistré");
  expect(writes).toEqual([]);
  // The action from the campaign list still opens the preview-only URL in a separate tab.
  await page.goto("/dev/campaign-list-proof");
  await context.route("**/campaign/wheel?preview=1", route => route.fulfill({ contentType: "text/html", body: "<h1>Mode prévisualisation</h1>" }));
  await page.getByRole("button", { name: "Ouvrir les actions de la campagne" }).first().click();
  const interactivePromise = page.waitForEvent("popup");
  await page.getByRole("menuitem", { name: "Prévisualiser", exact: true }).click();
  const interactive = await interactivePromise;
  await expect(interactive).toHaveURL(/\/campaign\/wheel\?preview=1$/);
  expect(page.url()).toContain("/dev/campaign-list-proof");
  expect(await interactive.evaluate(() => window.opener)).toBeNull();
  await interactive.close();
});
