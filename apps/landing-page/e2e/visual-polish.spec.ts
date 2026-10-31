import { expect, test } from "@playwright/test";

test("découverte : consentement compact, menu et présentation produit @visual-1280", async ({ browser, baseURL }, info) => {
  test.skip(info.project.name !== "desktop", "Matrice exécutée une seule fois");
  test.setTimeout(120_000);
  for (const [width, height] of [[1280, 720], [1280, 600], [390, 844], [320, 740]]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height }, reducedMotion: "reduce" });
    const calls: string[] = [];
    await context.route(/posthog|_vercel\/insights/, route => { calls.push(route.request().url()); return route.abort(); });
    const page = await context.newPage();
    try {
      await page.goto("/");
      const cookies = page.locator("#okado-cookie-preferences");
      await expect(cookies).toBeVisible();
      const bounds = (await cookies.boundingBox())!;
      expect(bounds.height).toBeLessThan(height * .65);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await page.screenshot({ path: info.outputPath(`consent-${width}x${height}.png`) });
      await cookies.getByText("Détails de la mesure et confidentialité", { exact: true }).click();
      await expect(cookies.getByText(/votre e-mail de connexion identifie/)).toBeVisible();
      await page.screenshot({ path: info.outputPath(`consent-details-${width}x${height}.png`) });
      await cookies.getByRole("button", { name: "Refuser", exact: true }).click();
      await expect(cookies).toBeHidden();
      expect(calls).toEqual([]);
      if (width < 640) await expect(page.getByRole("button", { name: "Gérer les cookies" })).toHaveCSS("position", "relative");
      if (width < 1024) {
        const menu = page.getByRole("button", { name: "Ouvrir le menu" });
        await menu.focus(); await page.keyboard.press("Enter");
        const nav = page.getByRole("navigation", { name: "Navigation mobile" });
        await expect(nav.getByRole("link", { name: "Connexion", exact: true })).toBeVisible();
        await page.screenshot({ path: info.outputPath(`menu-${width}.png`) });
        await page.keyboard.press("Escape");
        await expect(menu).toBeFocused();
        await menu.click();
        await nav.getByRole("link", { name: "Modèles", exact: true }).click();
        await expect(nav).toBeHidden();
        expect(await page.evaluate(() => location.hash)).toBe("#modeles");
      }
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: info.outputPath(`hero-${width}x${height}.png`) });
      for (const id of ["modeles", "cas-usage", "suivi"]) {
        const section = page.locator(`#${id}`);
        await section.scrollIntoViewIfNeeded();
        await expect.poll(() => section.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        await section.screenshot({ path: info.outputPath(`${id}-${width}x${height}.png`), style: "header.sticky { visibility: hidden !important; }" });
      }
      await expect(page.locator("#suivi")).toContainText("Vraie interface Okado · données fictives");
      await expect(page.locator("#suivi").getByRole("link", { name: "Agrandir la capture du tableau de bord marchand" })).toHaveAttribute("target", "_blank");
      expect(calls).toEqual([]);
    } finally { await context.close(); }
  }
});
