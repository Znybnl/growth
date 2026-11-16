import { expect, test } from "@playwright/test";

for (const choice of ["absent", "rejected", "accepted"] as const) {
  for (const route of ["/campaign/dev-cookie-proof", "/campaign/dev-cookie-proof/preview-embed"]) {
  test(`jeu ou aperçu sans fenêtre ni cookies de mesure : ${choice} ${route}`, async ({ page, context, baseURL }) => {
    if (choice !== "absent") await context.addCookies([{
      name: "okado_analytics_consent",
      value: encodeURIComponent(JSON.stringify({ version: "2026-10-15", choice, decidedAt: Date.now() })),
      url: baseURL!,
    }]);
    if (choice === "accepted") await context.addCookies([{ name: "ph_phc_consent_fixture_posthog", value: "previous", url: baseURL! }]);
    const rememberedChoice = (await context.cookies()).find(cookie => cookie.name === "okado_analytics_consent")?.value;
    const analyticsRequests: string[] = [];
    page.on("request", request => {
      if (/posthog\.com|\/_vercel\/insights\//.test(request.url())) analyticsRequests.push(request.url());
    });
    await page.route("**/api/public/campaign/**", route => route.fulfill({ json: { campaign: { actions: [] } } }));
    await page.goto(route);
    await expect(page.getByRole("button", { name: /^jouer$/i })).toBeVisible();
    await expect(page.getByRole("region", { name: "Votre choix de mesure d’audience" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Gérer les cookies" })).toHaveCount(0);
    await page.waitForTimeout(1500);
    expect(analyticsRequests).toEqual([]);
    expect((await context.cookies()).filter(cookie => cookie.name.startsWith("ph_"))).toEqual([]);
    expect((await context.cookies()).find(cookie => cookie.name === "okado_analytics_consent")?.value).toBe(rememberedChoice);
    await page.getByRole("button", { name: /^jouer$/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(500);
    expect(analyticsRequests).toEqual([]);
    expect((await context.cookies()).filter(cookie => cookie.name.startsWith("ph_"))).toEqual([]);
    await page.goto("/connexion");
    await expect(page.getByRole("button", { name: "Gérer les cookies" })).toBeVisible();
    if (choice === "absent") await expect(page.getByRole("region", { name: "Votre choix de mesure d’audience" })).toBeVisible();
  });
  }
}

test("navigation marchande vers le jeu : arrêt de la mesure, préférence préservée et accès direct", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "okado_analytics_consent", value: encodeURIComponent(JSON.stringify({ version: "2026-10-15", choice: "accepted", decidedAt: Date.now() })), url: baseURL! }]);
  await page.route(/https:\/\/[^/]*posthog\.com\//, route => route.fulfill({ json: { status: 1 } }));
  await page.route("**/_vercel/insights/**", route => route.fulfill({ body: "" }));
  await page.route("**/api/public/campaign/**", route => route.fulfill({ json: { campaign: { actions: [] } } }));
  await page.goto("/dev/cookie-navigation-proof");
  await expect.poll(async () => (await context.cookies()).some(cookie => cookie.name.startsWith("ph_"))).toBe(true);
  await page.getByRole("link", { name: "Ouvrir le jeu fictif" }).click();
  await expect(page.getByRole("button", { name: /^jouer$/i })).toBeVisible();
  await expect(page.getByRole("region", { name: "Votre choix de mesure d’audience" })).toHaveCount(0);
  await expect.poll(async () => (await context.cookies()).some(cookie => cookie.name.startsWith("ph_"))).toBe(false);
  expect((await context.cookies()).find(cookie => cookie.name === "okado_analytics_consent")).toBeDefined();
  await page.getByRole("button", { name: /^jouer$/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("link", { name: "Ouvrir le jeu fictif" })).toBeVisible();
  await expect.poll(async () => (await context.cookies()).some(cookie => cookie.name.startsWith("ph_"))).toBe(true);
  await expect(page.getByRole("region", { name: "Votre choix de mesure d’audience" })).toHaveCount(0);
});

test("un bandeau marchand déjà ouvert ne suit pas le visiteur vers le jeu", async ({ page }) => {
  await page.route("**/api/public/campaign/**", route => route.fulfill({ json: { campaign: { actions: [] } } }));
  await page.goto("/dev/cookie-navigation-proof");
  await expect(page.getByRole("region", { name: "Votre choix de mesure d’audience" })).toBeVisible();
  await page.getByRole("link", { name: "Ouvrir le jeu fictif" }).click({ force: true });
  await expect(page.getByRole("button", { name: /^jouer$/i })).toBeVisible();
  await expect(page.getByRole("region", { name: "Votre choix de mesure d’audience" })).toHaveCount(0);
});
