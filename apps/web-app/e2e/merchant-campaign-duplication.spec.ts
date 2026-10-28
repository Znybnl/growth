import { expect, test } from "@playwright/test";
import { captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test("@visual-1280 la popin de duplication ouvre le wizard de la copie", async ({ page, context, baseURL }, testInfo) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.addInitScript(() => {
    const originalPushState = window.history.pushState.bind(window.history);
    (window as Window & { __okadoNavigations?: string[] }).__okadoNavigations = [];
    window.history.pushState = (...args) => {
      (window as Window & { __okadoNavigations?: string[] }).__okadoNavigations?.push(
        String(args[2] ?? ""),
      );
      return originalPushState(...args);
    };
  });

  await page.route("**/api/campaigns/merchant-copy-fixture/duplicate", async (route) => {
    await route.fulfill({
      status: 201,
      json: { campaign: { campaign: { id: "merchant-copy-result" } } },
    });
  });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/dev/admin-duplication-proof");
  await page.getByRole("region", { name: "Marchand", exact: true })
    .getByRole("button", { name: "Ouvrir les actions" })
    .click();
  await page.getByRole("button", { name: "Dupliquer", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Votre jeu est prêt à être vérifié" })).toBeVisible();
  await captureVisualAt1280(page, testInfo, "duplicate-campaign-ready-dialog");
  await dialog.getByRole("button", { name: "Modifier le jeu", exact: true }).click();

  await expect.poll(() => page.evaluate(
    () => (window as Window & { __okadoNavigations?: string[] }).__okadoNavigations ?? [],
  )).toContain("/campaigns/merchant-copy-result/edit/guided");
});
