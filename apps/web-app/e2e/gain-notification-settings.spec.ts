import { expect, test } from "@playwright/test";

test("routes réelles : visiteur refusé et cron protégé, aucun accès aux données", async ({ request, baseURL }) => {
  expect((await request.get("/api/merchant/gain-notifications?location=site-a")).status()).toBe(401);
  expect((await request.post("/api/merchant/gain-notifications", {
    headers: { Origin: new URL(baseURL!).origin }, data: { location: "site-a", frequencies: ["daily"] },
  })).status()).toBe(401);
  expect((await request.get("/api/internal/gain-notifications")).status()).toBe(401);
  expect((await request.get("/api/internal/gain-notifications/recovery")).status()).toBe(401);
  expect((await request.get("/api/internal/maintenance")).status()).toBe(401);
  const results = await request.get("/api/merchant/gain-notifications/results?location=site-a", { maxRedirects: 0 });
  expect(results.status()).toBe(307); expect(results.headers().location).toContain("/connexion");
  const account = await request.get("/api/merchant/gain-notifications/account?location=site-a", { maxRedirects: 0 });
  expect(account.status()).toBe(307); expect(account.headers().location).toContain("/connexion");
});

for (const width of [320, 390, 1280]) {
  test(`réglage personnel, défaut désactivé, choix multiples et isolation des sites à ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = []; const writes: unknown[] = [];
    const saved: Record<string, string[]> = {};
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/merchant/gain-notifications*", async route => {
      if (route.request().method() === "POST") {
        const data = route.request().postDataJSON(); writes.push(data); saved[data.location] = data.frequencies;
        await route.fulfill({ json: { frequencies: data.frequencies, updatedAt: "2026-10-06T10:00Z" } });
      } else {
        const site = new URL(route.request().url()).searchParams.get("location")!;
        await route.fulfill({ json: { frequencies: saved[site] ?? [], updatedAt: null } });
      }
    });
    await page.goto("/dev/gain-notification-proof");
    const daily = page.getByLabel("Synthèse quotidienne");
    const weekly = page.getByLabel("Synthèse hebdomadaire");
    const instant = page.getByLabel("À chaque gain");
    const button = page.getByRole("button", { name: "Enregistrer les notifications" });
    await expect(daily).toBeEnabled(); await expect(daily).not.toBeChecked(); await expect(button).toBeDisabled();
    await expect(page.getByLabel("Synthèse mensuelle")).toBeVisible();
    await daily.check(); await weekly.check(); await instant.check(); await button.click();
    await expect(page.getByRole("status")).toContainText("enregistrées");
    await expect(button).toBeDisabled();
    await page.screenshot({ path: testInfo.outputPath(`notifications-${width}.png`), fullPage: true });
    await page.getByLabel("Établissement de test").selectOption("site-b");
    await expect(daily).toBeEnabled(); await expect(daily).not.toBeChecked();
    await expect(weekly).not.toBeChecked(); await expect(instant).not.toBeChecked();
    await page.getByLabel("Établissement de test").selectOption("site-a");
    await expect(daily).toBeEnabled(); await expect(daily).toBeChecked();
    await expect(weekly).toBeChecked(); await expect(instant).toBeChecked();
    await daily.uncheck(); await weekly.uncheck(); await instant.uncheck(); await button.click();
    await expect(page.getByRole("status")).toContainText("enregistrées");
    await page.reload(); await expect(daily).toBeEnabled(); await expect(daily).not.toBeChecked();
    expect(writes).toEqual([
      { location: "site-a", frequencies: ["instant", "daily", "weekly"] },
      { location: "site-a", frequencies: [] },
    ]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
    await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
  });
}
test("erreurs de chargement et de sauvegarde : aucun succès trompeur", async ({ page }) => {
  let failLoad = true;
  await page.route("**/api/merchant/gain-notifications*", route => route.fulfill({
    status: failLoad || route.request().method() === "POST" ? 503 : 200,
    json: { frequencies: [], updatedAt: null },
  }));
  await page.goto("/dev/gain-notification-proof");
  await expect(page.locator("main").getByRole("alert")).toContainText("Chargement impossible");
  await expect(page.getByLabel("Synthèse quotidienne")).toBeDisabled();
  failLoad = false; await page.reload();
  await page.getByLabel("Synthèse hebdomadaire").check();
  await page.getByRole("button", { name: "Enregistrer les notifications" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Enregistrement impossible");
  await expect(page.getByRole("button", { name: "Enregistrer les notifications" })).toBeEnabled();
  await expect(page.getByText("Vos préférences de notification sont enregistrées.")).toHaveCount(0);
});
