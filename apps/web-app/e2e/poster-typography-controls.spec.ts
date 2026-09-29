import { expect, test } from "@playwright/test";
import { signIn } from "./auth-session";

test("les contrôles typographiques de l’affiche sont ordonnés et s’adaptent au mobile", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(20_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);

  let campaignId: string | undefined;
  try {
    await page.goto("/campaigns/new/guided");
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill(`E2E — Typographie ${Date.now()}`);
    await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).last().click();

    const dialog = page.getByRole("dialog", { name: "Votre jeu est enregistré.", exact: true });
    const posterLink = dialog.getByRole("link", { name: "Affiche", exact: true });
    const href = await posterLink.getAttribute("href");
    campaignId = href?.match(/campaigns\/([^/]+)/)?.[1];
    expect(campaignId).toBeTruthy();
    await posterLink.click();
    await expect(page.getByRole("button", { name: "Télécharger le PNG", exact: true })).toBeEnabled({ timeout: 30_000 });

    const font = page.getByRole("combobox", { name: "Police du texte principal", exact: true });
    const size = page.getByLabel("Taille du texte principal", { exact: true });
    const fontField = font.locator("xpath=..");
    const sizeField = size.locator("xpath=..");
    const secondaryField = page.getByRole("group", { name: "Texte secondaire" });

    await expect(font).toBeVisible();
    await expect(size).toBeVisible();
    await expect(secondaryField).toBeVisible();
    await expect(page.locator(".okado-poster-editor").getByText(/^Aa — /)).toHaveCount(0);
    expect(await page.evaluate(() => {
      const headline = document.querySelector('[aria-describedby="poster-headline-help"]');
      const fontSelect = Array.from(document.querySelectorAll("select")).find(select =>
        select.closest("label")?.textContent?.includes("Police du texte principal"),
      );
      return Boolean(headline && fontSelect &&
        (headline.compareDocumentPosition(fontSelect) & Node.DOCUMENT_POSITION_FOLLOWING));
    })).toBe(true);

    const desktopFontField = await fontField.boundingBox();
    const desktopSizeField = await sizeField.boundingBox();
    expect(desktopFontField).not.toBeNull();
    expect(desktopSizeField).not.toBeNull();
    expect(Math.abs(desktopFontField!.y - desktopSizeField!.y)).toBeLessThanOrEqual(8);
    await page.getByRole("heading", { name: "Style du texte principal" }).locator("..").screenshot({
      path: testInfo.outputPath("poster-typography-desktop.png"),
    });

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileFontField = await fontField.boundingBox();
    const mobileSizeField = await sizeField.boundingBox();
    expect(mobileFontField).not.toBeNull();
    expect(mobileSizeField).not.toBeNull();
    expect(mobileSizeField!.y).toBeGreaterThan(mobileFontField!.y);
    await page.getByRole("heading", { name: "Style du texte principal" }).locator("..").screenshot({
      path: testInfo.outputPath("poster-typography-mobile.png"),
    });
  } finally {
    if (campaignId) {
      const cleanup = await page.request.delete(`/api/campaigns/${campaignId}`, {
        headers: { origin: new URL(page.url()).origin },
      });
      expect(cleanup.ok(), "Nettoyage du jeu E2E").toBeTruthy();
    }
  }
});
