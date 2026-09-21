import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { signIn } from "./auth-session";

test("Botanique conserve son décor, masque les couleurs et télécharge l’aperçu", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(20_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);

  const backdrop = await page.request.get("/backgrounds/botanical-poster-backdrop.png");
  expect(backdrop.ok(), "Le décor Botanique doit être livré par le déploiement").toBe(true);
  expect(backdrop.headers()["content-type"]).toContain("image/png");

  let campaignId: string | undefined;
  try {
    await page.goto("/campaigns/new/guided");
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill(`E2E — Botanique ${Date.now()}`);
    await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).last().click();

    const dialog = page.getByRole("dialog", { name: "Votre jeu est enregistré.", exact: true });
    const href = await dialog.getByRole("link", { name: "Affiche", exact: true }).getAttribute("href");
    campaignId = href?.match(/campaigns\/([^/]+)/)?.[1];
    expect(campaignId).toBeTruthy();
    await dialog.getByRole("link", { name: "Affiche", exact: true }).click();

    const campaignResponse = await page.request.get(`/api/campaigns/${campaignId}`);
    expect(campaignResponse.ok()).toBe(true);
    const campaignPayload = (await campaignResponse.json()) as {
      campaign?: { campaign?: { presentation?: { poster?: Record<string, unknown> } } };
    };
    const savedPoster = campaignPayload.campaign?.campaign?.presentation?.poster;
    expect(savedPoster).toBeTruthy();
    const posterSaveResponse = await page.request.post(`/api/campaigns/${campaignId}/poster-settings`, {
      headers: { origin: new URL(page.url()).origin },
      data: { ...savedPoster, templateId: "botanical-wheel", headlineFontFamily: "cormorant" },
    });
    expect(posterSaveResponse.ok()).toBe(true);
    await page.reload();
    await expect(page.getByRole("button", { name: /^Botanique/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("botanical-thumbnail-qr")).toBeAttached();
    await expect(page.locator('input[type="color"]')).toHaveCount(0);
    await expect(page.getByLabel("Police du texte principal")).toHaveValue("cormorant");

    const preview = page.getByAltText("Prévisualisation affiche");
    const beforeLogoMargin = await preview.getAttribute("src");
    await page.getByLabel("Marge sous le logo", { exact: true }).fill("60");
    await expect(preview).not.toHaveAttribute("src", beforeLogoMargin!);
    const saveResponse = page.waitForResponse(response => response.url().includes("/poster-settings") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    expect((await saveResponse).ok()).toBeTruthy();
    await expect(page.getByText("Affiche enregistrée.", { exact: true })).toBeVisible();
    const downloadButton = page.getByRole("button", { name: "Télécharger le PNG", exact: true });
    await expect(downloadButton).toBeEnabled({ timeout: 30_000 });
    await preview.screenshot({ path: testInfo.outputPath("botanical-preview.png") });
    const previewBytes = await preview.evaluate(async (img) => {
      const response = await fetch((img as HTMLImageElement).src);
      return Array.from(new Uint8Array(await response.arrayBuffer()));
    });

    const downloadEvent = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadEvent;
    const target = testInfo.outputPath("botanical-downloaded.png");
    await download.saveAs(target);
    expect(Buffer.from(previewBytes).equals(await readFile(target))).toBe(true);

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
