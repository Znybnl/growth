import { expect, test, type Page, type Request } from "@playwright/test";
import { gunzipSync } from "node:zlib";
import { APPLICATION_ANALYTICS_PAGES } from "../src/lib/analytics-routes";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";
import { selectWizardStep } from "./helpers/wizard-step";
import { captureVisualAt1280 } from "./helpers/visual-1280";

type Packet = { event: string; properties: Record<string, unknown> };
const captured = new WeakMap<Page, Packet[]>();
function packetsFrom(request: Request): Packet[] {
  let buffer = request.postDataBuffer();
  if (!buffer?.length) return [];
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) buffer = gunzipSync(buffer);
  let text = buffer.toString("utf8");
  if (text.startsWith("data=")) text = Buffer.from(new URLSearchParams(text).get("data")!, "base64").toString("utf8");
  const value = JSON.parse(text);
  return Array.isArray(value) ? value : value.batch ?? (value.event ? [value] : []);
}
const events = (page: Page, event: string) => captured.get(page)!.filter(packet => packet.event === event);
async function consent(page: Page, baseURL: string) {
  await page.context().addCookies([{ name: ANALYTICS_CONSENT_COOKIE, url: baseURL,
    value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "accepted", decidedAt: Date.now() })) }]);
}
test.use({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36" });
test.beforeEach(async ({ page }) => {
  captured.set(page, []);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
  });
  await page.route(/https:\/\/[^/]*posthog\.com\//, async route => {
    captured.get(page)!.push(...packetsFrom(route.request()));
    await route.fulfill({ json: { status: 1 } });
  });
  await page.route("**/_vercel/insights/**", route => route.fulfill({ body: "" }));
  await page.route("**/api/**", async route => {
    const url = route.request().url();
    const body = route.request().method() === "POST" ? route.request().postDataJSON() ?? {} : {};
    if (url.includes("gain-notifications")) return route.fulfill({ json: { frequencies: body.frequencies ?? [], updatedAt: null } });
    if (url.includes("reward-reminders")) return route.fulfill({ json: { enabled: body.enabled ?? false, days: body.days ?? 7, canEdit: true } });
    return route.fulfill({ json: { items: [], suggestions: [], assets: {}, emailCount: 0, campaign: { actions: [] } } });
  });
});

test("every page family has a safe SDK pageview; no dynamic ID, query or fragment is transmitted", async ({ page, baseURL }) => {
  await consent(page, baseURL!);
  await page.goto("/dev/tracking-coverage");
  await expect.poll(() => events(page, "$pageview").length).toBeGreaterThan(0);
  await expect.poll(() => events(page, "campaign_wizard_step_viewed").length).toBeGreaterThan(0);
  for (const template of APPLICATION_ANALYTICS_PAGES) {
    const before = events(page, "$pageview").length;
    const path = template.replace(/\[(id|code)\]/g, "private-entity@example.test");
    await page.evaluate(path => window.history.pushState({}, "", path + "?email=private-email@example.test&previewToken=private-token#private-fragment"), path);
    await expect.poll(() => events(page, "$pageview").length).toBeGreaterThan(before);
    await expect.poll(() => events(page, "$pageview").at(-1)!.properties.page).toBe(template);
  }
  const payloads = JSON.stringify(events(page, "$pageview"));
  expect(payloads).not.toMatch(/private-entity|private-email|private-token|private-fragment/);
  await page.evaluate(() => window.history.pushState({}, "", "/campaign/private-id?preview=1&previewToken=private-token"));
  await expect.poll(() => events(page, "$pageview").at(-1)!.properties.pageMode).toBe("preview");
});

