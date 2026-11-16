import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { assets: {}, items: [], suggestions: [] } }));
});

test("nouvelle roue Beauté : Nude & Or persiste après ticket et sauvegarde", async ({ page }) => {
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-create&business=beauty");
  const preview = page.frameLocator('iframe[data-replay-preview]').locator('.okado-preview-surface[data-template-id="beauty-nude"]');
  await expect(preview).toBeVisible();
  const choices = page.getByTestId("wizard-game-choices");
  await choices.getByRole("button", { name: /Ticket à gratter/ }).click();
  await expect(page.frameLocator('iframe[data-replay-preview]').locator('.okado-preview-surface[data-template-id="beauty-scratch-nude"]')).toBeVisible();
  await choices.getByRole("button", { name: /Roue de la fortune/ }).click();
  await expect(preview).toBeVisible();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Jeu fictif");
  await page.route("**/campaigns/setup", route => route.fulfill({ json: { campaign: { id: "fixture" } } }));
  const request = page.waitForRequest(req => req.url().endsWith("/campaigns/setup") && req.method() === "POST");
  await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).last().click();
  const presentation = (await request).postDataJSON().presentation;
  expect(presentation.layout.templateId).toBe("beauty-nude");
  expect(presentation.background.color).toBe("#f8f3ea");
  expect(presentation.heading.fontFamily).toBe("playfair");
  expect(presentation.wheel.loseColor).toBe("#b99052");
});

test("autre secteur et campagne existante gardent Moderne", async ({ page }) => {
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-create&business=retail");
  await expect(page.frameLocator('iframe[data-replay-preview]').locator('.okado-preview-surface[data-template-id="cocorico-wheel"]')).toBeVisible();
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive&business=beauty&template=cocorico-wheel");
  await expect(page.frameLocator('iframe[data-replay-preview]').locator('.okado-preview-surface[data-template-id="cocorico-wheel"]')).toBeVisible();
});
