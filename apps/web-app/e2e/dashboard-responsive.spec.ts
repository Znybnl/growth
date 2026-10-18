import { expect, test, type Page } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280 } from "./helpers/visual-1280";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on("pageerror", (error) => messages.push(error.message));
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route("**/api/**", (route) => route.fulfill({ json: { items: [], emailCount: 0 } }));
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

const recentCampaigns = (page: Page) => page.getByRole("region", { name: "Vos dernières campagnes" });

test("@visual-1280 : accueil, une ligne par campagne à 1280×720 et 1280×600", async ({ page }, info) => {
  for (const height of [720, 600]) {
    await page.setViewportSize({ width: 1280, height });
    await page.goto("/dev/template-rendering-proof?mode=dashboard-responsive");
    const section = recentCampaigns(page);
    await section.scrollIntoViewIfNeeded();
    const table = section.getByRole("table");
    await expect(table).toBeVisible();
    await expect(section.getByTestId("recent-campaign-cards")).toBeHidden();
    await expect(table.getByRole("columnheader")).toHaveText(["Campagne", "Type", "Scans", "Participations", "Conversion", "Actions"]);
    const rows = table.locator("tbody tr");
    await expect(rows).toHaveCount(6);
    await expect(rows.nth(1).getByRole("cell")).toHaveText(["Ticket à gratter", "12345678", "9876543", "40%", ""]);
    await expect(rows.last().getByRole("cell")).toHaveText(["Ticket à gratter", "0", "2", "200%", ""]);
    await expect(table.getByRole("img", { name: "Campagne active", exact: true })).toHaveCount(4);
    await expect(table.getByRole("img", { name: "Campagne en pause", exact: true })).toHaveCount(1);
    await expect(table.getByRole("img", { name: "Campagne arrêtée : stock épuisé", exact: true })).toHaveCount(1);

    const longName = rows.nth(1).locator("th .truncate[title]");
    await expect(longName).toHaveAttribute("title", (await longName.textContent())!);
    const metrics = await table.evaluate((node) => ({
      rows: [...node.querySelectorAll("tbody tr")].map((row) => row.getBoundingClientRect().height),
      clippedCells: [...node.querySelectorAll("td")].filter((cell) => cell.scrollWidth > cell.clientWidth + 1).map((cell) => cell.textContent),
      clippedHeaders: [...node.querySelectorAll("thead th")].filter((cell) => cell.scrollWidth > cell.clientWidth + 1).map((cell) => cell.textContent),
    }));
    expect(metrics.rows.every((height) => height <= 64)).toBe(true);
    expect(metrics.clippedCells).toEqual([]);
    expect(metrics.clippedHeaders).toEqual([]);
    const scroll = section.getByTestId("recent-campaigns-scroll");
    expect(await scroll.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await captureVisualAt1280(page, info, "accueil-campagnes", height);

    // The same menu remains reachable, with the campaign-specific destinations.
    const trigger = rows.first().getByRole("button", { name: "Ouvrir les actions de la campagne" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem", { name: "Modifier", exact: true })).toHaveAttribute("href", "/campaigns/dashboard-fixture-0/edit/guided");
    await expect(page.getByRole("menuitem", { name: "Données", exact: true })).toHaveAttribute("href", "/data?campaign=dashboard-fixture-0");
    await expect(page.getByRole("menuitem", { name: "Prévisualiser", exact: true })).toBeVisible();
    await captureVisualAt1280(page, info, "accueil-actions", height);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();

    // The last campaign is accessible and the column headers stay in view.
    await scroll.evaluate((node) => { node.scrollTop = node.scrollHeight; });
    await expect(rows.last().getByRole("button")).toBeInViewport();
    await expect(table.getByRole("columnheader", { name: "Participations", exact: true })).toBeInViewport();
  }
});

test("accueil : cartes sur petits conteneurs, tableau sur ordinateur et redimensionnement", async ({ page }, info) => {
  await page.goto("/dev/template-rendering-proof?mode=dashboard-responsive");
  for (const [width, height, tabular] of [[320, 740, false], [390, 844, false], [768, 900, false], [1024, 768, false], [1120, 720, true], [1920, 1080, true]] as const) {
    await page.setViewportSize({ width, height });
    const section = recentCampaigns(page);
    await section.scrollIntoViewIfNeeded();
    await assertNoPageOverflow(page);
    if (tabular) {
      await expect(section.getByRole("table")).toBeVisible();
      await expect(section.getByTestId("recent-campaign-cards")).toBeHidden();
    } else {
      await expect(section.getByRole("table")).toBeHidden();
      const cards = section.getByTestId("recent-campaign-cards");
      await expect(cards.locator("article")).toHaveCount(6);
      await expect(cards.locator("article").first().getByText("Roue de la fortune", { exact: true })).toBeVisible();
      await cards.getByRole("button").first().click();
      await expect(page.getByRole("menuitem", { name: "Modifier", exact: true })).toBeVisible();
      const menu = (await page.getByRole("menu").boundingBox())!;
      expect(menu.x).toBeGreaterThanOrEqual(0);
      expect(menu.x + menu.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
    }
    expect(await section.getByTestId("recent-campaigns-scroll").evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath(`accueil-${width}x${height}.png`), animations: "disabled" });
  }
});

test("@visual-1280 : accueil sans campagne", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/dev/template-rendering-proof?mode=dashboard-responsive-empty");
  const section = recentCampaigns(page);
  await expect(section.getByText("Aucune campagne trouvée", { exact: true })).toBeVisible();
  await expect(section.getByText("0 campagnes", { exact: true })).toBeVisible();
  await expect(section.getByRole("table")).toHaveCount(0);
  await expect(section.getByRole("link", { name: "Voir toutes les campagnes" })).toHaveAttribute("href", "/campaigns");
  await section.scrollIntoViewIfNeeded();
  await captureVisualAt1280(page, info, "accueil-campagnes-vide");
});
