import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { signIn } from "./auth-session";

test("le template Éditorial pastel affiche son QR, son logo et exporte le même visuel que l’aperçu", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(20_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);

  let campaignId: string | undefined;
  try {
    await page.goto("/campaigns/new/guided");
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill(`E2E — Éditorial pastel ${Date.now()}`);
    await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).last().click();

    const dialog = page.getByRole("dialog", { name: "Votre jeu est enregistré.", exact: true });
    const posterLink = dialog.getByRole("link", { name: "Affiche", exact: true });
    const href = await posterLink.getAttribute("href");
    campaignId = href?.match(/campaigns\/([^/]+)/)?.[1];
    expect(campaignId).toBeTruthy();
    await posterLink.click();

    await page.getByRole("button", { name: /^Éditorial pastel/ }).click();
    await expect(page.getByRole("button", { name: /^Éditorial pastel/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('input[type="color"]')).toHaveCount(0);
    await expect(page.getByLabel("Police du texte principal")).toHaveValue("cormorant");
    await expect(page.getByTestId("editorial-poster-thumbnail")).toBeAttached();
    await expect(page.getByTestId("editorial-thumbnail-qr")).toBeAttached();
    await expect(page.getByTestId("editorial-step-wheel-icon")).toBeAttached();

    const preview = page.getByAltText("Prévisualisation affiche");
    await expect(preview).toBeVisible();
    await preview.screenshot({ path: testInfo.outputPath("editorial-poster-preview.png") });
    const previewBytes = await preview.evaluate(async (img) => {
      const response = await fetch((img as HTMLImageElement).src);
      return Array.from(new Uint8Array(await response.arrayBuffer()));
    });

    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Télécharger le PNG", exact: true }).click();
    const download = await downloadEvent;
    const downloadedPng = testInfo.outputPath("editorial-poster-download.png");
    await download.saveAs(downloadedPng);
    expect(Buffer.from(previewBytes).equals(await readFile(downloadedPng))).toBe(true);
    expect(await readFile(downloadedPng)).not.toEqual(Buffer.from(""));
  } finally {
    if (campaignId) {
      const cleanup = await page.request.delete(`/api/campaigns/${campaignId}`, {
        headers: { origin: new URL(page.url()).origin },
      });
      expect(cleanup.ok(), "Nettoyage du jeu E2E").toBeTruthy();
    }
  }
});
