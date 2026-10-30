import { expect, test } from "@playwright/test";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE,
    value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })), url: baseURL! }]);
  await context.route(/https:\/\/[^/]*posthog\.com\//, route => route.abort());
  await context.route("**/_vercel/insights/**", route => route.abort());
});

test("@visual-1280 Analytics est téléchargé après accord et le rendu initial reste disponible", async ({ page, request }, info) => {
  const scripts: string[] = [];
  const responses: Promise<void>[] = [];
  page.on("response", response => {
    if (response.request().resourceType() === "script") responses.push(response.text().then(body => { scripts.push(body); }).catch(() => {}));
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await (await request.get("/")).text()).toContain('data-testid="demo-wheel"');
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await Promise.all(responses);
  await expect(page.locator("#demo").getByTestId("demo-wheel")).toBeVisible();
  expect(scripts.some(body => body.includes("/_vercel/insights/script.js"))).toBe(false);
  await page.screenshot({ path: info.outputPath("home-before-interaction-1280x720.png") });
  await page.getByRole("button", { name: "Gérer les cookies" }).click();
  await page.getByRole("button", { name: "Accepter", exact: true }).click();
  await expect.poll(() => scripts.some(body => body.includes("/_vercel/insights/script.js"))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
});

test("miniatures au DPR mobile et aperçu agrandi conservent leur définition", async ({ browser, baseURL }, info) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.75 });
  try {
    await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE, value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })), url: baseURL! }]);
    await context.route(/https:\/\/[^/]*posthog\.com\//, route => route.abort());
    await context.route("**/_vercel/insights/**", route => route.abort());
    const page = await context.newPage();
    await page.goto("/");
    const opener = page.getByRole("button", { name: "Voir le modèle Nude Élégance — Ticket à gratter", exact: true });
    await opener.scrollIntoViewIfNeeded();
    const thumbnail = opener.locator("img");
    await expect.poll(() => thumbnail.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    const source = await thumbnail.evaluate((image: HTMLImageElement) => ({ url: image.currentSrc, width: image.clientWidth, dpr: devicePixelRatio }));
    const thumbnailSourceWidth = Number(new URL(source.url).searchParams.get("w"));
    expect(thumbnailSourceWidth).toBeGreaterThanOrEqual(source.width * source.dpr);
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Nude Élégance", exact: true });
    await expect.poll(() => dialog.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    const large = await dialog.locator("img").evaluate((image: HTMLImageElement) => ({url:image.currentSrc,width:image.clientWidth,dpr:devicePixelRatio}));
    expect(Number(new URL(large.url).searchParams.get("w"))).toBeGreaterThanOrEqual(large.width * large.dpr);
    await page.screenshot({ path: info.outputPath("gallery-dialog-mobile.png") });
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
  } finally { await context.close(); }
});
