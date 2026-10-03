import { expect, test } from "@playwright/test";
import { signIn } from "./auth-session";

test("l’aperçu intégré de l’affiche s’adapte aux petits écrans sans scroll interne", async ({ page }) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(20_000);
  await page.setViewportSize({ width: 1365, height: 672 });
  await signIn(page);

  let campaignId: string | undefined;
  try {
    await page.goto("/campaigns/new/guided");
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill(`E2E — Aperçu affiche responsive ${Date.now()}`);
    await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).last().click();

    const dialog = page.getByRole("dialog", { name: "Votre jeu est enregistré.", exact: true });
    const posterLink = dialog.getByRole("link", { name: "Affiche", exact: true });
    const href = await posterLink.getAttribute("href");
    campaignId = href?.match(/campaigns\/([^/]+)/)?.[1];
    expect(campaignId).toBeTruthy();
    await posterLink.click();

    const viewport = page.getByTestId("poster-preview-viewport");
    const frame = page.getByTestId("poster-preview-frame");
    await expect(viewport).toBeVisible();
    await expect(frame).toBeVisible();
    await expect(page.getByAltText("Prévisualisation affiche")).toBeVisible({ timeout: 20_000 });

    const compactDesktop = await viewport.evaluate((element) => {
      const poster = element.querySelector<HTMLElement>('[data-testid="poster-preview-frame"]');
      if (!poster) throw new Error("Cadre de l’affiche introuvable.");
      const container = element.getBoundingClientRect();
      const bounds = poster.getBoundingClientRect();
      return {
        containerHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        width: bounds.width,
        height: bounds.height,
        fits: bounds.top >= container.top
          && bounds.bottom <= container.bottom
          && bounds.left >= container.left
          && bounds.right <= container.right,
      };
    });
    expect(compactDesktop.scrollHeight).toBeLessThanOrEqual(compactDesktop.containerHeight + 1);
    expect(compactDesktop.fits).toBe(true);
    expect(compactDesktop.width / compactDesktop.height).toBeCloseTo(794 / 1123, 2);
    await viewport.screenshot({ path: test.info().outputPath("poster-preview-compact-desktop.png") });

    await page.setViewportSize({ width: 390, height: 844 });
    await frame.scrollIntoViewIfNeeded();
    const mobile = await viewport.evaluate((element) => {
      const poster = element.querySelector<HTMLElement>('[data-testid="poster-preview-frame"]');
      if (!poster) throw new Error("Cadre de l’affiche introuvable.");
      const container = element.getBoundingClientRect();
      const bounds = poster.getBoundingClientRect();
      return {
        viewportWidth: element.clientWidth,
        viewportScrollWidth: element.scrollWidth,
        width: bounds.width,
        height: bounds.height,
        fitsHorizontally: bounds.left >= container.left && bounds.right <= container.right,
        pageWidth: document.documentElement.clientWidth,
        pageScrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(mobile.viewportScrollWidth).toBeLessThanOrEqual(mobile.viewportWidth + 1);
    expect(mobile.pageScrollWidth).toBeLessThanOrEqual(mobile.pageWidth + 1);
    expect(mobile.fitsHorizontally).toBe(true);
    expect(mobile.width / mobile.height).toBeCloseTo(794 / 1123, 2);
    await viewport.screenshot({ path: test.info().outputPath("poster-preview-mobile.png") });
  } finally {
    if (campaignId) {
      const cleanup = await page.request.delete(`/api/campaigns/${campaignId}`, {
        headers: { origin: new URL(page.url()).origin },
      });
      expect(cleanup.ok(), "Nettoyage du jeu E2E").toBeTruthy();
    }
  }
});
