import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { signIn } from "./auth-session";

test("Élégance et motifs d’affiche conservent les styles et téléchargent exactement l’aperçu", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(20_000);
  const unexpectedDialogs: string[] = [];
  page.on("dialog", async dialog => {
    unexpectedDialogs.push(dialog.type());
    await dialog.accept();
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (...args) {
      const target = window as unknown as { posterEncodes?: number };
      target.posterEncodes = (target.posterEncodes ?? 0) + 1;
      return original.apply(this, args);
    };
  });
  await signIn(page);
  // Check the deployed asset with the authenticated preview context as well.
  const backdrop = await page.request.get("/backgrounds/premium-poster-backdrop.png");
  expect(backdrop.ok(), "Le décor Élégance doit être livré par le déploiement").toBe(true);
  expect(backdrop.headers()["content-type"]).toContain("image/png");
  let campaignId: string | undefined;
  try {
    await page.goto("/campaigns/new/guided");
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill(`E2E — Élégance ${Date.now()}`);
    await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).last().click();
    const dialog = page.getByRole("dialog", { name: "Votre jeu est enregistré.", exact: true });
    const link = dialog.getByRole("link", { name: "Affiche", exact: true });
    const href = await link.getAttribute("href");
    campaignId = href?.match(/campaigns\/([^/]+)/)?.[1];
    expect(campaignId).toBeTruthy();
    await link.click();
    await expect(page.getByRole("button", { name: "Télécharger le PNG", exact: true })).toBeEnabled({ timeout: 30_000 });

    const font = page.getByLabel("Police du texte principal");
    const primary = page.getByLabel("Couleur principale", { exact: true });
    const background = page.getByLabel("Couleur du fond uni de l’affiche");
    const choose = (name: string) => page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
    const save = async () => {
      const response = page.waitForResponse(r => r.url().includes("/poster-settings") && r.request().method() === "POST");
      await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
      expect((await response).ok()).toBeTruthy();
      await expect(page.getByText("Affiche enregistrée.", { exact: true })).toBeVisible();
    };
    await font.selectOption("lato");
    await expect(font).toHaveValue("lato");
    await primary.fill("#146c70");
    await background.fill("#e7f2ed");
    await page.getByLabel("Taille du texte principal", { exact: true }).fill("44");
    await page.locator("textarea").fill("Scannez, jouez, récupérez votre cadeau !");
    await page.getByLabel("Texte affiché à la place du logo").fill("Institut de beauté");
    // Commit the color input before switching; also cover the debounced update.
    await primary.blur();
    await choose("Élégance");
    await expect(page.getByLabel("Taille du texte principal", { exact: true })).toHaveValue("58");
    await expect(page.locator('input[type="color"]')).toHaveCount(0);
    await expect(font).toHaveValue("cormorant");
    const elegancePreview = page.getByAltText("Prévisualisation affiche");
    const beforeLogoMargin = await elegancePreview.getAttribute("src");
    await page.getByLabel("Marge sous le logo", { exact: true }).fill("60");
    await expect(elegancePreview).not.toHaveAttribute("src", beforeLogoMargin!);
    await expect(page.getByTestId("elegance-thumbnail-qr")).toBeAttached();
    await page.getByRole("button", { name: /^Élégance/ }).screenshot({ path: testInfo.outputPath("elegance-thumbnail.png") });
    await save();
    await page.reload();
    await expect(page.getByRole("button", { name: "Télécharger le PNG", exact: true })).toBeEnabled({ timeout: 30_000 });
    await expect(font).toHaveValue("cormorant");
    const sizeSlider = page.getByLabel("Taille du texte principal", { exact: true });
    const previewImage = page.getByAltText("Prévisualisation affiche");
    const readyDownload = page.getByRole("button", { name: "Télécharger le PNG", exact: true });
    await sizeSlider.fill("24");
    await expect(readyDownload).toBeEnabled();
    const smallPreview = await previewImage.getAttribute("src");
    await previewImage.screenshot({ path: testInfo.outputPath("elegance-size24.png") });
    await sizeSlider.fill("40");
    await expect(previewImage).toBeVisible();
    await expect(readyDownload).toBeEnabled();
    await expect(previewImage).not.toHaveAttribute("src", smallPreview!);
    await previewImage.screenshot({ path: testInfo.outputPath("elegance-size40.png") });
    const encodes = () => page.evaluate(() => (window as unknown as { posterEncodes: number }).posterEncodes);
    const before = await encodes();
    const started = Date.now();
    for (const value of [45, 50, 55, 60, 65, 70, 75, 80, 84]) await sizeSlider.fill(String(value));
    await expect(previewImage).toBeVisible();
    await expect(readyDownload).toBeEnabled({ timeout: 10_000 });
    await expect(page.locator("#poster-headline-fit")).toBeVisible();
    expect((await encodes()) - before).toBeLessThanOrEqual(3);
    console.log(`Slider settled in ${Date.now() - started}ms; PNG encodes: ${(await encodes()) - before}`);
    await sizeSlider.fill("58");
    await expect(readyDownload).toBeEnabled();
    await choose("Classique");
    await expect(font).toHaveValue("lato");
    await expect(primary).toHaveValue("#146c70");
    await expect(background).toHaveValue("#e7f2ed");
    await expect(page.getByLabel("Taille du texte principal", { exact: true })).toHaveValue("44");
    await page.getByRole("button", { name: "Gradient clair", exact: true }).click();
    await page.getByRole("button", { name: /^Classique/ }).screenshot({ path: testInfo.outputPath("classic-motif-selector.png") });
    await page.getByRole("group", { name: "Motif du fond" }).screenshot({ path: testInfo.outputPath("background-motif-options.png") });
    await font.selectOption("fredoka");
    await choose("Élégance");
    await choose("Classique");
    await page.getByRole("button", { name: "Gradient clair", exact: true }).click();
    await expect(font).toHaveValue("fredoka");
    await choose("Élégance");
    await save();

    const preview = page.getByAltText("Prévisualisation affiche");
    const downloadButton = page.getByRole("button", { name: "Télécharger le PNG", exact: true });
    await expect(downloadButton).toBeEnabled({ timeout: 30_000 });
    await preview.screenshot({ path: testInfo.outputPath("elegance-preview.png") });
    const previewBytes = await preview.evaluate(async (img) => {
      const response = await fetch((img as HTMLImageElement).src);
      return Array.from(new Uint8Array(await response.arrayBuffer()));
    });
    const downloadEvent = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadEvent;
    const target = testInfo.outputPath("elegance-downloaded.png");
    await download.saveAs(target);
    expect(Buffer.from(previewBytes).equals(await readFile(target))).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    await preview.scrollIntoViewIfNeeded();
    await preview.screenshot({ path: testInfo.outputPath("elegance-mobile.png") });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await font.selectOption("roboto");
    await page.locator("textarea").fill("Scannez et jouez pour découvrir les surprises de votre institut et tenter de remporter un cadeau lors de votre visite !");
    await page.getByLabel("Taille du texte principal", { exact: true }).fill("84");
    await save();
    await expect(downloadButton).toBeEnabled({ timeout: 30_000 });
    const longDownload = page.waitForEvent("download");
    await downloadButton.click();
    await (await longDownload).saveAs(testInfo.outputPath("elegance-long-roboto.png"));
    await page.reload();
    await expect(downloadButton).toBeEnabled({ timeout: 30_000 });
    await expect(font).toHaveValue("roboto");
    await choose("Classique");
    await page.getByRole("button", { name: "Clair uni", exact: true }).click();
    await expect(font).toHaveValue("lato");
    await expect(primary).toHaveValue("#146c70");
    await expect(background).toHaveValue("#e7f2ed");
    expect(unexpectedDialogs).toEqual([]);
  } finally {
    if (campaignId) {
      const cleanup = await page.request.delete(`/api/campaigns/${campaignId}`, {
        headers: { origin: new URL(page.url()).origin },
      });
      expect(cleanup.ok(), "Nettoyage du jeu E2E").toBeTruthy();
    }
  }
});
