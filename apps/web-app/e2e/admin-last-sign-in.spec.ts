import { expect, test } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test.beforeEach(async ({ context, page, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route("**/api/**", route => route.fulfill({ status: 200, json: {} }));
});

for (const size of [{ width: 1280, height: 720 }, { width: 1280, height: 600 }, { width: 390, height: 844 }]) {
  test(`Pilotage three states, timezone and actions ${size.width}x${size.height} @visual-1280`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport: size, timezoneId: "Europe/Paris" });
    await rejectAnalyticsForVisualTests(context, info.project.use.baseURL as string);
    const page = await context.newPage();
    await page.route("**/api/**", route => route.fulfill({ status: 200, json: {} }));
    await page.goto("/dev/admin-last-sign-in");
    const accounts = page.locator(".okado-metric-card").filter({ has: page.getByText("Comptes", { exact: true }) });
    const establishments = page.locator(".okado-metric-card").filter({ has: page.getByText("Établissements", { exact: true }) });
    await expect(accounts.locator(".okado-metric-card__value")).toHaveText("1");
    await expect(establishments.locator(".okado-metric-card__value")).toHaveText("3");
    await expect(establishments).toContainText("2 onboarding terminés · 2 avec accès actif");
    if (size.width === 1280) await captureVisualAt1280(page, info, "pilotage-account-establishment-kpis", size.height);
    else await page.screenshot({ path: info.outputPath("pilotage-kpis-mobile.png") });
    const table = page.locator(".okado-admin-table");
    await expect(table.getByText("Jamais connecté", { exact: true })).toBeVisible();
    await expect(table.getByText("Indisponible", { exact: true })).toBeVisible();
    const time = table.locator("time");
    await expect(time).toHaveAttribute("datetime", "2026-10-24T23:30:00.000Z");
    await expect(time).toContainText("25 oct. 2026");
    await expect(time).toContainText("01:30");
    await expect(time).toHaveAttribute("title", "Fuseau horaire : Europe/Paris");
    await expect(table.getByRole("link", { name: "Voir les jeux", exact: true })).toHaveCount(3);
    await table.scrollIntoViewIfNeeded();
    const clipped = await table.evaluate(el => el.scrollWidth > el.clientWidth + 1);
    expect(clipped, "All columns fit without hiding the actions").toBe(false);
    await assertNoPageOverflow(page);
    if (size.width === 1280) {
      await captureVisualAt1280(page, info, "pilotage", size.height);
      await table.screenshot({ path: info.outputPath("pilotage-table.png") });
    } else {
      const label = await table.locator("tbody tr").first().locator("td").nth(3)
        .evaluate(el => getComputedStyle(el, "::before").content);
      expect(label).toBe('"Dernière connexion"');
      await table.locator("tbody tr").first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath("pilotage-mobile.png") });
    }
    await context.close();
  });
}

test("date follows UTC browser timezone rather than server timezone", async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: "UTC" });
  const page = await context.newPage();
  await page.route("**/api/**", route => route.fulfill({ status: 200, json: {} }));
  await page.goto("/dev/admin-last-sign-in");
  await expect(page.locator(".okado-admin-table time")).toContainText("24 oct. 2026");
  await expect(page.locator(".okado-admin-table time")).toContainText("23:30");
  await context.close();
});
