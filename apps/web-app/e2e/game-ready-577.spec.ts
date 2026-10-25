import { readFile } from "node:fs/promises";
import QRCode from "qrcode";
import { expect, test } from "@playwright/test";
import { captureVisualAt1280, rejectAnalyticsForVisualTests, assertNoPageOverflow } from "./helpers/visual-1280";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
});

for (const admin of [false, true]) for (const active of [false, true]) {
  test(`@visual-1280 confirmation ${admin ? "admin" : "marchand"} ${active ? "publiée" : "brouillon"} : QR et téléchargement explicite`, async ({ page }, info) => {
    const id = `${admin ? "admin" : "merchant"}-qr-fixture`;
    const endpoint = `/api/${admin ? "admin/" : ""}campaigns/${id}/qr`;
    const svg = await QRCode.toString(`https://game.example.test/campaign/${id}`, { type: "svg", width: 512 });
    const requests: string[] = [];
    let downloads = 0;
    page.on("download", () => downloads++);
    await page.route(`**${endpoint}*`, route => {
      requests.push(route.request().url());
      return route.fulfill({ contentType: "image/svg+xml", body: svg });
    });
    await page.goto("/dev/admin-qr-proof");
    if (active) await page.getByRole("checkbox", { name: "Jeu publié", exact: true }).check();
    const trigger = page.getByRole("button", { name: admin ? "Confirmation d’enregistrement" : "Confirmation marchand", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    const image = dialog.getByAltText("QR code de diffusion du jeu");
    const downloadButton = dialog.getByRole("button", { name: "Télécharger le QR code", exact: true });
    await expect(downloadButton).toBeEnabled();
    await expect(dialog).toContainText(active ? "Jeu publié" : "Brouillon enregistré");
    await expect(dialog).toContainText(active ? "Votre jeu est prêt à être partagé." : "Ce QR donnera accès au jeu après publication.");
    if (admin) await expect(dialog.getByRole("heading")).toContainText("Commerce de test");
    await expect(dialog.getByRole("button")).toHaveCount(3); // two actions + close
    await expect(dialog.getByText("QR de test", { exact: true })).toHaveCount(0);
    await expect(dialog).not.toContainText("Testez le parcours");
    await expect(dialog.getByRole("link", { name: "Affiche", exact: true })).toHaveAttribute("href", `/${admin ? "admin/" : ""}campaigns/${id}/poster`);
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0]).search).toBe("?inline=1");
    expect(downloads).toBe(0);
    expect(await image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(await image.evaluate(img => img.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })))).toBe(true);
    for (const [width, height] of [[1280,720], [1280,600], [1366,768], [390,844], [320,844]]) {
      await page.setViewportSize({ width, height });
      await assertNoPageOverflow(page);
      await expect(downloadButton).toBeInViewport();
      await expect(dialog.getByRole("button", { name: "Prévisualiser mon jeu", exact: true })).toBeInViewport();
      await expect(dialog.getByRole("button", { name: "Fermer la confirmation d’enregistrement" })).toBeInViewport();
      expect(await dialog.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      const bounds = await dialog.boundingBox();
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
      if (width === 1280) await captureVisualAt1280(page, info, `ready-${admin}-${active}`, height);
      else await page.screenshot({ path: info.outputPath(`ready-${width}.png`) });
    }
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    const downloaded = page.waitForEvent("download");
    await downloadButton.click();
    const file = await downloaded;
    expect(file.suggestedFilename()).toBe(`${id}-qr.svg`);
    expect(await readFile((await file.path())!, "utf8")).toBe(svg);
    expect(new URL(requests[1]).search).toBe("");
    expect(downloads).toBe(1);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(downloadButton).toBeEnabled();
    expect(requests).toHaveLength(3);
    expect(downloads).toBe(1);
  });
}

