import { expect, test } from "@playwright/test";
import { signIn } from "./auth-session";

test("aperçu compact, chargement, réouverture et viewport mobile", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  let id: string | undefined;
  try {
    await page.goto("/campaigns/new/guided");
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill(`E2E — Aperçu ${Date.now()}`);
    await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).last().click();
    const saved = page.getByRole("dialog", { name: "Votre jeu est enregistré.", exact: true });
    id = (await saved.getByRole("link", { name: "Affiche", exact: true }).getAttribute("href"))?.match(/campaigns\/([^/]+)/)?.[1];
    expect(id).toBeTruthy();
    await page.keyboard.press("Escape");
    await page.goto(`/campaigns/${id}/edit/guided`);
    const preview = page.getByRole("button", { name: "Prévisualiser", exact: true });
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/preview-embed?preview=1", async route => { await gate; await route.continue(); });
    await preview.click();
    const dialog = page.getByRole("dialog", { name: "Version mobile", exact: true });
    await expect(dialog.getByRole("status")).toBeVisible();
    await dialog.screenshot({ path: testInfo.outputPath("loading.png") });
    release();
    await expect(dialog.getByRole("status")).toBeHidden({ timeout: 90_000 });
    const frame = dialog.locator("iframe");
    await expect(frame).toBeVisible();
    expect(await frame.evaluate(el => (el as HTMLIFrameElement).contentWindow?.innerWidth)).toBe(390);
    for (const [width, height] of [[1920,1080],[1440,900],[1366,768],[1024,768]]) {
      await page.setViewportSize({ width, height });
      await expect.poll(async () => {
        const box = await dialog.boundingBox();
        return !!box && box.y >= 24 && box.y + box.height <= height - 24 && box.width <= 460;
      }).toBe(true);
      await expect(dialog.getByRole("button", { name: "Fermer", exact: true })).toBeInViewport();
      await page.screenshot({ path: testInfo.outputPath(`preview-${width}.png`) });
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(preview).toBeFocused();
    await preview.click();
    await expect(dialog.getByRole("status")).toBeVisible();
    await expect(dialog.getByRole("status")).toBeHidden({ timeout: 60_000 });
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
    await preview.click();
    await expect(page).toHaveURL(new RegExp(`/campaign/${id}\\?preview=1`));
    await page.screenshot({ path: testInfo.outputPath("mobile-direct.png") });
  } finally {
    if (id) expect((await page.request.delete(`/api/campaigns/${id}`, { headers: { origin: new URL(page.url()).origin } })).ok()).toBe(true);
  }
});
