import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { signIn } from "./auth-session";
import { getPosterLogoTextFontSizePx, getPosterLogoTopY, getPosterTemplate } from "../src/lib/poster-templates";
import { buildClassicPosterThumbnailSvg } from "../src/lib/poster-render";
import { createPosterSettingsDefaults, normalizePosterSettings } from "../src/lib/poster-utils";

test("les affiches utilisent Gradient clair et activent le texte secondaire par défaut", () => {
  const gradientTemplate = getPosterTemplate("classic-wheel");
  const defaults = createPosterSettingsDefaults({ wheel: gradientTemplate.wheel });
  const normalizedLegacyPoster = normalizePosterSettings(
    { templateId: "classic-wheel", backgroundMotif: "terracotta", backgroundMode: "color", backgroundColor: "#ddc9b8" },
    defaults,
  );

  expect(gradientTemplate.id).toBe("soft-gradient-wheel");
  expect(getPosterTemplate("classic-wheel", "terracotta").id).toBe("soft-gradient-wheel");
  expect(getPosterTemplate("classic-wheel", "plain").id).toBe("soft-gradient-wheel");
  expect(normalizedLegacyPoster.backgroundMotif).toBe("soft-gradient");
  expect(normalizedLegacyPoster.backgroundColor).toBe(gradientTemplate.background);
  expect(normalizedLegacyPoster.posterSubtitleEnabled).toBe(true);
  expect(normalizePosterSettings(
    { templateId: "classic-wheel", backgroundMotif: "plain", posterSubtitleEnabled: false },
    defaults,
  ).posterSubtitleEnabled).toBe(false);
});

test("Gradient clair est la première variante de Classique et garde le même aperçu que le PNG", async ({ page }, testInfo) => {
  const gradientTemplate = getPosterTemplate("classic-wheel", "soft-gradient");
  expect(gradientTemplate.wheelRadius).toBe(247);
  expect(gradientTemplate.qrSize).toBe(277.4);
  expect(getPosterLogoTopY("text")).toBe(24);
  expect(getPosterLogoTopY("image")).toBe(32);
  expect(getPosterLogoTextFontSizePx(170)).toBe(28.9);
  expect("logoY" in gradientTemplate || "logoTextY" in gradientTemplate).toBe(false);
  expect(gradientTemplate.ctaWidth).toBe(390);
  expect(getPosterTemplate("classic-wheel").id).toBe("soft-gradient-wheel");
  expect(getPosterTemplate("classic-wheel", "terracotta").id).toBe("soft-gradient-wheel");
  expect(getPosterTemplate("classic-wheel", "plain").id).toBe("soft-gradient-wheel");
  const classicScratchThumbnail = buildClassicPosterThumbnailSvg("scratch", "soft-gradient");
  expect(classicScratchThumbnail).toContain("GRATTEZ ICI");
  expect(classicScratchThumbnail).toContain('data-poster-footer="editorial-steps"');
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
    await expect(page.getByRole("group", { name: "Motif du fond" })).toHaveCount(0);
    const thumbnail = page.getByTestId("classic-poster-thumbnail");
    await expect(thumbnail).toBeVisible();
    await expect.poll(() => thumbnail.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(794);
    const thumbnailSvg = await thumbnail.evaluate((image) => {
      const source = (image as HTMLImageElement).src;
      return decodeURIComponent(source.slice(source.indexOf(",") + 1));
    });
    expect(thumbnailSvg).toContain("Votre établissement");
    expect(thumbnailSvg).toContain("Des cadeaux à gagner dans votre</text><text");
    expect(thumbnailSvg).toContain(">établissement.</text>");
    expect(thumbnailSvg).toContain("Scannez pour jouer");
    expect(thumbnailSvg).toContain('data-poster-footer="editorial-steps"');
    expect(thumbnailSvg).not.toContain('translate(28 954)');
    expect(thumbnailSvg).toContain(">2. JOUEZ</text>");
    expect(thumbnailSvg).not.toContain("E2E — Gradient clair");
    await page.getByRole("button", { name: /^Élégance/ }).click();
    await page.getByRole("button", { name: /^Classique/ }).click();
    await expect(page.getByRole("button", { name: /^Classique/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("group", { name: "Motif du fond" })).toHaveCount(0);

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
    await expect(page.getByRole("group", { name: "Motif du fond" })).toHaveCount(0);
    await page.getByRole("button", { name: /^Classique/ }).click();
    await expect(page.getByRole("button", { name: /^Classique/ })).toHaveAttribute("aria-pressed", "true");
    const saveResponsePromise = page.waitForResponse((response) =>
      response.url().includes(`/api/campaigns/${campaignId}/poster-settings`) && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.ok()).toBe(true);
    const normalizedCampaignResponse = await page.request.get(`/api/campaigns/${campaignId}`);
    expect(normalizedCampaignResponse.ok()).toBe(true);
    const normalizedCampaignPayload = (await normalizedCampaignResponse.json()) as {
      campaign?: { campaign?: { presentation?: { poster?: Record<string, unknown> } } };
    };
    expect(normalizedCampaignPayload.campaign?.campaign?.presentation?.poster?.backgroundMotif).toBe("soft-gradient");

    await thumbnail.screenshot({ path: testInfo.outputPath("gradient-clair-thumbnail.png") });
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