test("step tracking waits for consent, ignores render/focus and measures only the current step after acceptance", async ({ page }) => {
  await page.goto("/dev/tracking-coverage");
  await page.getByRole("button", { name: "Changer d’étape fictive" }).click();
  expect(captured.get(page)).toEqual([]);
  await page.getByRole("button", { name: "Accepter", exact: true }).click();
  await expect.poll(() => events(page, "campaign_wizard_step_viewed").map(packet => packet.properties.stepKey)).toEqual(["prizes"]);
  await page.getByRole("button", { name: "Actualiser le rendu fictif" }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  expect(events(page, "campaign_wizard_step_viewed")).toHaveLength(1);
  await page.getByRole("button", { name: "Changer d’étape fictive" }).click();
  await expect.poll(() => events(page, "campaign_wizard_step_viewed").map(packet => packet.properties.stepKey)).toEqual(["prizes", "game"]);
  await page.getByRole("button", { name: "Gérer les cookies", exact: true }).click();
  await page.getByRole("button", { name: "Refuser", exact: true }).click();
  const count = captured.get(page)!.length;
  await page.getByRole("button", { name: "Changer d’étape fictive" }).click();
  expect(captured.get(page)).toHaveLength(count);
  await page.getByRole("button", { name: "Gérer les cookies", exact: true }).click();
  await page.getByRole("button", { name: "Accepter", exact: true }).click();
  await expect.poll(() => events(page, "campaign_wizard_step_viewed").at(-1)!.properties.stepKey).toBe("prizes");
});

test("actual wizard emits its five steps and only successful Continue transitions @visual-1280", async ({ page, baseURL }, info) => {
  await consent(page, baseURL!);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=beauty-nude");
  for (const [index, key] of ["game", "identity", "appearance", "prizes", "action"].entries()) {
    if (index) await selectWizardStep(page, index);
    await expect.poll(() => events(page, "campaign_wizard_step_viewed").at(-1)?.properties.stepKey).toBe(key);
    if (key === "prizes") {
      await page.getByRole("button", { name: "Trouver des idées de lots", exact: true }).click();
      await expect.poll(() => events(page, "prize_library_step_viewed").at(-1)?.properties.stepKey).toBe("suggestions");
      await page.getByRole("tab", { name: "Mes lots", exact: true }).click();
      await expect.poll(() => events(page, "prize_library_step_viewed").at(-1)?.properties.stepKey).toBe("mine");
      await page.keyboard.press("Escape");
    }
  }
  await captureVisualAt1280(page, info, "tracking-wizard-action", 720);
  await captureVisualAt1280(page, info, "tracking-wizard-action", 600);
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-create&template=beauty-nude");
  await expect.poll(() => events(page, "campaign_creation_started").length).toBe(1);
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect.poll(() => events(page, "campaign_wizard_step_completed").at(-1)?.properties.stepKey).toBe("game");
  await page.getByLabel(/Promesse affichée au client/).fill("");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect.poll(() => events(page, "campaign_wizard_validation_failed").at(-1)?.properties.stepKey).toBe("identity");
  expect(events(page, "campaign_wizard_step_completed")).toHaveLength(1);
  await page.route("**/api/campaigns/setup", route => route.fulfill({ status: 500, json: { error: "private-error@example.test" } }));
  await page.getByTestId("wizard-footer").getByRole("button", { name: /Enregistrer/ }).click();
  await expect.poll(() => events(page, "campaign_save_failed").length).toBe(1);
  expect(JSON.stringify(events(page, "campaign_save_failed"))).not.toMatch(/private|@/);
});

test("late consent in a started wizard measures the current step without inventing an earlier creation start", async ({ page }) => {
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-create&template=beauty-nude");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  expect(captured.get(page)).toEqual([]);
  await page.getByRole("button", { name: "Accepter", exact: true }).click();
  await expect.poll(() => events(page, "campaign_wizard_step_viewed").map(packet => packet.properties.stepKey)).toEqual(["identity"]);
  expect(events(page, "campaign_creation_started")).toHaveLength(0);
});

test("account tabs, preferences and results selection are measurable without field contents", async ({ page, baseURL }) => {
  await consent(page, baseURL!);
  await page.goto("/dev/template-rendering-proof?mode=account-marketing");
  for (const [label, key] of [["Établissement", "establishment"], ["Utilisateur", "user"], ["Abonnement", "subscription"]]) {
    await page.getByRole("tab", { name: label, exact: true }).click();
    await expect.poll(() => events(page, "account_tab_viewed").at(-1)?.properties.stepKey).toBe(key);
  }
  await page.goto("/dev/tracking-coverage");
  await page.getByRole("checkbox", { name: "À chaque gain" }).check();
  await page.getByRole("button", { name: "Enregistrer les notifications", exact: true }).click();
  await expect.poll(() => events(page, "notification_preferences_saved").length).toBe(1);
  await page.getByRole("checkbox", { name: "Relancer les gagnants avant l’expiration de leur gain" }).check();
  await page.getByRole("button", { name: "Enregistrer la relance", exact: true }).click();
  await expect.poll(() => events(page, "notification_preferences_saved").length).toBe(2);
  await page.getByRole("button", { name: /Jeu fictif A/ }).click();
  await page.getByRole("option", { name: /Jeu fictif B/ }).click();
  await expect.poll(() => events(page, "results_campaign_selected").length).toBe(1);
  expect(JSON.stringify(events(page, "notification_preferences_saved"))).not.toMatch(/@|fr[eé]quence|notificationEmail/);
});

test("a deep-linked account tab does not report the server fallback tab as viewed", async ({ page, baseURL }) => {
  await consent(page, baseURL!);
  await page.goto("/dev/template-rendering-proof?mode=account-marketing#account-user");
  await expect.poll(() => events(page, "account_tab_viewed").map(packet => packet.properties.stepKey)).toEqual(["user"]);
});

test("upload and file preparations distinguish success, error and cancellation, without private messages", async ({ page, baseURL }) => {
  await consent(page, baseURL!);
  await page.goto("/dev/tracking-coverage");
  await page.route("**/api/merchant/images", route => route.fulfill({ json: { image: { url: "/private-logo", bytes: 100, width: 10, height: 10 } } }));
  const file = { name: "private-email@example.test.png", mimeType: "image/png", buffer: Buffer.from("fixture") };
  await page.getByLabel("Logo fictif").setInputFiles(file);
  await expect.poll(() => events(page, "merchant_image_upload_completed").length).toBe(1);
  await page.route("**/api/merchant/images", route => route.fulfill({ status: 500, json: { error: "private-error@example.test" } }));
  await page.getByLabel("Logo fictif").setInputFiles({ ...file, name: "private-second.png" });
  await expect.poll(() => events(page, "merchant_image_upload_failed").length).toBe(1);
  await page.getByRole("button", { name: "Préparation réussie", exact: true }).click();
  await expect.poll(() => events(page, "file_preparation_completed").length).toBe(1);
  await page.getByRole("button", { name: "Fermer le téléchargement" }).click();
  await page.getByRole("button", { name: "Préparation échouée", exact: true }).click();
  await expect.poll(() => events(page, "file_preparation_failed").length).toBe(1);
  await page.getByRole("button", { name: "Fermer le téléchargement" }).click();
  await page.getByRole("button", { name: "Préparation à annuler", exact: true }).click();
  await page.getByRole("button", { name: "Fermer le téléchargement" }).click();
  await expect.poll(() => events(page, "file_preparation_canceled").length).toBe(1);
  expect(events(page, "file_preparation_completed")).toHaveLength(1);
  const tracked = captured.get(page)!.filter(packet => /^(merchant_image|file_preparation)/.test(packet.event));
  expect(JSON.stringify(tracked)).not.toMatch(/private|@|\.png|failure/);
});

test("real game stages and request failure are observable; simulated preview stages stay excluded", async ({ page, baseURL }) => {
  await consent(page, baseURL!);
  await page.goto("/dev/template-rendering-proof?mode=game-preview&template=beauty-nude");
  expect(events(page, "game_stage_viewed")).toHaveLength(0);
  await page.goto("/dev/template-rendering-proof?mode=public&template=beauty-nude");
  await expect.poll(() => events(page, "game_stage_viewed").at(-1)?.properties.stepKey).toBe("idle");
  await page.getByRole("button", { name: "Jouer à la roue" }).click();
  await expect.poll(() => events(page, "game_stage_viewed").at(-1)?.properties.stepKey).toBe("intro");
  await page.route("**/api/public/draw/session", route => route.fulfill({ status: 503, json: { error: "private-error@example.test" } }));
  await page.getByRole("dialog").getByRole("button", { name: /^Jouer(?: maintenant)?$/i }).click();
  await expect.poll(() => events(page, "game_request_failed").length).toBe(1);
  expect(events(page, "game_request_failed")[0].properties.operation).toBe("prepare");
  expect(JSON.stringify(events(page, "game_request_failed"))).not.toMatch(/private|@/);
});

test("Google callback error is observed once without its free-form reason", async ({ page, baseURL }) => {
  await consent(page, baseURL!);
  await page.goto("/connexion?error=google_oauth&reason=private-error@example.test");
  await expect.poll(() => events(page, "login_failed").length).toBe(1);
  expect(events(page, "login_failed")[0].properties.method).toBe("google");
  expect(JSON.stringify(events(page, "login_failed"))).not.toMatch(/private-error|@/);
});

test("email settings success and failure follow the response without message content @visual-1280", async ({ page, baseURL }, info) => {
  await consent(page, baseURL!);
  await page.goto("/dev/template-rendering-proof?mode=email-tracking");
  await page.route("**/api/campaigns/*/email-settings", route => route.fulfill({ json: { success: true } }));
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect.poll(() => events(page, "editor_settings_saved").length).toBe(1);
  await captureVisualAt1280(page, info, "tracking-email-editor", 720);
  await captureVisualAt1280(page, info, "tracking-email-editor", 600);
  await page.route("**/api/campaigns/*/email-settings", route => route.fulfill({ status: 500, json: { error: "PRIVATE CONTENT" } }));
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect.poll(() => events(page, "editor_settings_save_failed").length).toBe(1);
  expect(events(page, "editor_settings_saved")).toHaveLength(1);
  expect(JSON.stringify([...events(page, "editor_settings_saved"), ...events(page, "editor_settings_save_failed")])).not.toMatch(/PRIVATE|Boisson|@/);
});

for (const won of [false, true]) {
  test(`real wheel ${won ? "gain confirmation" : "loss"}: all visible stages, no participant details in packets`, async ({ page, baseURL }) => {
    await consent(page, baseURL!);
    const prize = won ? { id: "reward-ten", label: "PRIVATE PRIZE", probability: 50, purchaseRequired: false } : null;
    await page.route("**/api/public/draw/session", route => route.fulfill({ json: {
      session: { id: "session-fixture", status: "pending", campaignId: "fixture-halloween", createdAt: "2026-10-29T10:00:00Z", expiresAt: "2026-10-29T11:00:00Z" }, prize,
    } }));
    await page.route("**/api/public/draw/finalize", route => route.fulfill({ json: {
      lead: { id: "lead-fixture", campaignId: "fixture-halloween", firstName: "PRIVATE PARTICIPANT", email: "private-player@example.test", status: "claimed", createdAt: "2026-10-29T10:00:00Z" },
      prize, campaign: { actions: [] },
    } }));
    await page.goto("/dev/template-rendering-proof?mode=public&template=beauty-nude");
    await page.getByRole("button", { name: "Jouer à la roue" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^Jouer$/i }).click();
    await expect.poll(() => events(page, "game_stage_viewed").at(-1)?.properties.stepKey, { timeout: 10000 }).toBe(won ? "collect" : "lost");
    if (won) {
      await page.getByPlaceholder("Prénom", { exact: true }).fill("PRIVATE PARTICIPANT");
      await page.getByPlaceholder("E-mail", { exact: true }).fill("private-player@example.test");
      await page.getByRole("button", { name: "Recevoir mon gain", exact: true }).click();
      await expect.poll(() => events(page, "game_stage_viewed").at(-1)?.properties.stepKey).toBe("success");
    }
    expect(events(page, "game_stage_viewed").map(packet => packet.properties.stepKey)).toEqual(won
      ? ["idle", "intro", "ready", "collect", "success"] : ["idle", "intro", "ready", "lost"]);
    expect(JSON.stringify(events(page, "game_stage_viewed"))).not.toMatch(/PRIVATE|private-player|@/);
    expect(events(page, "draw_finalized")).toHaveLength(0); // Success remains server-owned.
  });
}
