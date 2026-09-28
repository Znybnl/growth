import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { signIn } from "./auth-session";
import { getPosterTemplate } from "../src/lib/poster-templates";

test("Gradient clair est la première variante de Classique et garde le même aperçu que le PNG", async ({ page }, testInfo) => {
  const gradientTemplate = getPosterTemplate("classic-wheel", "soft-gradient");
  expect(gradientTemplate.wheelRadius).toBe(247);
  expect(gradientTemplate.qrSize).toBe(277.4);
  expect(gradientTemplate.logoY).toBe(26);
  expect(gradientTemplate.logoTextY).toBe(-24);
  expect(gradientTemplate.ctaWidth).toBe(390);
  expect(getPosterTemplate("classic-wheel", "terracotta").id).toBe("terracotta-wheel");
  expect(getPosterTemplate("classic-wheel", "plain").id).toBe("classic-wheel");
  test.setTimeout(180_000);
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(20_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);

  let campaignId: string | undefined;
  try {
    await page.goto("/campaigns/new/guided");
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill(`E2E — Gradient clair ${Date.now()}`);
    await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).last().click();

    const dialog = page.getByRole("dialog", { name: "Votre jeu est enregistré.", exact: true });
    const posterHref = await dialog.getByRole("link", { name: "Affiche", exact: true }).getAttribute("href");
    campaignId = posterHref?.match(/campaigns\/([^/]+)/)?.[1];
    expect(campaignId).toBeTruthy();
    await dialog.getByRole("link", { name: "Affiche", exact: true }).click();

    const picker = page.locator("section.okado-card").filter({ hasText: "Choisir le design de l'affiche" });
    const choices = picker.locator('button[aria-pressed]:not([aria-label])');
    await expect(choices.getByText("Gradient clair", { exact: true })).toHaveCount(0);
    await expect(choices.getByText("Terracotta", { exact: true })).toHaveCount(0);
    await expect(choices.last()).toContainText("Classique");
    const motifs = page.getByRole("group", { name: "Motif du fond" });
    await expect(motifs.getByRole("button", { name: "Terracotta" })).toHaveCount(0);
    await expect(motifs.getByRole("button", { name: "Clair uni" })).toHaveCount(0);
    const gradientMotif = motifs.getByRole("button", { name: "Gradient clair" });
    await expect(gradientMotif).toHaveAttribute("aria-pressed", "true");
    await expect(motifs.getByRole("button").first()).toHaveAccessibleName("Gradient clair");
    await expect(page.getByTestId("gradient-clair-thumbnail")).toBeVisible();
    await expect(page.getByTestId("gradient-clair-thumbnail-wheel")).toHaveAttribute("data-wheel-radius", "242.25");
    await expect(page.getByTestId("gradient-clair-thumbnail-qr")).toBeAttached();
    await expect(page.getByTestId("gradient-clair-thumbnail-qr-image")).toHaveAttribute("width", "222.3");
    await expect(page.getByTestId("gradient-clair-thumbnail-cta")).toHaveText("Scannez pour jouer");
    await page.getByRole("button", { name: /^Élégance/ }).click();
    await page.getByRole("button", { name: /^Classique/ }).click();
    await expect(page.getByRole("button", { name: /^Classique/ })).toHaveAttribute("aria-pressed", "true");
    await expect(gradientMotif).toHaveAttribute("aria-pressed", "true");

    const preview = page.getByAltText("Prévisualisation affiche");
    const downloadButton = page.getByRole("button", { name: "Télécharger le PNG", exact: true });
    await expect(downloadButton).toBeEnabled({ timeout: 30_000 });
    await preview.screenshot({ path: testInfo.outputPath("gradient-clair-preview.png") });
    const previewBytes = await preview.evaluate(async (img) => {
      const response = await fetch((img as HTMLImageElement).src);
      return Array.from(new Uint8Array(await response.arrayBuffer()));
    });
    const downloadEvent = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadEvent;
    const target = testInfo.outputPath("gradient-clair-downloaded.png");
    await download.saveAs(target);
    expect(Buffer.from(previewBytes).equals(await readFile(target))).toBe(true);

    const campaignResponse = await page.request.get(`/api/campaigns/${campaignId}`);
    expect(campaignResponse.ok()).toBe(true);
    const campaignPayload = (await campaignResponse.json()) as {
      campaign?: { campaign?: { presentation?: { poster?: Record<string, unknown> } } };
    };
    const savedPoster = campaignPayload.campaign?.campaign?.presentation?.poster;
    expect(savedPoster).toBeTruthy();
    const legacyResponse = await page.request.post(`/api/campaigns/${campaignId}/poster-settings`, {
      headers: { origin: new URL(page.url()).origin },
      data: { ...savedPoster, templateId: "classic-wheel", backgroundMotif: "soft-gradient" },
    });
    expect(legacyResponse.ok()).toBe(true);
    await page.reload();
    await expect(gradientMotif).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^Classique/ }).click();
    await expect(page.getByRole("button", { name: /^Classique/ })).toHaveAttribute("aria-pressed", "true");
    await expect(gradientMotif).toHaveAttribute("aria-pressed", "true");

    await gradientMotif.screenshot({ path: testInfo.outputPath("gradient-clair-thumbnail.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await preview.scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally {
    if (campaignId) {
      const cleanup = await page.request.delete(`/api/campaigns/${campaignId}`, {
        headers: { origin: new URL(page.url()).origin },
      });
      expect(cleanup.ok(), "Nettoyage du jeu E2E").toBeTruthy();
    }
  }
});
