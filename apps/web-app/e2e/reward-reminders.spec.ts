import { expect, test } from "@playwright/test";
for (const width of [320, 390, 1280]) {
  test(`Relance de compte : défaut, persistance, sites, erreurs et lecture seule à ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    let value = { enabled: false, days: 7, canEdit: true, updatedAt: null as string | null };
    let reads = 0, writes = 0, fail = false;
    await page.route("**/api/merchant/reward-reminders", async route => {
      if (route.request().method() === "POST") {
        writes++; if (fail) return route.fulfill({ status: 503, json: { error: "Indisponible" } });
        value = { ...value, ...route.request().postDataJSON(), updatedAt: "2026-10-12T07:00Z" };
      } else reads++;
      await route.fulfill({ json: value });
    });
    await page.goto("/dev/reward-reminder-proof");
    const checkbox = page.getByRole("checkbox");
    const days = page.getByLabel("Nombre de jours avant l’expiration");
    const save = page.getByRole("button", { name: "Enregistrer la relance" });
    await expect(checkbox).toBeEnabled(); await expect(checkbox).not.toBeChecked(); await expect(days).toHaveValue("7");
    await expect(page.getByText(/passage quotidien le matin à heure indicative/)).toBeVisible();
    await expect(save).toBeDisabled();
    await checkbox.check(); await days.fill("3"); await save.click();
    await expect(page.getByRole("status").filter({ hasText: "réglage commun" })).toBeVisible(); expect(writes).toBe(1);
    const readsBeforeSiteChange = reads; // Strict Mode may restart the initial, aborted GET.
    await page.getByRole("button", { name: "Établissement 2" }).click();
    await expect(checkbox).toBeChecked(); await expect(days).toHaveValue("3"); expect(reads).toBe(readsBeforeSiteChange);
    await page.reload(); await expect(checkbox).toBeChecked(); await expect(days).toHaveValue("3");
    await days.fill("0"); await expect(save).toBeDisabled(); await expect(page.getByRole("alert").filter({ hasText: "entier" })).toBeVisible();
    expect(await days.evaluate(element => (element as HTMLInputElement).form)).toBeNull();
    await page.getByRole("button", { name: "Enregistrer les autres informations" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Autres informations" })).toBeVisible();
    await days.fill("4"); fail = true; await save.click(); await expect(page.getByRole("alert").filter({ hasText: "Enregistrement impossible" })).toBeVisible();
    expect(value.days).toBe(3); fail = false; await checkbox.uncheck(); await save.click();
    await expect(page.getByRole("status").filter({ hasText: "réglage commun" })).toBeVisible(); expect(value.enabled).toBe(false);
    value = { enabled: false, days: 7, canEdit: false, updatedAt: null };
    await page.getByRole("button", { name: "Autre compte" }).click(); await expect(checkbox).toBeDisabled(); await expect(days).toHaveValue("7");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: info.outputPath("relance-settings.png"), fullPage: true });
    expect(errors).toEqual([]);
  });
}
test("Relance : route réelle sans session refusée", async ({ request }) => {
  const res = await request.get("/api/merchant/reward-reminders"); expect(res.status()).toBe(401);
});
