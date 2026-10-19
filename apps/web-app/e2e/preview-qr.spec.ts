import { expect, test } from "@playwright/test";
import QRCode from "qrcode";
import { rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

let svg: string;
test.beforeAll(async () => {
  svg = await QRCode.toString("https://example.test/campaign/qr-test?preview=1&previewToken=fictitious", { type: "svg", width: 1200 });
});

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  // Never contact storage, analytics or any production account from this fixture.
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
  });
});

for (const width of [320, 390, 1280]) {
  test(`QR marchand : chargement, SVG lisible et réouverture à ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    let release!: () => void;
    let calls = 0;
    const wait = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/campaigns/qr-test/qr?**", async (route) => {
      calls++;
      const url = new URL(route.request().url());
      expect(url.searchParams.get("preview")).toBe("1");
      expect(url.searchParams.get("inline")).toBe("1");
      if (calls === 1) await wait;
      await route.fulfill({ contentType: "image/svg+xml", headers: { "Cache-Control": "private, no-store" }, body: svg });
    });
    await page.goto("/dev/preview-qr-proof");
    await page.getByRole("button", { name: "Ouvrir le QR de test" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("status")).toHaveText("Chargement du QR code…");
    release();
    const image = dialog.getByRole("img");
    await expect(image).toHaveCSS("opacity", "1");
    expect(await image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
    await expect(dialog.getByRole("status")).toHaveCount(0);
    await expect(dialog.getByRole("alert")).toHaveCount(0);
    const bounds = await image.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`preview-qr-${width}.png`) });
    await dialog.getByRole("button", { name: "Fermer", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Ouvrir le QR de test" }).click();
    await expect(page.getByRole("dialog").getByRole("img")).toHaveCSS("opacity", "1");
    expect(calls).toBeGreaterThanOrEqual(1); // Browsers may retain a decoded image in memory.
  });
}

for (const admin of [false, true]) {
 for (const failure of ["403", "500", "html", "network", "invalid-svg"]) {
  test(`${admin ? "admin" : "marchand"}, échec ${failure} : message et nouvelle tentative`, async ({ page }) => {
    let calls = 0;
    await page.route(admin ? "**/api/admin/campaigns/qr-test/preview?**" : "**/api/campaigns/qr-test/qr?**", async (route) => {
      const url = new URL(route.request().url());
      if (admin) expect(url.searchParams.get("format")).toBe("qr");
      else {
        expect(url.searchParams.get("preview")).toBe("1");
        expect(url.searchParams.get("inline")).toBe("1");
      }
      calls++;
      if (calls > 1) {
        expect(url.searchParams.get("qrRetry")).toBe("1");
        return route.fulfill({ contentType: "image/svg+xml", body: svg });
      }
      if (failure === "network") return route.abort();
      if (failure === "html") return route.fulfill({ contentType: "text/html", body: "<h1>Connexion</h1>" });
      if (failure === "invalid-svg") return route.fulfill({ contentType: "image/svg+xml", body: "not an image" });
      return route.fulfill({ status: Number(failure), json: { error: "Refus de test" } });
    });
    await page.goto("/dev/preview-qr-proof");
    if (admin) await page.getByRole("checkbox", { name: "Administration" }).check();
    await page.getByRole("button", { name: "Ouvrir le QR de test" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("alert")).toHaveText("Impossible de charger le QR code de test.");
    await expect(dialog.getByRole("img")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Réessayer" }).click();
    await expect(dialog.getByRole("img")).toHaveCSS("opacity", "1");
    await expect(dialog.getByRole("alert")).toHaveCount(0);
    expect(calls).toBe(2);
  });
 }
}

test("conserve le endpoint administrateur et réinitialise l'erreur au changement de contexte", async ({ page }) => {
  await page.route("**/api/campaigns/qr-test/qr?**", (route) => route.fulfill({ status: 404, json: { error: "Indisponible" } }));
  const requested: string[] = [];
  await page.route("**/api/admin/campaigns/*/preview?**", (route) => {
    const url = new URL(route.request().url());
    requested.push(url.pathname);
    expect(url.searchParams.get("format")).toBe("qr");
    return route.fulfill({ contentType: "image/svg+xml", body: svg });
  });
  await page.goto("/dev/preview-qr-proof");
  await page.getByRole("button", { name: "Ouvrir le QR de test" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.getByRole("checkbox", { name: "Administration" }).check();
  await page.getByRole("button", { name: "Ouvrir le QR de test" }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.getByRole("checkbox", { name: "Autre jeu" }).check();
  await page.getByRole("button", { name: "Ouvrir le QR de test" }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toHaveCSS("opacity", "1");
  expect(requested).toEqual(["/api/admin/campaigns/qr-test/preview", "/api/admin/campaigns/qr-test-other/preview"]);
});
