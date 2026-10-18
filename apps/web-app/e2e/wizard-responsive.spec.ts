import { expect, test, type Page } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280 } from "./helpers/visual-1280";
import { selectWizardStep as step } from "./helpers/wizard-step";

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route("**/api/**", (route) => route.fulfill({ json: { suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});
test.afterEach(async ({ page }) => { expect(pageErrors.get(page)).toEqual([]); });

async function openWizard(page: Page, variant = "edit", template = "classic") {
  await page.goto(`/dev/template-rendering-proof?mode=wizard-responsive-${variant}&template=${template}`);
  const wizard = page.locator(".okado-wizard");
  const width = (await wizard.boundingBox())!.width;
  await expect(wizard).toHaveAttribute("data-layout", width >= 1200 ? "wide" : width >= 900 ? "compact" : "narrow");
}

test("@visual-1280 : jeu et lots lisibles dans le vrai shell à 1280×600/720", async ({ page }, info) => {
  for (const height of [600, 720]) {
    await page.setViewportSize({ width: 1280, height });
    await openWizard(page);
    await expect(page.locator(".okado-wizard")).toHaveAttribute("data-layout", "compact");
    const choices = page.getByTestId("wizard-game-choices").getByRole("button");
    for (const choice of await choices.all()) expect((await choice.boundingBox())!.width).toBeGreaterThanOrEqual(220);
    expect((await page.getByTestId("wizard-form").boundingBox())!.width).toBeGreaterThan(600);
    await captureVisualAt1280(page, info, "jeu", height);
    await page.getByTestId("wizard-game-choices").scrollIntoViewIfNeeded();
    await expect(choices.first().getByRole("heading")).toBeVisible();
    await expect(choices.last().getByRole("heading")).toBeVisible();
    await captureVisualAt1280(page, info, "cartes-jeu", height);
    await step(page, 3);
    const fields = page.getByTestId("wizard-prize-fields").first();
    await fields.scrollIntoViewIfNeeded();
    for (const input of await fields.locator("input").all()) expect((await input.boundingBox())!.width).toBeGreaterThanOrEqual(140);
    await captureVisualAt1280(page, info, "lots", height);
    const footer = page.getByTestId("wizard-footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.getByRole("button", { name: "Enregistrer le brouillon", exact: true })).toBeVisible();
    await captureVisualAt1280(page, info, "actions-formulaire", height);
    await fields.locator('input[type="number"]').first().fill("150");
    await footer.getByRole("button", { name: "Continuer", exact: true }).click();
    const error = page.getByTestId("wizard-form").getByRole("alert").last();
    await expect(error).toBeVisible();
    await error.scrollIntoViewIfNeeded();
    await captureVisualAt1280(page, info, "erreur-lot", height);
  }
});

for (const [width, height] of [[320, 740], [390, 844], [768, 900], [1024, 768], [1366, 768], [1440, 900], [1536, 864], [1920, 1080]]) {
  test(`mise en page et toutes les étapes à ${width}×${height}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await openWizard(page);
    for (const index of [0, 1, 2, 3, 4]) {
      await step(page, index);
      await assertNoPageOverflow(page);
      await expect(page.getByTestId("wizard-footer").getByRole("button", { name: /Enregistrer/ })).toBeEnabled();
    }
    const phone = page.getByTestId("wizard-phone-preview");
    if (await page.locator(".okado-wizard").getAttribute("data-inline-preview") === "true") {
      await expect(phone).toHaveCount(1);
      const bounds = (await phone.boundingBox())!;
      expect(bounds.width).toBeLessThanOrEqual(300);
      expect(bounds.width).toBeGreaterThanOrEqual(200);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      // The preview can be above the visible scroll position after navigating
      // down; bring the shell to its initial position before checking its fit.
      await page.locator(".okado-workspace-shell > div > main").evaluate((node) => { node.scrollTop = 0; });
      const fitted = (await phone.boundingBox())!;
      expect(fitted.y).toBeGreaterThanOrEqual(0);
      expect(fitted.y + fitted.height).toBeLessThanOrEqual(height + 1);
      await page.getByRole("button", { name: "Agrandir", exact: true }).click();
      const expanded = page.getByRole("dialog", { name: "Aperçu en direct" });
      await expect(expanded).toBeVisible();
      await expect(phone).toHaveCount(1);
      await page.keyboard.press("Escape");
      await expect(expanded).toHaveCount(0);
      await expect(phone).toHaveCount(1);
    } else {
      await page.getByRole("button", { name: "Voir l’aperçu", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Aperçu en direct" });
      await expect(dialog).toBeVisible();
      await expect(phone).toHaveCount(1);
      const bounds = (await phone.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Voir l’aperçu", exact: true })).toBeFocused();
    }
    await page.screenshot({ path: info.outputPath(`wizard-${width}x${height}.png`), animations: "disabled" });
  });
}

test("@visual-1280 : aperçu du brouillon courant, clavier et redimensionnement sans sauvegarde", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  const writes: string[] = [];
  page.on("request", (request) => { if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method()) && request.url().includes("/api/")) writes.push(request.url()); });
  await openWizard(page, "admin", "beauty-scratch-nude");
  await step(page, 1);
  const title = page.getByPlaceholder("Ex. La roue gourmande de juin");
  await title.fill("Brouillon responsive conservé");
  const promise = page.locator("textarea").first();
  await promise.fill("Un aperçu non enregistré");
  await page.getByRole("button", { name: "Voir l’aperçu", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Aperçu en direct" });
  await expect(dialog.getByText("Un aperçu non enregistré", { exact: true })).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await captureVisualAt1280(page, info, "apercu-brouillon", 600);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.locator(".okado-wizard")).toHaveAttribute("data-layout", "wide");
  await expect(title).toHaveValue("Brouillon responsive conservé");
  await page.setViewportSize({ width: 640, height: 360 }); // CSS viewport at 200% of 1280×720.
  await expect(page.getByRole("combobox", { name: "Étape de création" })).toBeVisible();
  await expect(promise).toHaveValue("Un aperçu non enregistré");
  await assertNoPageOverflow(page);
  expect(writes).toEqual([]);
});

test("@visual-1280 : création, accès aux étapes et état conservés au zoom/reflow", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openWizard(page, "create");
  await expect(page.getByRole("navigation", { name: "Étapes de création" }).getByRole("button").nth(3)).toBeDisabled();
  await page.getByRole("button", { name: "Ticket à gratter", exact: false }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Création responsive");
  for (const percent of [125, 150, 200]) {
    // CSS viewport reduction exercises reflow, not an assertion about a
    // particular browser's zoom UI or OS display scaling.
    await page.setViewportSize({ width: Math.round(1280 * 100 / percent), height: Math.round(720 * 100 / percent) });
    await expect(page.getByRole("combobox", { name: "Étape de création" })).toHaveValue("1");
    await expect(page.getByPlaceholder("Ex. La roue gourmande de juin")).toHaveValue("Création responsive");
    await assertNoPageOverflow(page);
  }
  await captureVisualAt1280(page, info, "creation-promesse");
});