test("@visual-1280 QR indisponible : erreur locale, reprise, double clic, fermeture lente", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  let calls = 0;
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/campaigns/merchant-qr-fixture/qr*", async route => {
    calls++;
    if (calls === 1) return route.fulfill({ status: 403, json: { error: "Refus synthétique" } });
    await waiting;
    return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"/>' });
  });
  await page.goto("/dev/admin-qr-proof");
  const trigger = page.getByRole("button", { name: "Confirmation marchand", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText("Vérifiez votre connexion et vos droits");
  await expect(dialog.getByRole("button", { name: "Prévisualiser mon jeu" })).toBeEnabled();
  await captureVisualAt1280(page, info, "ready-erreur", 600);
  await dialog.getByRole("button", { name: "Réessayer", exact: true }).dblclick();
  await expect.poll(() => calls).toBe(2);
  await expect(dialog.getByRole("status").last()).toContainText("Préparation");
  await page.keyboard.press("Escape");
  release();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog.getByRole("button", { name: "Télécharger le QR code", exact: true })).toBeEnabled();
  expect(calls).toBe(3);
});

for (const template of ["beauty-nude", "beauty-scratch-nude"]) for (const admin of [false, true]) for (const mode of ["create", "edit", "edit-published"]) {
  test(`sauvegarde du Wizard ${mode} ${template} ${admin ? "admin" : "marchand"} → aperçu isolé`, async ({ page }) => {
    const endpoint = admin ? "/api/admin/merchants/fixture-account/locations/template-proof-merchant/campaigns/setup" : "/api/campaigns/setup";
    let saves = 0;
    await page.route("**/api/**", route => route.fulfill({ json: { assets: {}, items: [], suggestions: [] } }));
    await page.route(`**${endpoint}`, route => {
      saves++;
      expect(route.request().postDataJSON().isActive).toBe(mode.includes("published"));
      return route.fulfill({ json: { campaign: { campaign: { id: "saved-game-fixture" } } } });
    });
    const qrEndpoint = `/api/${admin ? "admin/" : ""}campaigns/saved-game-fixture/qr`;
    await page.route(`**${qrEndpoint}*`, route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"/>' }));
    await page.route(admin ? "**/api/admin/campaigns/saved-game-fixture/preview?embed=1" : "**/campaign/saved-game-fixture/preview-embed?preview=1", route =>
      route.fulfill({ contentType: "text/html", body: "<html><body>Aperçu synthétique isolé</body></html>" }));
    await page.goto(`/dev/template-rendering-proof?mode=wizard-responsive-${mode}${admin ? "-admin" : ""}&template=${template}`);
    await expect.poll(() => page.locator(".okado-wizard").evaluate(el => getComputedStyle(el).getPropertyValue("--wizard-toolbar-height").trim())).not.toBe("");
    const save = page.getByTestId("wizard-save-toolbar").getByRole("button", { name: mode.includes("published") ? "Enregistrer les modifications" : "Enregistrer le brouillon", exact: true });
    await save.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Télécharger le QR code", exact: true })).toBeEnabled();
    await expect(dialog.getByRole("status").first()).toContainText(mode.includes("published") ? "Jeu publié" : "Brouillon enregistré");
    await dialog.getByRole("button", { name: "Prévisualiser mon jeu", exact: true }).click();
    const preview = page.getByRole("dialog", { name: "Version mobile", exact: true });
    await expect(preview).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    const iframe = preview.getByTitle("Prévisualisation mobile du jeu");
    await expect(iframe).toHaveAttribute("src", admin ? "/api/admin/campaigns/saved-game-fixture/preview?embed=1" : /\/campaign\/saved-game-fixture\/preview-embed\?preview=1/);
    await expect(preview.frameLocator("iframe").locator("body")).toContainText("Aperçu synthétique isolé");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(save).toBeFocused();
    expect(saves).toBe(1);
    // Preview QR remains available outside the confirmation.
    if (admin) await expect(page.getByRole("button", { name: "QR code", exact: true })).toBeVisible();
    else {
      await page.getByRole("button", { name: "Options du QR code", exact: true }).click();
      await expect(page.getByRole("menuitem", { name: "QR code de prévisualisation", exact: true })).toBeVisible();
    }
  });
}
