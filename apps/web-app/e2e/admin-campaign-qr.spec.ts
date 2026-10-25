import { readFile } from "node:fs/promises";
import QRCode from "qrcode";
import { expect, test } from "@playwright/test";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";
import { captureVisualAt1280 } from "./helpers/visual-1280";

test.beforeEach(async ({ context, baseURL, page }) => {
  await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE, url: baseURL!, value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })) }]);
  await page.route(/https:\/\//, route => route.abort());
});

for (const [width, height] of [[320, 844], [390, 844], [1280, 600], [1280, 720]]) {
  test(`${width === 1280 ? "@visual-1280 " : ""}QR admin à ${width}×${height} : consultation distincte, image enregistrable, fichier réel et clavier`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    const svg = await QRCode.toString("https://game.example.test/campaign/admin-qr-fixture", { type: "svg", width: 512 });
    const requests: string[] = [];
    let release!: () => void;
    const waiting = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/api/admin/campaigns/admin-qr-fixture/qr*", async route => {
      requests.push(route.request().url());
      await waiting;
      await route.fulfill({ contentType: "image/svg+xml", body: svg });
    });
    await page.goto("/dev/admin-qr-proof");
    const trigger = page.getByRole("button", { name: "Télécharger le QR de diffusion", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "QR code de diffusion" });
    await expect(dialog.getByRole("status")).toContainText("Préparation de votre QR code");
    release();
    const image = dialog.getByAltText("QR code de diffusion du jeu");
    await expect(image).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Télécharger le QR code", exact: true })).toBeEnabled();
    expect(await image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(await image.evaluate(img => img.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })))).toBe(true);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("?inline=1");
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    await expect(dialog.getByRole("button", { name: "Fermer le téléchargement", exact: true })).toBeInViewport();
    await expect(dialog.getByRole("heading", { name: "QR code de diffusion", exact: true })).toBeInViewport();
    if (width === 1280) await captureVisualAt1280(page, testInfo, "qr-diffusion", height);
    else await page.screenshot({ path: testInfo.outputPath(`qr-dialog-${width}.png`), fullPage: true });
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
    const downloading = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Télécharger le QR code", exact: true }).click();
    const file = await downloading;
    expect(file.suggestedFilename()).toBe("admin-qr-fixture-qr.svg");
    expect(await readFile((await file.path())!, "utf8")).toBe(svg);
    expect(requests).toHaveLength(2);
    expect(new URL(requests[1]).search).toBe("");
    await expect(dialog.getByRole("status")).toContainText("transmis au navigateur");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

