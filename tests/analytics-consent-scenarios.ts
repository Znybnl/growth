import { expect, test } from "@playwright/test";

// Shared scenarios exercise the real banner and SDK in each independently built app.
export function analyticsConsentScenarios(entryPath: string, navigationPath: string) {
  // Exercise consenting human traffic: PostHog drops headless client hints.
  // This only affects the local test browser; production keeps its bot filtering.
  test.use({ viewport: { width: 1280, height: 720 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36" });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
    });
    await page.route(/https:\/\/[^/]*posthog\.com\//, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"status":1}' });
    });
    await page.route("**/_vercel/insights/**", (route) => route.fulfill({ status: 200, body: "" }));
  });

  test("sans accord puis refus : aucun appel PostHog, navigation disponible et préférence durable", async ({ page, context }, testInfo) => {
    const calls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("posthog.com")) calls.push(request.url());
    });
    await page.goto(entryPath);
    const preferences = page.getByRole("region", { name: "Votre choix de mesure d’audience" });
    await expect(preferences).toBeVisible();
    await expect(preferences.getByRole("button", { name: "Accepter", exact: true })).toBeVisible();
    await expect(preferences.getByRole("button", { name: "Refuser", exact: true })).toBeVisible();
    await preferences.screenshot({ path: testInfo.outputPath("cookie-choices.png") });
    await page.screenshot({ path: testInfo.outputPath("analytics-choices-1280x720.png") });
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 720 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await preferences.screenshot({ path: testInfo.outputPath(`analytics-choices-${width}.png`) });
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    expect(calls).toEqual([]);
    expect((await context.cookies()).some((cookie) => cookie.name.startsWith("ph_"))).toBe(false);
    await preferences.getByRole("button", { name: "Refuser", exact: true }).click();
    await expect(preferences).toBeHidden();
    const choice = (await context.cookies()).find((cookie) => cookie.name === "okado_analytics_consent")!;
    expect(JSON.parse(decodeURIComponent(choice.value)).choice).toBe("rejected");
    await page.goto(navigationPath);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(preferences).toBeHidden();
    const unchanged = (await context.cookies()).find((cookie) => cookie.name === choice.name)!;
    expect(unchanged.value).toBe(choice.value);
    expect(calls).toEqual([]);
    await page.getByRole("button", { name: "Gérer les cookies" }).click();
    await expect(preferences).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test("accord puis retrait : capture autorisée, suppression navigateur et arrêt après navigation", async ({ page, context }) => {
    const calls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("posthog.com")) calls.push(request.url());
    });
    await page.goto(entryPath + "?email=private%40example.test&token=secret#private");
    const preferences = page.getByRole("region", { name: "Votre choix de mesure d’audience" });
    await preferences.getByRole("button", { name: "Accepter", exact: true }).click();
    await expect(preferences).toBeHidden();
    await expect.poll(() => calls.length).toBeGreaterThan(0);
    expect((await context.cookies()).some((cookie) => cookie.name.startsWith("ph_"))).toBe(true);
    await page.getByRole("button", { name: "Gérer les cookies" }).click();
    await preferences.getByRole("button", { name: "Refuser", exact: true }).click();
    await expect(preferences).toBeHidden();
    expect((await context.cookies()).some((cookie) => cookie.name.startsWith("ph_"))).toBe(false);
    const afterWithdrawal = calls.length;
    await page.goto(navigationPath);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Gérer les cookies" })).toBeVisible();
    expect(calls.length).toBe(afterWithdrawal);
    expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("ph_")))).toEqual([]);
  });

  test("ancien choix invalide : nouvelle demande et aucun SDK tant qu’aucun accord valide", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "okado_analytics_consent", value: encodeURIComponent(JSON.stringify({ version: "old", choice: "accepted", decidedAt: Date.now() })), url: baseURL! }]);
    const calls: string[] = [];
    page.on("request", (request) => { if (request.url().includes("posthog.com")) calls.push(request.url()); });
    await page.goto(entryPath);
    await expect(page.getByRole("region", { name: "Votre choix de mesure d’audience" })).toBeVisible();
    expect(calls).toEqual([]);
  });
}
