import { expect, test } from "@playwright/test";

for (const width of [320, 390, 1280]) {
  test(`Supervision : quatre tableaux superposés, lisibles et action conservée à ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    let mutations = 0;
    await page.route("**/api/admin/support/email-incidents/*/handle", async route => {
      mutations += 1;
      expect(route.request().postDataJSON()).toEqual({ eventAt: "2026-06-30T09:05:00.123456+00:00", status: "failed" });
      await route.fulfill({ status: 200, json: { handled: true } });
    });
    await page.goto("/dev/support-tables");
    await expect(page.getByRole("table")).toHaveCount(4);
    let previousBottom = 0;
    for (const title of ["E-mails", "Webhooks", "Gains", "Journal"]) {
      const region = page.getByRole("region", { name: `Tableau ${title}`, exact: true });
      await expect(region.getByRole("columnheader").first()).toBeVisible();
      const box = await region.boundingBox();
      const top = box!.y + await page.evaluate(() => window.scrollY);
      expect(top).toBeGreaterThan(previousBottom);
      expect(box!.width).toBeLessThanOrEqual(width);
      previousBottom = top + box!.height;
      if (width < 980) {
        await region.focus();
        await page.keyboard.press("ArrowRight");
        await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    const emailRegion = page.getByRole("region", { name: "Tableau E-mails", exact: true });
    await page.getByText("Voir l’erreur complète", { exact: true }).click();
    await expect(emailRegion.locator("details")).toHaveAttribute("open", "");
    await expect(emailRegion.locator("details p")).toContainText("UnMessageSansEspace");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.getByText("Voir l’erreur complète", { exact: true }).click();
    await emailRegion.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    await page.getByRole("button", { name: "Marquer comme traité" }).click();
    await expect(page.getByRole("button", { name: "Incident traité" })).toBeDisabled();
    expect(mutations).toBe(1);
    expect(errors).toEqual([]);
    await page.getByRole("region").evaluateAll(elements => elements.forEach(el => { el.scrollLeft = 0; }));
    await page.screenshot({ path: testInfo.outputPath(`supervision-${width}.png`), fullPage: true });
    await page.goto("/dev/support-tables?handled=1");
    await expect(page.getByRole("cell").filter({ hasText: "Traité le" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Marquer comme traité" })).toHaveCount(0);
    await page.goto("/dev/support-tables?empty=1");
    await expect(page.getByRole("table")).toHaveCount(4);
    for (const text of ["Aucun e-mail en échec", "Aucun webhook archivé", "Aucun gain en attente", "Aucun log métier récent"]) {
      await expect(page.getByRole("cell").filter({ hasText: text })).toBeVisible();
    }
  });
}
