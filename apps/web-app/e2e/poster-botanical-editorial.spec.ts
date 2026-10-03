import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { signIn } from "./auth-session";
import { getPosterLogoTextFontSizePx, getPosterLogoTopY, POSTER_TEMPLATES, getPosterTemplate } from "../src/lib/poster-templates";
import { buildPosterSvg, createPosterPreviewQrDataUrl } from "../src/lib/poster-render";
import { createPosterSettingsDefaults } from "../src/lib/poster-utils";
import type { Campaign } from "../src/lib/types";

test("Botanique éditorial affiche un billet perforé pour l'étape Gratter et abaisse ses icônes", async ({ page }, testInfo) => {
  const template = getPosterTemplate("botanical-editorial-poster");
  const poster = {
    ...createPosterSettingsDefaults({
      templateId: "botanical-editorial-poster",
      logoMode: "text",
      logoText: "Établissement test",
      headline: "Découvrez votre cadeau",
      headlineTextColor: template.headlineTextColor,
      headlineFontSizePx: template.headlineFontSizePx,
      headlineFontFamily: "cormorant",
      wheel: template.wheel,
    }),
    posterSubtitleEnabled: true,
  };
  const campaign: Campaign = {
    id: "poster-render-test",
    merchantId: "poster-render-test",
    title: "Jeu test",
    subtitle: "Une surprise naturelle vous attend",
    goalType: null,
    emailCaptureEnabled: false,
    ctaLabel: "Jouer",
    successMetric: "",
    isActive: false,
    createdAt: "",
    accent: { ink: template.accentDark, paper: template.background, signal: template.accent },
    gameType: "scratch",
    logoMode: "text",
    logoText: "Établissement test",
    presentation: {
      logo: { sizePercent: 70, marginBottomPx: 10, align: "center" },
      background: { mode: "color", color: template.background },
      heading: { textColor: template.headlineTextColor, fontSizePx: template.headlineFontSizePx, fontFamily: "cormorant", align: "center" },
      button: { backgroundColor: template.accent, textColor: "#ffffff", borderColor: "#ffffff", size: "md", textSizePx: 16, isBold: true },
      layout: { blockSpacingPx: 15, templateId: "classic", wheelSubtitle: "Une surprise naturelle vous attend", subtitleSpacingPx: 15 },
      wheel: template.wheel,
      poster,
      email: { senderName: "", replyTo: "", subject: "", preheader: "", headline: "", body: "", buttonLabel: "", footerNote: "", accentColor: template.accent },
    },
    actions: [],
    rewardRules: { rewardExpiryMinutes: 0, purchaseRequired: false, availableAfterHours: 0, availabilityDurationDays: 0, participationIntervalDays: 0, isWinningEveryTime: false },
  };
  const svg = buildPosterSvg({ campaign, poster, prizes: [], qrDataUrl: createPosterPreviewQrDataUrl() });

  expect(svg).toContain('data-poster-footer="editorial-steps"');
  expect(svg).toContain('data-poster-game-icon="scratch-ticket"');
  expect(svg).toContain('cx="190" cy="80"');
  expect(svg).toContain('M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16');
  await page.setContent(svg);
  await page.screenshot({ path: testInfo.outputPath("botanical-editorial-scratch-poster.png"), fullPage: true });
});

test("tous les templates d'affiche utilisent le même alignement vertical des logos", () => {
  const botanicalTemplate = getPosterTemplate("botanical-editorial-poster");
  expect(botanicalTemplate.logoX).toBe(botanicalTemplate.headlineX);
  expect(botanicalTemplate.medallionFill).toBe("#D3DCC5");
  expect(POSTER_TEMPLATES.every((template) => !("logoY" in template) && !("logoTextY" in template) && !("logoFontSizeMultiplier" in template))).toBe(true);
  expect(getPosterLogoTopY("text")).toBe(24);
  expect(getPosterLogoTopY("image")).toBe(32);
  expect(getPosterLogoTextFontSizePx(170)).toBe(28.9);
  expect(getPosterLogoTextFontSizePx(119)).toBe(20.2);
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
        headline: "Participez à notre jeu 100% gagnant",
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
    const headlineLineCount = Number(await previewFrame.getAttribute("data-headline-line-count"));
    expect(headlineLineCount).toBeGreaterThanOrEqual(2);
    expect(headlineLineCount).toBeLessThanOrEqual(4);
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
