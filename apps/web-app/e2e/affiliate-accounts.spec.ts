import { expect, test } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { frequencies: [], enabled: false, days: 7, canEdit: true, updatedAt: null, counters: {}, items: [] } }));
});
for (const height of [720, 600]) test(`@visual-1280 gestion des comptes affiliés, ${height}px`, async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height });
  await page.goto("/dev/affiliate-accounts");
  const accounts = page.locator(".okado-affiliate-account-table");
  await expect(accounts.getByRole("row")).toHaveCount(3);
  await expect(accounts.getByRole("row").nth(1)).toContainText("Nouvelle Inscription");
  await expect(page.getByText("3 établissements", { exact: false })).toBeVisible();
  const row = accounts.getByRole("row").filter({ hasText: "Nouvelle Inscription" });
  await row.scrollIntoViewIfNeeded();
  await captureVisualAt1280(page, info, "affiliation-comptes", height);
  await row.getByRole("combobox", { name: "Statut" }).selectOption("active");
  const request = page.waitForRequest(r => r.method() === "PATCH" && r.url().includes("/api/affiliates/accounts/"));
  await row.getByRole("button", { name: "Enregistrer" }).click();
  expect((await request).postDataJSON()).toEqual({ status: "active", commissionRatePercent: 40, commissionDurationMonths: 12 });
});
for (const width of [320, 390, 1280]) test(`${width === 1280 ? "@visual-1280 " : ""}Mon compte : carte conditionnelle et lien commun, ${width}px`, async ({ page, context, baseURL }, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width, height: 720 });
  await page.goto("/dev/affiliate-accounts?mode=account#account-user");
  await page.getByRole("tab", { name: "Utilisateur", exact: true }).click();
  await expect(page.getByRole("button", { name: "Copier le lien" })).toHaveCount(0);
  await page.goto("/dev/affiliate-accounts?mode=account&enabled=1#account-user");
  await page.getByRole("tab", { name: "Utilisateur", exact: true }).click();
  const copy = page.getByRole("button", { name: "Copier le lien", exact: true });
  await copy.scrollIntoViewIfNeeded(); await copy.click();
  await expect(page.getByRole("button", { name: "Lien copié", exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}/inscription?ref=OKADO-CAMILLE`);
  await expect(page.getByText("Ce programme est commun à tous les établissements", { exact: false })).toBeVisible();
  await assertNoPageOverflow(page);
  if (width === 1280) await captureVisualAt1280(page, info, "affiliation-mon-compte");
  else await page.screenshot({ path: info.outputPath(`affiliation-compte-${width}.png`), fullPage: true });
});
test("390px : administration accessible sans débordement de page", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/affiliate-accounts");
  await expect(page.getByText("Nouvelle Inscription", { exact: true })).toBeVisible();
  await assertNoPageOverflow(page);
  await page.screenshot({ path: info.outputPath("affiliation-admin-mobile.png"), fullPage: true });
});
