import { expect, test } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});

test("mobile : accès Actives, métriques compactes et pagination préservant les filtres", async ({ page }) => {
  for (const [width, height] of [[320, 568], [390, 740], [412, 844]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/dev/campaign-list-proof");
    const table = page.getByRole("table", { name: "Campagnes et indicateurs" });
    const statusLinks = page.getByRole("navigation", { name: "Filtre rapide par statut" });
    await expect(statusLinks.getByRole("link", { name: /^Actives \d+$/ })).toBeVisible();
    await expect(table.getByRole("rowheader")).toHaveCount(10);
    await expect(table.getByRole("row").nth(1).getByText("Lots utilisés")).toBeHidden();
    await expect(table.getByRole("row").nth(1).getByText("Participations")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Pagination des campagnes" })).toContainText("1–10 sur 40");

    await statusLinks.getByRole("link", { name: /^Actives \d+$/ }).click();
    await expect(page).toHaveURL(/status=active/);
    await expect(table.getByRole("rowheader")).toHaveCount(10);
    await expect(table.getByText("En pause", { exact: true })).toHaveCount(0);

    await page.getByRole("link", { name: "Voir les 10 suivantes" }).click();
    await expect(page).toHaveURL(/status=active&page=2|page=2&status=active/);
    await expect(page.getByRole("navigation", { name: "Pagination des campagnes" })).toContainText("page 2 sur");

    await page.getByRole("searchbox").fill("samedi");
    await page.getByRole("button", { name: "Filtrer", exact: true }).click();
    await expect(page).toHaveURL(/q=samedi&status=active/);
    await expect(page.getByText("Aucune campagne trouvée", { exact: true })).toBeVisible();
    await statusLinks.getByRole("link", { name: /^En pause \d+$/ }).click();
    await expect(page).toHaveURL(/q=samedi&status=paused/);
    await expect(table.getByRole("rowheader")).toHaveCount(1);
    await expect(table.getByText("Ticket du samedi au nom volontairement très long", { exact: true })).toBeVisible();
    await assertNoPageOverflow(page);
  }
});

test("@visual-1280 bureau : pagination et tableau restent visibles dans le shell", async ({ page }, info) => {
  for (const height of [600, 720]) {
    await page.setViewportSize({ width: 1280, height });
    await page.goto("/dev/campaign-list-proof");
    await expect(page.getByRole("navigation", { name: "Filtre rapide par statut" })).toBeHidden();
    await expect(page.getByLabel("Statut", { exact: true })).toBeVisible();
    await expect(page.getByRole("table", { name: "Campagnes et indicateurs" }).getByRole("columnheader", { name: "Taux de consommation" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Pagination des campagnes" })).toContainText("1–10 sur 40");
    await assertNoPageOverflow(page);
    await captureVisualAt1280(page, info, `campaigns-list-${height}`, height);
  }
});
