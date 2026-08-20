import { expect, test } from "@playwright/test";

test.describe("Parcours publics sûrs", () => {
  test("un QR code de prévisualisation invalide affiche une explication", async ({ page }) => {
    await page.goto("/campaign/e2e-preview-invalide?preview=1&previewToken=invalide");

    await expect(page.getByText("Prévisualisation indisponible")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ce QR code n'est plus valide" })).toBeVisible();
    await expect(page.getByText("Générez un nouveau QR code depuis votre espace marchand")).toBeVisible();
  });

  test("un code de retrait introuvable ne révèle aucune donnée", async ({ page }) => {
    await page.goto("/redeem/E2E-CODE-INEXISTANT");

    await expect(page.getByRole("heading", { name: "QR code introuvable" })).toBeVisible();
    await expect(page.getByText("Ce code ne correspond à aucun gain disponible.")).toBeVisible();
  });

  test("le QR de retrait est généré sans exposer le gain", async ({ request }) => {
    const response = await request.get("/api/public/redeem/E2E-CODE-TEST/qr");

    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/svg+xml");
    await expect(response.text()).resolves.toContain("<svg");
  });
});
