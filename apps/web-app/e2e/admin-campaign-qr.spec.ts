import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

for (const width of [320, 390, 1280]) {
  test(`téléchargement QR admin et confirmation à ${width}px sans donnée réelle`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // UI-only synthetic response; the real generator/handler is tested separately.
    await page.route("**/api/admin/campaigns/admin-qr-fixture/qr", (route) => route.fulfill({
      contentType: "image/svg+xml",
      headers: { "Content-Disposition": 'attachment; filename="admin-qr-fixture-qr.svg"' },
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"></svg>',
    }));
    await page.goto("/dev/admin-qr-proof");
    const link = page.getByRole("link", { name: /Télécharger le QR de diffusion/ });
    await expect(link).toHaveAttribute("href", "/api/admin/campaigns/admin-qr-fixture/qr");
    await expect(page.getByText("Le QR de diffusion n’ouvre le jeu qu’après sa publication.")).toBeVisible();
    const downloaded = page.waitForEvent("download");
    await link.click();
    const file = await downloaded;
    expect(file.suggestedFilename()).toBe("admin-qr-fixture-qr.svg");
    const path = await file.path();
    expect(path).not.toBeNull();
    expect(await readFile(path!, "utf8")).toContain("<svg");
    await page.getByRole("button", { name: "Confirmation d’enregistrement" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("link", { name: /Télécharger le QR code de diffusion/ })).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Télécharger le QR code de diffusion/ })).toHaveAttribute("href", "/api/admin/campaigns/admin-qr-fixture/qr");
    await expect(dialog.getByText("Le brouillon est prêt pour Commerce de test.")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`admin-qr-${width}.png`), fullPage: true });
    await dialog.getByRole("button", { name: "Fermer la confirmation d’enregistrement" }).click();
    await page.getByRole("checkbox", { name: "Jeu publié" }).check();
    await expect(page.getByText("Le QR de diffusion n’ouvre le jeu qu’après sa publication.")).toHaveCount(0);
    await expect(link).not.toHaveAccessibleName(/brouillon/);
    expect(errors).toEqual([]);
  });
}

test("un refus serveur affiche une erreur, jamais un fichier JSON de QR code", async ({ page }) => {
  let downloads = 0;
  page.on("download", () => downloads++);
  await page.route("**/api/admin/campaigns/admin-qr-fixture/qr", (route) => route.fulfill({ status: 403, json: { error: "Accès refusé." } }));
  await page.goto("/dev/admin-qr-proof");
  await page.getByRole("link", { name: /Télécharger le QR de diffusion/ }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Le QR code n’a pas pu être téléchargé");
  expect(downloads).toBe(0);
});