for (const admin of [true, false]) {
  test(`confirmation ${admin ? "admin" : "marchand"} : une seule popin à la fois`, async ({ page }) => {
    await page.route("**/api/**/qr*", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"/>' }));
    await page.goto("/dev/admin-qr-proof");
    await page.getByRole("button", { name: admin ? "Confirmation d’enregistrement" : "Confirmation marchand", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(page.getByRole("dialog").getByAltText("QR code de diffusion du jeu")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Ce QR donnera accès au jeu après publication.");
    await expect(page.getByRole("dialog")).toContainText(admin ? "Le brouillon est prêt" : "Votre jeu est enregistré");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

test("QR marchand : refus serveur, réessai, aucun fichier JSON téléchargé", async ({ page }) => {
  let calls = 0, downloads = 0;
  page.on("download", () => downloads++);
  await page.route("**/api/campaigns/merchant-qr-fixture/qr*", route => ++calls === 1
    ? route.fulfill({ status: 403, json: { error: "refus" } })
    : route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"/>' }));
  await page.goto("/dev/admin-qr-proof");
  await page.getByRole("button", { name: "QR marchand", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Vérifiez votre connexion et vos droits");
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Télécharger le QR code", exact: true })).toBeEnabled();
  expect(downloads).toBe(0);
});

test("@visual-1280 CSV : popin immédiate, HTML refusé, réessai et fichier conforme", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  let calls = 0;
  const csv = "Prénom,Nom\nCamille,Test\n";
  await page.route("**/api/merchant/leads?*", route => ++calls === 1 ? route.fulfill({ contentType: "text/html", body: "<html>Connexion</html>" }) : route.fulfill({ contentType: "text/csv", body: csv }));
  await page.goto("/dev/admin-qr-proof");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export des contacts" });
  await expect(dialog.getByRole("alert")).toContainText("Le fichier n’a pas pu être préparé");
  await captureVisualAt1280(page, testInfo, "export-erreur");
  const waiting = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Réessayer", exact: true }).click();
  const file = await waiting;
  expect(file.suggestedFilename()).toBe("merchant-leads.csv");
  expect(await readFile((await file.path())!, "utf8")).toBe(csv);
  await expect(dialog.getByRole("status")).toContainText("transmis au navigateur");
});

test("menu des campagnes : QR consultable sans navigation ni téléchargement implicite", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  const requests: string[] = [];
  let downloads = 0;
  page.on("download", () => downloads++);
  const svg = await QRCode.toString("https://game.example.test/campaign/merchant-qr-fixture", { type: "svg" });
  await page.route("**/api/campaigns/merchant-qr-fixture/qr*", route => {
    requests.push(route.request().url());
    return route.fulfill({ contentType: "image/svg+xml", body: svg });
  });
  await page.goto("/dev/admin-qr-proof");
  const trigger = page.getByRole("button", { name: "Ouvrir les actions de la campagne", exact: true });
  await trigger.click();
  await page.getByRole("menuitem", { name: "QR Code", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "QR code de diffusion" });
  await expect(dialog.getByRole("button", { name: "Télécharger le QR code", exact: true })).toBeEnabled();
  await expect(dialog).toContainText("Brouillon : ne diffusez ce QR code");
  await captureVisualAt1280(page, info, "liste-qr", 600);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toContain("?inline=1");
  expect(downloads).toBe(0);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("@visual-1280 menu des campagnes : PNG en préparation, erreur et réessai", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  const png = await readFile("public/email-demo-qr.png");
  let calls = 0, release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/campaigns/merchant-qr-fixture/poster", async route => {
    if (++calls === 1) {
      await waiting;
      return route.fulfill({ status: 500, json: { error: "Erreur synthétique" } });
    }
    return route.fulfill({ contentType: "image/png", body: png });
  });
  await page.goto("/dev/admin-qr-proof");
  await page.getByRole("button", { name: "Ouvrir les actions de la campagne", exact: true }).click();
  await page.getByRole("menuitem", { name: /Télécharger l.affiche/ }).click();
  const dialog = page.getByRole("dialog", { name: "Affiche A4 / A5", exact: true });
  await expect(dialog.getByRole("status")).toContainText("Préparation de votre affiche PNG");
  await captureVisualAt1280(page, info, "liste-affiche-preparation", 600);
  release();
  await expect(dialog.getByRole("alert")).toBeVisible();
  const waitingForDownload = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Réessayer", exact: true }).click();
  const file = await waitingForDownload;
  expect(file.suggestedFilename()).toBe("merchant-qr-fixture-affiche-a4-a5.png");
  expect(await readFile((await file.path())!)).toEqual(png);
  expect(calls).toBe(2);
  await expect(dialog.getByRole("status")).toContainText("transmise au navigateur");
});

test("fermer une préparation CSV lente annule la requête, sans téléchargement tardif", async ({ page }) => {
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  let downloads = 0;
  page.on("download", () => downloads++);
  await page.route("**/api/merchant/leads?*", async route => { await waiting; await route.fulfill({ contentType: "text/csv", body: "test" }); });
  await page.goto("/dev/admin-qr-proof");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Préparation de votre export CSV");
  await page.keyboard.press("Escape");
  release();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.waitForTimeout(200);
  expect(downloads).toBe(0);
  await expect(page.getByRole("button", { name: "Export CSV", exact: true })).toBeFocused();
});

test("QR : échec du téléchargement après consultation, réessai sans double envoi et nettoyage de l’image", async ({ page }) => {
  await page.addInitScript(() => {
    const original = URL.revokeObjectURL;
    (window as unknown as { revoked: string[] }).revoked = [];
    URL.revokeObjectURL = url => { (window as unknown as { revoked: string[] }).revoked.push(url); original(url); };
  });
  let attachments = 0;
  const svg = await QRCode.toString("https://game.example.test/campaign/merchant-qr-fixture", { type: "svg" });
  await page.route("**/api/campaigns/merchant-qr-fixture/qr*", route => {
    if (new URL(route.request().url()).searchParams.has("inline")) return route.fulfill({ contentType: "image/svg+xml", body: svg });
    return ++attachments === 1 ? route.fulfill({ status: 500, json: { error: "Indisponible" } }) : route.fulfill({ contentType: "image/svg+xml", body: svg });
  });
  await page.goto("/dev/admin-qr-proof");
  await page.getByRole("button", { name: "QR marchand", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const button = dialog.getByRole("button", { name: "Télécharger le QR code", exact: true });
  await expect(button).toBeEnabled();
  const url = await dialog.getByRole("img").getAttribute("src");
  await button.evaluate(el => { (el as HTMLButtonElement).click(); (el as HTMLButtonElement).click(); });
  await expect(dialog.getByRole("alert")).toBeVisible();
  expect(attachments).toBe(1);
  const waiting = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Réessayer", exact: true }).click();
  await waiting;
  expect(attachments).toBe(2);
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => (window as unknown as { revoked: string[] }).revoked)).toContain(url);
});

test("QR : fermer une préparation lente ne laisse pas réapparaître la popin", async ({ page }) => {
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/campaigns/merchant-qr-fixture/qr*", async route => {
    await waiting;
    await route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
  });
  await page.goto("/dev/admin-qr-proof");
  await page.getByRole("button", { name: "QR marchand", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText("Préparation");
  // Visible markup can precede the modal's focus/keyboard effect by one frame.
  await expect(page.getByRole("button", { name: "Fermer le téléchargement", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  release();
  await page.waitForTimeout(200);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "QR marchand", exact: true })).toBeFocused();
});

for (const mode of ["wizard", "editor"]) {
  test(`${mode} : le menu QR ouvre le dialogue sans navigation`, async ({ page }) => {
    await page.route("**/api/**", route => route.request().url().includes("/qr")
      ? route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"/>' })
      : route.fulfill({ json: { assets: {}, items: [], suggestions: [] } }));
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=classic`);
    await page.getByRole("button", { name: "Options du QR code", exact: true }).click();
    await page.getByRole("menuitem", { name: "Télécharger le QR code", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "QR code de diffusion" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Télécharger le QR code", exact: true })).toBeEnabled();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Options du QR code", exact: true })).toBeFocused();
  });
}

test("@visual-1280 affiche : confirmation conservée, sauvegarde lente/erreur/réessai puis PNG", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  let calls = 0, release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/**", route => route.fulfill({ json: { assets: {}, items: [] } }));
  await page.route("**/api/campaigns/template-proof-campaign/poster-settings", async route => {
    calls++;
    if (calls === 1) { await waiting; await route.fulfill({ status: 500, json: { error: "Enregistrement indisponible." } }); }
    else await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/dev/template-rendering-proof?mode=poster-download&template=classic");
  const trigger = page.getByRole("button", { name: "Télécharger le PNG", exact: true });
  await expect(trigger).toBeEnabled({ timeout: 60_000 });
  await page.getByRole("textbox").first().fill("Logo modifié");
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Enregistrer avant le téléchargement ?" })).toBeVisible();
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  expect(calls).toBe(0);
  await trigger.click();
  await page.getByRole("button", { name: "Enregistrer et télécharger", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Affiche A4 / A5", exact: true });
  await expect(dialog.getByRole("status")).toContainText("Enregistrement des modifications");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await captureVisualAt1280(page, testInfo, "affiche-preparation");
  release();
  await expect(dialog.getByRole("alert")).toContainText("n’a pas pu être enregistrée");
  const downloading = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Réessayer", exact: true }).click();
  const file = await downloading;
  expect(file.suggestedFilename()).toBe("template-proof-campaign-affiche-a4-a5.png");
  const bytes = await readFile((await file.path())!);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(calls).toBe(2);
  await expect(dialog.getByRole("status")).toContainText("transmise au navigateur");
});
