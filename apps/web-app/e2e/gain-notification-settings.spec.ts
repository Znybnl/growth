import { expect, test } from "@playwright/test";

test("routes réelles : visiteur refusé et cron protégé, aucun accès aux données", async ({ request, baseURL }) => {
  expect((await request.get("/api/merchant/gain-notifications?location=site-a")).status()).toBe(401);
  expect((await request.post("/api/merchant/gain-notifications", {
    headers: { Origin: new URL(baseURL!).origin }, data: { location: "site-a", frequency: "daily" },
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
  test(`réglage personnel, défaut désactivé, sauvegarde et isolation des sites à ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = []; const writes: unknown[] = [];
    const saved: Record<string, string> = {};
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/merchant/gain-notifications*", async route => {
      if (route.request().method() === "POST") {
        const data = route.request().postDataJSON(); writes.push(data); saved[data.location] = data.frequency;
        await route.fulfill({ json: { frequency: data.frequency, updatedAt: "2026-10-06T10:00Z" } });
      } else {
        const site = new URL(route.request().url()).searchParams.get("location")!;
        await route.fulfill({ json: { frequency: saved[site] ?? "disabled", updatedAt: null } });
      }
    });
    await page.goto("/dev/gain-notification-proof");
    const select = page.getByLabel("Fréquence des notifications");
    const button = page.getByRole("button", { name: "Enregistrer la fréquence" });
    await expect(select).toBeEnabled(); await expect(select).toHaveValue("disabled"); await expect(button).toBeDisabled();
    await expect(select.getByRole("option")).toHaveCount(5);
    await select.selectOption("daily"); await button.click();
    await expect(page.getByRole("status")).toContainText("enregistrées");
    await expect(button).toBeDisabled();
    await page.screenshot({ path: testInfo.outputPath(`notifications-${width}.png`), fullPage: true });
    await page.getByLabel("Établissement de test").selectOption("site-b");
    await expect(select).toBeEnabled(); await expect(select).toHaveValue("disabled");
    await page.getByLabel("Établissement de test").selectOption("site-a");
    await expect(select).toBeEnabled(); await expect(select).toHaveValue("daily");
    await select.selectOption("disabled"); await button.click();
    await expect(page.getByRole("status")).toContainText("enregistrées");
    await page.reload(); await expect(select).toBeEnabled(); await expect(select).toHaveValue("disabled");
    expect(writes).toEqual([{ location: "site-a", frequency: "daily" }, { location: "site-a", frequency: "disabled" }]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
    await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
  });
}
test("erreurs de chargement et de sauvegarde : aucun succès trompeur", async ({ page }) => {
  let failLoad = true;
  await page.route("**/api/merchant/gain-notifications*", route => route.fulfill({
    status: failLoad || route.request().method() === "POST" ? 503 : 200,
    json: { frequency: "disabled", updatedAt: null },
  }));
  await page.goto("/dev/gain-notification-proof");
  await expect(page.locator("main").getByRole("alert")).toContainText("Chargement impossible");
  await expect(page.getByLabel("Fréquence des notifications")).toBeDisabled();
  failLoad = false; await page.reload();
  await page.getByLabel("Fréquence des notifications").selectOption("weekly");
  await page.getByRole("button", { name: "Enregistrer la fréquence" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Enregistrement impossible");
  await expect(page.getByRole("button", { name: "Enregistrer la fréquence" })).toBeEnabled();
  await expect(page.getByText("Vos préférences de notification sont enregistrées.")).toHaveCount(0);
});
