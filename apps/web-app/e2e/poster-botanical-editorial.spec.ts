import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { signIn } from "./auth-session";

test("Botanique éditorial utilise le logo marchand et exporte le même rendu que l’aperçu", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(20_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);

  const backdrop = await page.request.get("/backgrounds/botanical-editorial-poster-backdrop.webp");
  expect(backdrop.ok(), "Le décor botanique éditorial doit être livré par le déploiement").toBe(true);
  expect(backdrop.headers()["content-type"]).toContain("image/webp");

  let campaignId: string | undefined;
  try {
    await page.goto("/campaigns/new/guided");
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill(`E2E — Botanique éditorial ${Date.now()}`);
    await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).last().click();

    const dialog = page.getByRole("dialog", { name: "Votre jeu est enregistré.", exact: true });
    const posterLink = dialog.getByRole("link", { name: "Affiche", exact: true });
    campaignId = (await posterLink.getAttribute("href"))?.match(/campaigns\/([^/]+)/)?.[1];
    expect(campaignId).toBeTruthy();
    await posterLink.click();

    const campaignResponse = await page.request.get(`/api/campaigns/${campaignId}`);
    expect(campaignResponse.ok()).toBe(true);
    const campaignPayload = (await campaignResponse.json()) as {
      campaign?: { campaign?: { presentation?: { poster?: Record<string, unknown> } } };
    };
    const savedPoster = campaignPayload.campaign?.campaign?.presentation?.poster;
    expect(savedPoster).toBeTruthy();
    const update = await page.request.post(`/api/campaigns/${campaignId}/poster-settings`, {
      headers: { origin: new URL(page.url()).origin },
      data: {
        ...savedPoster,
        templateId: "botanical-editorial-poster",
        logoMode: "text",
        logoText: "Établissement E2E",
        headline: "Scannez et jouez",
        headlineFontFamily: "cormorant",
      },
    });
    expect(update.ok()).toBe(true);

    await page.reload();
    await expect(page.getByRole("button", { name: /^Botanique éditorial/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("botanical-editorial-thumbnail-qr")).toBeAttached();
    await expect(page.getByTestId("botanical-editorial-thumbnail-footer")).toBeAttached();
    await expect(page.getByLabel("Police du texte principal")).toHaveValue("cormorant");
    expect(await page.locator('input[type="color"]').count()).toBe(0);
    const headlineSize = page.getByLabel("Taille du texte principal");
    const previewFrame = page.getByTestId("poster-preview-frame");
    await headlineSize.press("Home");
    await expect(previewFrame).toHaveAttribute("data-headline-size", "24");
    await headlineSize.press("End");
    await expect(previewFrame).toHaveAttribute("data-headline-size", "84");
    await page.getByRole("button", { name: /^Botanique éditorial/ }).screenshot({ path: testInfo.outputPath("botanical-editorial-thumbnail.png") });

    const preview = page.getByAltText("Prévisualisation affiche");
    await expect(preview).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("botanical-editorial-preview.png"), fullPage: true });
    const previewBytes = await preview.evaluate(async (img) => {
      const response = await fetch((img as HTMLImageElement).src);
      return Array.from(new Uint8Array(await response.arrayBuffer()));
    });

    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Télécharger le PNG", exact: true }).click();
    const saveBeforeDownload = page.getByRole("dialog", { name: "Enregistrer avant le téléchargement ?", exact: true });
    await expect(saveBeforeDownload).toBeVisible();
    await saveBeforeDownload.getByRole("button", { name: "Enregistrer et télécharger", exact: true }).click();
    const download = await downloadEvent;
    const downloadedFile = testInfo.outputPath("botanical-editorial.png");
    await download.saveAs(downloadedFile);
    expect(Buffer.from(previewBytes).equals(await readFile(downloadedFile))).toBe(true);
  } finally {
    if (campaignId) {
      const cleanup = await page.request.delete(`/api/campaigns/${campaignId}`, {
        headers: { origin: new URL(page.url()).origin },
      });
      expect(cleanup.ok(), "Nettoyage du jeu E2E").toBeTruthy();
    }
  }
});
