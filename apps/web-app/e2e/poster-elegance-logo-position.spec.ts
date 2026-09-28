import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { signIn } from "./auth-session";
import { getPosterTemplate } from "../src/lib/poster-templates";

test("Élégance réduit le retrait du logo texte sans déplacer le logo image", async ({ page }, testInfo) => {
  const eleganceTemplate = getPosterTemplate("premium-wheel");
  expect(eleganceTemplate.logoTextY).toBe(6);
  expect(eleganceTemplate.logoY).toBe(12);

  test.setTimeout(180_000);
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(20_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);

  let campaignId: string | undefined;
  try {
    await page.goto("/campaigns/new/guided");
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill(`E2E — logo Élégance ${Date.now()}`);
    await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).last().click();

    const dialog = page.getByRole("dialog", { name: "Votre jeu est enregistré.", exact: true });
    const posterLink = dialog.getByRole("link", { name: "Affiche", exact: true });
    const posterHref = await posterLink.getAttribute("href");
    campaignId = posterHref?.match(/campaigns\/([^/]+)/)?.[1];
    expect(campaignId).toBeTruthy();
    await posterLink.click();

    await expect(page.getByRole("button", { name: "Télécharger le PNG", exact: true })).toBeEnabled({ timeout: 30_000 });
    await page.getByRole("button", { name: "Texte", exact: true }).click();
    await page.getByLabel("Texte affiché à la place du logo").fill("Institut de beauté");
    await page.getByRole("button", { name: /^Élégance/ }).click();
    const preview = page.getByAltText("Prévisualisation affiche");
    await expect(preview).toBeVisible();
    await expect(page.getByRole("button", { name: "Télécharger le PNG", exact: true })).toBeEnabled({ timeout: 30_000 });
    await preview.screenshot({ path: testInfo.outputPath("elegance-text-logo-preview.png") });

    const saveResponse = page.waitForResponse(response => response.url().includes("/poster-settings") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    expect((await saveResponse).ok()).toBeTruthy();
    const previewBytes = await preview.evaluate(async image => {
      const response = await fetch((image as HTMLImageElement).src);
      return Array.from(new Uint8Array(await response.arrayBuffer()));
    });
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Télécharger le PNG", exact: true }).click();
    const download = await downloadEvent;
    const downloadPath = testInfo.outputPath("elegance-text-logo-download.png");
    await download.saveAs(downloadPath);
    expect(Buffer.from(previewBytes).equals(await readFile(downloadPath))).toBe(true);

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
