import { expect, test } from "@playwright/test";
import { assertNoPageOverflow, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test("Mon compte mobile : raccourcis et protection des modifications", async ({ page, context, baseURL }, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/^https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { frequencies: [], enabled: false, days: 7, canEdit: true, updatedAt: null, counters: {}, items: [] } }));
  await page.goto("/dev/affiliate-accounts?mode=account&enabled=1");
  const summary = page.getByRole("region", { name: "Établissement sélectionné" });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("Maison Douceur");
  const shortcuts = page.getByRole("navigation", { name: "Accès rapide aux réglages" });
  await shortcuts.getByRole("button", { name: "Liens marketing" }).click();
  await expect(page.getByRole("heading", { name: "Liens marketing" })).toBeInViewport();
  await page.screenshot({ path: info.outputPath("compte-liens-mobile.png") });
  await shortcuts.getByRole("button", { name: "PIN" }).click();
  await expect(page.getByRole("heading", { name: "Code PIN de retrait" })).toBeInViewport();
  await shortcuts.getByRole("button", { name: "Informations" }).click();
  await page.getByLabel(/Nom du commerce/).fill("Modification à conserver");
  page.once("dialog", dialog => dialog.dismiss());
  await summary.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByLabel(/Nom du commerce/)).toHaveValue("Modification à conserver");
  await expect(page.getByRole("dialog", { name: "Ajouter un établissement" })).toHaveCount(0);
  await assertNoPageOverflow(page);
});
