import { expect, test } from "@playwright/test";

import { calculateCampaignConsumptionMetrics } from "../src/lib/dashboard-metrics";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { signIn } from "./auth-session";

test.describe("Indicateurs du tableau des campagnes", () => {
  test("calcule les lots utilisés et le taux depuis les gains et retraits", () => {
    expect(
      calculateCampaignConsumptionMetrics(120, 50),
    ).toEqual({ lotsUsed: 50, consumptionRate: 42 });
  });

  test("inclut les lots à stock illimité et affiche 0 % sans gain", () => {
    expect(
      calculateCampaignConsumptionMetrics(4, 2),
    ).toEqual({ lotsUsed: 2, consumptionRate: 50 });
    expect(calculateCampaignConsumptionMetrics(0, 0)).toEqual({ lotsUsed: 0, consumptionRate: 0 });
  });

  test("affiche une seule liste de campagnes avec les mêmes chiffres sur ordinateur et mobile", async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/campaigns");

    const table = page.getByRole("table", { name: "Campagnes et indicateurs" });
    const headers = table.getByRole("columnheader");
    for (const label of ["Participations", "Gagnants", "Lots utilisés", "Taux de consommation"]) {
      await expect(headers.filter({ hasText: label })).toBeVisible();
    }
    const desktopHelp = table.getByRole("button", { name: "À propos du taux de consommation" });
    await desktopHelp.focus();
    await expect(table.getByRole("tooltip")).toContainText("lots retirés ÷ lots gagnés × 100");
    await expect(table.getByRole("tooltip")).toContainText("stock illimité");

    const rows = table.getByRole("row").filter({ has: page.getByRole("rowheader") });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    const first = rows.first();
    const title = await first.getByRole("rowheader").locator("p").first().innerText();
    await expect(table.getByRole("button", { name: "Ouvrir les actions de la campagne", includeHidden: true })).toHaveCount(count);
    const trigger = first.getByRole("button", { name: "Ouvrir les actions de la campagne" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem", { name: "QR Code", exact: true })).toBeVisible();
    await page.getByRole("menuitem", { name: "QR Code", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("QR code de diffusion");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(rows).toHaveCount(count);
    for (const label of ["Participations", "Gagnants", "Lots utilisés"]) {
      await expect(first.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(first.getByRole("button", { name: "À propos du taux de consommation" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await trigger.click();
    await expect(page.getByRole("menuitem", { name: "Prévisualiser", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto(`/campaigns?q=${encodeURIComponent(title)}`);
    await expect(table.getByRole("rowheader").getByText(title, { exact: true }).first()).toBeVisible();
    await page.goto("/campaigns?q=aucune-campagne-fixture-748-xyz");
    await expect(page.getByText("Aucune campagne trouvée", { exact: true })).toBeVisible();
  });
});

test("@visual-1280 : liste Campagnes et actions sur ordinateur et mobile", async ({ page, context, baseURL }, info) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route("**/api/merchant/email-alerts", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/campaigns/wheel/qr?inline=1", (route) => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40"/></svg>',
  }));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/dev/campaign-list-proof");
  const table = page.getByRole("table", { name: "Campagnes et indicateurs" });
  await expect(table.getByRole("rowheader")).toHaveCount(2);
  await expect(table.getByText("50%", { exact: true })).toBeVisible();
  await expect(table.getByText("0%", { exact: true })).toBeVisible();
  await assertNoPageOverflow(page);
  await captureVisualAt1280(page, info, "liste-campagnes");

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await assertNoPageOverflow(page);
    await expect(table.getByRole("rowheader")).toHaveCount(2);
    const triggers = table.getByRole("button", { name: "Ouvrir les actions de la campagne", includeHidden: true });
    await expect(triggers).toHaveCount(2);
    await triggers.first().click();
    await page.getByRole("menuitem", { name: "QR Code", exact: true }).click();
    await expect(page.getByRole("img", { name: "QR code de diffusion du jeu" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.screenshot({ animations: "disabled", path: info.outputPath(`liste-campagnes-${width}.png`) });
  }
});
