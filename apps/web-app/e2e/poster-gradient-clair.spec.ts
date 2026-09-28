import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { signIn } from "./auth-session";

test("Gradient clair est un template de premier niveau et garde le même aperçu que le PNG", async ({ page }, testInfo) => {
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
    await expect(choices.first()).toContainText("Gradient clair");
    await expect(choices.last()).toContainText("Classique");
    await expect(page.getByTestId("gradient-clair-thumbnail")).toBeVisible();
    await expect(page.getByTestId("gradient-clair-thumbnail-qr")).toBeAttached();
    await page.getByRole("button", { name: /^Gradient clair/ }).click();
    await expect(page.getByRole("button", { name: /^Gradient clair/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^Classique/ }).click();
    await expect(page.getByRole("button", { name: /^Classique/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^Gradient clair/ }).click();
    await expect(page.getByRole("button", { name: /^Gradient clair/ })).toHaveAttribute("aria-pressed", "true");

    const saveResponse = page.waitForResponse(response => response.url().includes("/poster-settings") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    expect((await saveResponse).ok()).toBeTruthy();
    await expect(page.getByText("Affiche enregistrée.", { exact: true })).toBeVisible();

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
    await expect(page.getByRole("button", { name: /^Gradient clair/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^Classique/ }).click();
    await expect(page.getByRole("button", { name: /^Classique/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("group", { name: "Motif du fond" }).getByRole("button", { name: "Gradient clair" })).toHaveCount(0);

    await page.getByRole("button", { name: /^Gradient clair/ }).screenshot({ path: testInfo.outputPath("gradient-clair-thumbnail.png") });
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
