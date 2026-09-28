import { expect, test } from "@playwright/test";

import { calculateCampaignConsumptionMetrics } from "../src/lib/dashboard-metrics";
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

  test("affiche les nouveaux indicateurs sur desktop et mobile", async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/campaigns");

    const desktopTable = page.locator(".okado-responsive-table__desktop");
    await expect(desktopTable.getByText("Participations", { exact: true })).toBeVisible();
    await expect(desktopTable.getByText("Gagnants", { exact: true })).toBeVisible();
    await expect(desktopTable.getByText("Lots utilisés", { exact: true })).toBeVisible();
    await expect(desktopTable.locator(".okado-table-header")).toContainText("Taux de consommation");
    await expect(page.getByText(/Les lots utilisés et leur taux sont calculés sur le stock quantifié/)).toHaveCount(0);
    const desktopHelp = desktopTable.getByRole("button", { name: "À propos du taux de consommation" });
    await desktopHelp.focus();
    await expect(desktopTable.getByRole("tooltip")).toContainText("lots retirés ÷ lots gagnés × 100");
    await expect(desktopTable.getByRole("tooltip")).toContainText("stock illimité");
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
    const mobileRate = firstCampaign.locator(".okado-mobile-table-stat").filter({ hasText: "Taux de consommation" });
    await expect(mobileRate).toContainText("Taux de consommation");
    await expect(mobileRate.getByRole("button", { name: "À propos du taux de consommation" })).toBeVisible();
    await expect
      .poll(() => firstCampaign.evaluate((element) => element.scrollWidth <= element.clientWidth))
      .toBe(true);
  });
});
