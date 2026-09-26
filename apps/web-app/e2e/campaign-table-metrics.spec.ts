import { expect, test } from "@playwright/test";

import { getCampaignStockMetrics } from "../src/lib/campaign-table-metrics";
import { signIn } from "./auth-session";

test.describe("Indicateurs du tableau des campagnes", () => {
  test("calcule les lots utilisés et le taux pondéré sur le stock quantifié", () => {
    expect(
      getCampaignStockMetrics([
        { totalQuantity: 100, remainingQuantity: 65 },
        { totalQuantity: 20, remainingQuantity: 5 },
        { totalQuantity: null, remainingQuantity: null },
        { totalQuantity: 0, remainingQuantity: 0 },
      ]),
    ).toEqual({ lotsUsed: 50, consumptionRate: 42 });
  });

  test("ignore les lots sans quantité et borne le stock restant", () => {
    expect(
      getCampaignStockMetrics([
        { totalQuantity: null, remainingQuantity: 4 },
        { totalQuantity: 8, remainingQuantity: null },
      ]),
    ).toEqual({ lotsUsed: 0, consumptionRate: null });

    expect(
      getCampaignStockMetrics([
        { totalQuantity: 10, remainingQuantity: 14 },
        { totalQuantity: 10, remainingQuantity: -2 },
      ]),
    ).toEqual({ lotsUsed: 10, consumptionRate: 50 });
  });

  test("affiche les nouveaux indicateurs sur desktop et mobile", async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/campaigns");

    const desktopTable = page.locator(".okado-responsive-table__desktop");
    await expect(desktopTable.getByText("Participations", { exact: true })).toBeVisible();
    await expect(desktopTable.getByText("Gagnants", { exact: true })).toBeVisible();
    await expect(desktopTable.getByText("Lots utilisés", { exact: true })).toBeVisible();
    await expect(desktopTable.getByText("Taux de consommation", { exact: true })).toBeVisible();
    await expect(desktopTable.getByText("Scans", { exact: true })).toHaveCount(0);
    await expect(desktopTable.getByText("Conv.", { exact: true })).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileList = page.locator(".okado-responsive-table__mobile");
    await expect(mobileList).toBeVisible();
    const firstCampaign = mobileList.locator(".okado-mobile-table-row").first();
    if (!(await firstCampaign.count())) {
      test.skip(true, "Le compte E2E ne contient pas de campagne à afficher sur mobile.");
      return;
    }
    await expect(firstCampaign.getByText("Participations", { exact: true })).toBeVisible();
    await expect(firstCampaign.getByText("Gagnants", { exact: true })).toBeVisible();
    await expect(firstCampaign.getByText("Lots utilisés", { exact: true })).toBeVisible();
    await expect(firstCampaign.getByText("Taux de consommation", { exact: true })).toBeVisible();
    await expect
      .poll(() => firstCampaign.evaluate((element) => element.scrollWidth <= element.clientWidth))
      .toBe(true);
  });
});
