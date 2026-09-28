import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { signIn } from "./auth-session";
import { getPosterLogoTopY, POSTER_TEMPLATES, getPosterTemplate } from "../src/lib/poster-templates";

test("tous les templates d'affiche utilisent le même alignement vertical des logos", () => {
  const botanicalTemplate = getPosterTemplate("botanical-editorial-poster");
  expect(botanicalTemplate.logoX).toBe(botanicalTemplate.headlineX);
  expect(botanicalTemplate.medallionFill).toBe("#D3DCC5");
  expect(POSTER_TEMPLATES.every((template) => !("logoY" in template) && !("logoTextY" in template))).toBe(true);
  expect(getPosterLogoTopY("text")).toBe(30);
  expect(getPosterLogoTopY("image")).toBe(36);
});

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
        posterSubtitleEnabled: true,
      },
    });
    expect(update.ok()).toBe(true);

    await page.reload();
    await expect(page.getByRole("button", { name: /^Botanique éditorial/ })).toHaveAttribute("aria-pressed", "true");
    const thumbnailBackdrop = page.getByTestId("botanical-editorial-thumbnail-backdrop");
    await expect(thumbnailBackdrop).toHaveAttribute("href", "/backgrounds/botanical-editorial-poster-backdrop.webp");
    await expect(thumbnailBackdrop).toBeAttached();
    await expect(page.getByTestId("botanical-editorial-thumbnail-medallion")).toHaveAttribute("fill", "#D3DCC5");
    await expect(page.getByTestId("botanical-editorial-thumbnail-supporting-text")).toBeAttached();
    await expect(page.getByTestId("botanical-editorial-thumbnail-leaf")).toHaveCount(0);
    await expect(page.getByTestId("botanical-editorial-thumbnail-gift")).toBeAttached();
    await expect(page.getByTestId("botanical-editorial-thumbnail-arrow-one")).toHaveAttribute("marker-end", "url(#thumbnailArrow)");
    await expect(page.getByTestId("botanical-editorial-thumbnail-arrow-two")).toHaveAttribute("marker-end", "url(#thumbnailArrow)");
    await expect(page.getByTestId("botanical-editorial-thumbnail-qr")).toBeAttached();
    await expect(page.getByTestId("botanical-editorial-thumbnail-footer")).toBeAttached();
    await expect(page.getByLabel("Police du texte principal")).toHaveValue("cormorant");
    await page.locator('input[type="checkbox"]').check();
    await page.locator('textarea[aria-describedby="poster-secondary-text-help"]').fill("Tentez de gagner un beau cadeau !");
    expect(await page.locator('input[type="color"]').count()).toBe(0);
    const headlineSize = page.getByLabel("Taille du texte principal");
    const previewFrame = page.getByTestId("poster-preview-frame");
    await headlineSize.press("Home");
    await expect(previewFrame).toHaveAttribute("data-headline-size", "24");
    await headlineSize.press("End");
    await expect(headlineSize).toHaveValue("84");
    const renderedHeadlineSize = Number(await previewFrame.getAttribute("data-headline-size"));
    expect(renderedHeadlineSize).toBeGreaterThan(24);
    expect(renderedHeadlineSize).toBeLessThanOrEqual(84);
    await page.getByRole("button", { name: /^Botanique éditorial/ }).screenshot({ path: testInfo.outputPath("botanical-editorial-thumbnail.png") });

    const preview = page.getByAltText("Prévisualisation affiche");
    await expect(preview).toBeVisible({ timeout: 30_000 });
    const layout = await page.getByTestId("poster-preview-frame").evaluate((frame) => ({
      headlineX: Number(frame.getAttribute("data-headline-x")),
      headlineLastBaseline: Number(frame.getAttribute("data-headline-last-baseline")),
      subtitleX: Number(frame.getAttribute("data-subtitle-x")),
      subtitleFirstBaseline: Number(frame.getAttribute("data-subtitle-first-baseline")),
      subtitleLastBaseline: Number(frame.getAttribute("data-subtitle-last-baseline")),
      headlineGap: Number(frame.getAttribute("data-subtitle-headline-gap")),
    }));
    expect(layout.headlineX).toBe(443);
    expect(layout.subtitleX).toBe(443);
    expect(layout.subtitleFirstBaseline - layout.headlineLastBaseline).toBeGreaterThanOrEqual(layout.headlineGap);
    expect(layout.subtitleLastBaseline).toBeLessThan(546);
    await expect(page.getByText("Impossible de charger le décor Botanique éditorial. Réessayez en rechargeant la page.")).toHaveCount(0);
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
