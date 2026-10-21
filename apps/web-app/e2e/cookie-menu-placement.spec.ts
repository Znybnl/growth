import { expect, test, type Locator, type Page } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

const preferencesName = "Votre choix de mesure d’audience";

async function assertClickableWithoutOverlay(page: Page, control: Locator) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport();
  // Wait for the mobile drawer's exit transition before hit-testing.
  await control.click({ trial: true });
  expect(await control.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  })).toBe(true);
  await assertNoPageOverflow(page);
}

test.beforeEach(async ({ page }) => {
  // No database, session mutation, or real analytics request.
  await page.route("**/api/**", (route) => route.fulfill({ json: {
    emailCount: 1, emailCampaignId: "demo", lowStockCount: 2, exhaustedStockCount: 1,
  } }));
  await page.route(/https:\/\/[^/]*posthog\.com\//, (route) => route.fulfill({ json: { status: 1 } }));
  await page.route("**/_vercel/insights/**", (route) => route.fulfill({ body: "" }));
});

for (const admin of [false, true]) {
  test(`@visual-1280 cookies et déconnexion accessibles — ${admin ? "administration" : "marchand"}`, async ({ page, context, baseURL }, info) => {
    await rejectAnalyticsForVisualTests(context, baseURL!);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/dev/template-rendering-proof?mode=cookie-menu${admin ? "-admin" : ""}`);
    // Dev-only Next.js tools are not part of the production layout.
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    const launcher = page.getByRole("button", { name: "Gérer les cookies", exact: true });
    const signOut = page.getByRole("button", { name: "Déconnexion", exact: true });
    const preferences = page.getByRole("region", { name: preferencesName });
    await expect(launcher).toHaveCount(1);
    await expect(page.getByText("1 e-mail de gain à vérifier")).toBeVisible();

    for (const height of [720, 600]) {
      await page.setViewportSize({ width: 1280, height });
      await page.getByRole("link", { name: "Accueil", exact: true }).scrollIntoViewIfNeeded();
      await captureVisualAt1280(page, info, "cookie-menu-navigation", height);
      await expect(page.locator("header").getByRole("button", { name: "Gérer les cookies" })).toHaveCount(0);
      await assertClickableWithoutOverlay(page, launcher);
      await assertClickableWithoutOverlay(page, signOut);
      await captureVisualAt1280(page, info, "cookie-menu-closed", height);
      const cookieBox = (await launcher.boundingBox())!;
      const logoutBox = (await signOut.boundingBox())!;
      expect(cookieBox.x).toBeGreaterThanOrEqual(248);
      expect(cookieBox.x + cookieBox.width).toBeCloseTo(1280 - 8, 0);
      expect(cookieBox.y + cookieBox.height).toBeCloseTo(height - 8, 0);
      expect(logoutBox.x + logoutBox.width).toBeLessThanOrEqual(248);
      await launcher.focus();
      await page.keyboard.press("Enter");
      await expect(preferences).toBeVisible();
      await expect(preferences.getByRole("heading")).toBeFocused();
      await captureVisualAt1280(page, info, "cookie-menu-preferences", height);
      await preferences.getByRole("button", { name: "Refuser", exact: true }).click();
      await expect(preferences).toBeHidden();
      await expect(launcher).toBeFocused();
      await assertClickableWithoutOverlay(page, signOut);
    }

    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 720 });
      await assertClickableWithoutOverlay(page, launcher);
      await launcher.click();
      await expect(preferences).toBeVisible();
      await assertNoPageOverflow(page);
      await page.screenshot({ path: info.outputPath(`cookie-preferences-${width}.png`) });
      await preferences.getByRole("button", { name: "Continuer sans modifier mon choix" }).click();
      await expect(launcher).toBeFocused();
      await page.getByRole("button", { name: "Ouvrir le menu", exact: true }).click();
      await assertClickableWithoutOverlay(page, signOut);
      await page.screenshot({ path: info.outputPath(`cookie-menu-${width}.png`) });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Ouvrir le menu", exact: true })).toBeFocused();
      await expect(page.getByRole("complementary", { name: "Navigation de l’espace de travail" })).not.toBeInViewport();
      await assertClickableWithoutOverlay(page, launcher);
      await page.screenshot({ path: info.outputPath(`cookie-header-${width}.png`) });
    }
  });
}

test("sans choix préalable : le bandeau reste utilisable dans le vrai cadre", async ({ page, context }) => {
  const analyticsCalls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("posthog.com") || request.url().includes("/_vercel/insights/")) analyticsCalls.push(request.url());
  });
  await page.goto("/dev/template-rendering-proof?mode=cookie-menu-admin");
  const preferences = page.getByRole("region", { name: preferencesName });
  await expect(preferences).toBeVisible();
  await preferences.getByRole("button", { name: "Refuser", exact: true }).click();
  await expect(preferences).toBeHidden();
  expect(analyticsCalls).toEqual([]);
  const cookie = (await context.cookies()).find(({ name }) => name === "okado_analytics_consent")!;
  expect(JSON.parse(decodeURIComponent(cookie.value)).choice).toBe("rejected");
  await page.getByRole("button", { name: "Gérer les cookies", exact: true }).click();
  await expect(preferences).toBeVisible();
});

test("déconnexion simulée : contrôle en bas à droite conservé sur la page publique", async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  let signOutCalls = 0;
  await page.route("**/api/auth/signout", async (route) => {
    expect(route.request().method()).toBe("POST");
    signOutCalls++;
    await route.fulfill({ json: { success: true } });
  });
  await page.goto("/dev/template-rendering-proof?mode=cookie-menu-admin");
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  const signOut = page.getByRole("button", { name: "Déconnexion", exact: true });
  await signOut.scrollIntoViewIfNeeded();
  await signOut.click();
  await expect(page).toHaveURL(/\/connexion$/);
  expect(signOutCalls).toBe(1);
  const fallback = page.getByRole("button", { name: "Gérer les cookies", exact: true });
  await expect(fallback).toHaveCount(1);
  await expect(fallback).toHaveCSS("position", "fixed");
  await fallback.click();
  await expect(page.getByRole("region", { name: preferencesName })).toBeVisible();
});

test("@visual-1280 le bouton cookies ne recouvre pas les actions fixes du wizard", async ({ page, context, baseURL }, info) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  for (const { width, height } of [{ width: 1280, height: 720 }, { width: 1280, height: 600 }, { width: 390, height: 720 }, { width: 320, height: 720 }]) {
    await page.setViewportSize({ width, height });
    await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit");
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await selectWizardStep(page, 3);
    const save = page.getByTestId("wizard-footer").getByRole("button", { name: "Enregistrer le brouillon", exact: true });
    const cookies = page.getByRole("button", { name: "Gérer les cookies", exact: true });
    await assertClickableWithoutOverlay(page, save);
    await assertClickableWithoutOverlay(page, cookies);
    const saveBox = (await save.boundingBox())!;
    const cookieBox = (await cookies.boundingBox())!;
    expect(saveBox.y + saveBox.height).toBeLessThanOrEqual(cookieBox.y);
    expect(cookieBox.x + cookieBox.width).toBeCloseTo(width - 8, 0);
    expect(cookieBox.y + cookieBox.height).toBeCloseTo(height - 8, 0);
    if (width === 1280) await captureVisualAt1280(page, info, "cookie-wizard-actions", height);
    else await page.screenshot({ path: info.outputPath(`cookie-wizard-actions-${width}.png`) });
  }
});
