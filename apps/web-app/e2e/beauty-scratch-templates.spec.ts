import { expect, test } from "@playwright/test";
import { BEAUTY_SCRATCH_TEMPLATES } from "../src/lib/beauty-scratch-templates";
import { signIn } from "./auth-session";

test("les cinq tickets Beauté restent lisibles et chargent leur fond sur plusieurs écrans", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto("/campaigns/new/guided");
  await page.getByRole("button", { name: /Ticket à gratter/ }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Contrôle visuel tickets Beauté");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();

  const gallery = page.locator('section[aria-labelledby="beauty-scratch-templates-title"]');
  if (!(await gallery.count())) {
    test.skip(true, "Le compte de test courant n'appartient pas au secteur Beauté.");
  }
  await expect(gallery).toBeVisible();
  await expect(gallery.getByRole("button")).toHaveCount(5);

  const subtitleInput = page.getByLabel(/Sous-titre du ticket/);
  await subtitleInput.fill("Des soins délicats pour votre bien-être");
  await expect(page.getByText("Des soins délicats pour votre bien-être").last()).toBeVisible();
  await subtitleInput.fill("");
  await expect(page.getByText("Des soins délicats pour votre bien-être")).toHaveCount(0);

  for (const width of [320, 375, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    await expect(gallery).toBeVisible();
    for (const card of await gallery.getByRole("button").all()) {
      expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    await gallery.screenshot({
      path: testInfo.outputPath(`beauty-scratch-gallery-${width}.png`),
      animations: "disabled",
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of BEAUTY_SCRATCH_TEMPLATES) {
    const card = gallery.getByRole("button", { name: new RegExp(theme.name, "i") });
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    const preview = page.locator(`.okado-preview-surface[data-template-id="${theme.id}"]`);
    await expect(preview).toBeVisible();
    await expect(preview).toHaveCSS("background-image", new RegExp(theme.background.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const assetResponse = await page.request.get(theme.background);
    expect(assetResponse.ok()).toBe(true);
    expect(assetResponse.headers()["content-type"]).toContain("image/webp");
    await preview.screenshot({
      path: testInfo.outputPath(`${theme.id}-390.png`),
      animations: "disabled",
    });
  }
});
