import { expect, test } from "@playwright/test";
import { captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { assets: {}, items: [], suggestions: [] } }));
});

for (const admin of [false, true]) {
  test(`@visual-1280 ${admin ? "administrateur" : "marchand"} : les nouvelles roues et tickets enregistrent Élegance par défaut`, async ({ page }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1280, height: 720 });
    for (const game of ["wheel", "scratch"]) {
      await page.route("**/campaigns/setup", route => route.fulfill({ json: { campaign: { id: "created-poster-fixture" } } }));
      await page.goto(`/dev/template-rendering-proof?mode=wizard-responsive-create${admin ? "-admin" : ""}`);
      if (game === "scratch") await page.getByTestId("wizard-game-choices").getByRole("button", { name: /Ticket à gratter/ }).click();
      await page.getByRole("button", { name: "Continuer", exact: true }).click();
      await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Jeu fictif — affiche par défaut");
      await captureVisualAt1280(page, info, `creation-${admin ? "admin" : "marchand"}-${game}`);
      const pending = page.waitForRequest(request => request.url().endsWith("/campaigns/setup") && request.method() === "POST");
      await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).last().click();
      const request = await pending;
      const payload = request.postDataJSON();
      expect(payload.gameType).toBe(game);
      expect(payload.presentation.poster.templateId).toBe("premium-wheel");
      expect(payload.presentation.poster.headlineFontFamily).toBe("cormorant");
      expect(request.url().includes("/api/admin/")).toBe(admin);
      await expect(page.getByRole("dialog")).toBeVisible();
    }
  });
}

test("@visual-1280 : Élegance est sélectionné et rendu ; un autre choix peut être enregistré", async ({ page }, info) => {
  test.setTimeout(120000);
  for (const [width, height] of [[1280, 720], [1280, 600], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/dev/template-rendering-proof?mode=poster-defaults");
    await expect(page.getByRole("button", { name: /^Élégance/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Télécharger le PNG", exact: true })).toBeEnabled({ timeout: 60000 });
    const image = page.getByAltText("Prévisualisation affiche", { exact: true });
    expect(await image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    if (width === 1280) await captureVisualAt1280(page, info, "affiche-elegance-defaut", height);
    else await page.screenshot({ path: info.outputPath("affiche-elegance-mobile.png") });
  }
  await page.getByRole("button", { name: /^Classique/ }).click();
  await expect(page.getByRole("button", { name: /^Classique/ })).toHaveAttribute("aria-pressed", "true");
  const pending = page.waitForRequest(request => request.url().endsWith("/poster-settings") && request.method() === "POST");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  expect((await pending).postDataJSON().poster.templateId).toBe("classic-wheel");
});
