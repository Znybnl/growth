import { expect, test } from "@playwright/test";

test("route réelle : visiteur et origine étrangère refusés sans accès aux données", async ({ request, baseURL }) => {
  const url = "/api/admin/support/email-incidents/11111111-1111-4111-8111-111111111111/handle";
  expect((await request.post(url, { headers: { Origin: new URL(baseURL!).origin }, data: { eventAt: null, status: "failed" } })).status()).toBe(401);
  expect((await request.post(url, { headers: { Origin: "https://evil.test" }, data: {} })).status()).toBe(403);
});

for (const width of [320, 390, 1280]) {
  test(`clôture : chargement, refus, reprise et succès sans renvoi à ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 850 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    let attempts = 0;
    await page.route("**/api/admin/support/email-incidents/*/handle", async route => {
      attempts += 1;
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toEqual({ eventAt: "2026-06-30T09:05:00.123456+00:00", status: "failed" });
      await new Promise(resolve => setTimeout(resolve, 300));
      await route.fulfill({ status: attempts === 1 ? 409 : 200, json: attempts === 1
        ? { error: "Cet incident a changé. Rechargez la page." } : { handled: true } });
    });
    await page.goto("/dev/support-email-incidents");
    await page.getByRole("button", { name: "Marquer comme traité" }).click();
    await expect(page.getByRole("button", { name: "Traitement…" })).toBeDisabled();
    await expect(page.locator("article").getByRole("alert")).toContainText("Cet incident a changé");
    await expect(page.getByRole("status")).toHaveCount(0);
    await page.getByRole("button", { name: "Marquer comme traité" }).click();
    await expect(page.getByRole("status")).toContainText("sans renvoi");
    await expect(page.getByRole("button", { name: "Incident traité" })).toBeDisabled();
    expect(attempts).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`incident-${width}.png`), fullPage: true });
  });
}
