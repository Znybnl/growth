import { expect, test, type BrowserContext, type Page, type Request } from "@playwright/test";
import { gunzipSync } from "node:zlib";
import { captureVisualAt1280, assertNoPageOverflow } from "./helpers/visual-1280";

type Packet = { event: string; distinct_id?: string; properties: Record<string, unknown> };
const accountId = "merchant-onboarding-fixture:user-onboarding-fixture";
const captured = new WeakMap<Page, Packet[]>();
const eventId = (packet: Packet) => packet.distinct_id ?? packet.properties.distinct_id;
const onboarding = (page: Page) => captured.get(page)!.filter(packet => packet.event.startsWith("onboarding_"));

function packetsFrom(request: Request): Packet[] {
  let buffer = request.postDataBuffer();
  if (!buffer?.length) return [];
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) buffer = gunzipSync(buffer);
  let body = buffer.toString("utf8");
  if (body.startsWith("data=")) body = Buffer.from(new URLSearchParams(body).get("data")!, "base64").toString("utf8");
  const value = JSON.parse(body);
  return Array.isArray(value) ? value : value.batch ?? (value.event ? [value] : []);
}

test.use({ viewport: { width: 1280, height: 720 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36" });

test.beforeEach(async ({ page }) => {
  const packets: Packet[] = [];
  captured.set(page, packets);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
  });
  await page.route(/https:\/\/[^/]*posthog\.com\//, async route => {
    packets.push(...packetsFrom(route.request()));
    await route.fulfill({ json: { status: 1 } });
  });
  await page.route("**/_vercel/insights/**", route => route.fulfill({ body: "" }));
  await page.route("**/api/**", route => route.fulfill({ json: { items: [], results: [] } }));
});

async function acceptBeforeVisit(context: BrowserContext, baseURL: string) {
  await context.addCookies([{ name: "okado_analytics_consent", url: baseURL,
    value: encodeURIComponent(JSON.stringify({ version: "2026-10-15", choice: "accepted", decidedAt: Date.now() })) }]);
}

async function fillProfile(page: Page) {
  await page.getByLabel("Nom de l’enseigne").fill("PRIVATE_STORE_FIXTURE");
  await page.getByLabel("Secteur d’activité").selectOption("Beauté");
  await page.getByLabel("Ville /").fill("PRIVATE_CITY_FIXTURE");
}

async function reachPin(page: Page) {
  await fillProfile(page);
  await page.getByRole("button", { name: "Étape suivante" }).click();
  await expect(page.getByRole("heading", { name: "Liens repris dans vos campagnes" })).toBeVisible();
  await page.getByRole("button", { name: "Étape suivante" }).click();
  await expect(page.getByLabel("PIN de validation du retrait")).toBeVisible();
}

function expectPrivateInputsAbsent(page: Page) {
  expect(JSON.stringify(onboarding(page))).not.toMatch(/PRIVATE_|"9462"|onboarding@example\.test/);
  for (const event of onboarding(page)) {
    expect(eventId(event)).toBe(accountId);
    expect(event.properties.merchantUserId).toBe("user-onboarding-fixture");
  }
}

test("Google landing screen: anonymous history joined before onboarding steps and successful save @visual-1280", async ({ page, context, baseURL }, info) => {
  await acceptBeforeVisit(context, baseURL!);
  await page.goto("/connexion");
  const packets = captured.get(page)!;
  await expect.poll(() => packets.some(packet => packet.event === "$pageview")).toBe(true);
  const anonymousId = eventId(packets.find(packet => packet.event === "$pageview")!);
  await page.goto("/dev/onboarding-tracking");
  await expect.poll(() => onboarding(page).filter(packet => packet.event === "onboarding_started").length).toBe(1);
  const identified = packets.find(packet => packet.event === "$identify")!;
  expect(identified.properties.$anon_distinct_id).toBe(anonymousId);
  const start = onboarding(page).find(packet => packet.event === "onboarding_started")!;
  expect(packets.indexOf(identified)).toBeLessThan(packets.indexOf(start));

  await fillProfile(page);
  await captureVisualAt1280(page, info, "onboarding-profile");
  await page.getByRole("button", { name: "Étape suivante" }).click();
  await page.getByLabel("Instagram").fill("https://instagram.com/PRIVATE_LINK_FIXTURE");
  await captureVisualAt1280(page, info, "onboarding-links");
  await page.getByRole("button", { name: "Étape suivante" }).click();
  await page.getByLabel("PIN de validation du retrait").fill("9462");
  await captureVisualAt1280(page, info, "onboarding-pin");

  let savedPin: unknown;
  await page.route("**/api/onboarding", route => {
    savedPin = route.request().postDataJSON().redemptionPin;
    return route.fulfill({ json: { merchant: { onboardingCompleted: true } } });
  });
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect.poll(() => onboarding(page).filter(packet => packet.event === "onboarding_step_completed").length).toBe(3);
  expect(savedPin).toBe("9462");
  expect(onboarding(page).filter(packet => packet.event === "onboarding_step_viewed").map(packet => packet.properties.step)).toEqual(["profil", "reseaux", "pin"]);
  expect(onboarding(page).some(packet => packet.event === "onboarding_completed")).toBe(false);
  expectPrivateInputsAbsent(page);
});

test("refusal, late consent, withdrawal and focus keep tracking optional and deduplicated", async ({ page }) => {
  await page.goto("/dev/onboarding-tracking");
  await page.getByRole("button", { name: "Refuser", exact: true }).click();
  await page.getByRole("button", { name: "Étape suivante" }).click();
  await expect(page.getByText("Renseignez le nom de l’enseigne pour continuer.")).toBeVisible();
  expect(captured.get(page)).toEqual([]);
  await page.getByRole("button", { name: "Gérer les cookies" }).click();
  await page.getByRole("button", { name: "Accepter", exact: true }).click();
  await expect.poll(() => onboarding(page).filter(packet => packet.event === "onboarding_started").length).toBe(1);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(onboarding(page).filter(packet => packet.event === "onboarding_started")).toHaveLength(1);
  expect(onboarding(page).filter(packet => packet.event === "onboarding_step_viewed")).toHaveLength(1);
  await page.getByRole("button", { name: "Gérer les cookies" }).click();
  await page.getByRole("button", { name: "Refuser", exact: true }).click();
  const count = captured.get(page)!.length;
  await fillProfile(page);
  await page.getByRole("button", { name: "Étape suivante" }).click();
  await expect(page.getByRole("heading", { name: "Liens repris dans vos campagnes" })).toBeVisible();
  expect(captured.get(page)).toHaveLength(count);
  await page.getByRole("button", { name: "Gérer les cookies" }).click();
  await page.getByRole("button", { name: "Accepter", exact: true }).click();
  await expect.poll(() => onboarding(page).filter(packet => packet.event === "onboarding_step_viewed").map(packet => packet.properties.step)).toEqual(["profil", "reseaux"]);
  expect(onboarding(page).filter(packet => packet.event === "onboarding_started")).toHaveLength(1);
  expectPrivateInputsAbsent(page);
});

test("mobile: validation, HTTP, malformed response and network failures have stable codes without input values", async ({ page, context, baseURL }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await acceptBeforeVisit(context, baseURL!);
  await page.goto("/dev/onboarding-tracking");
  await expect.poll(() => onboarding(page).some(packet => packet.event === "onboarding_started")).toBe(true);
  await page.getByRole("button", { name: "Étape suivante" }).click();
  await reachPin(page);
  await page.getByLabel("PIN de validation du retrait").fill("");
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect(page.getByText("Le code PIN doit contenir exactement 4 chiffres.")).toBeVisible();
  await assertNoPageOverflow(page);
  await page.screenshot({ path: info.outputPath("onboarding-mobile-error-390.png"), fullPage: true });
  await page.getByLabel("PIN de validation du retrait").fill("9462");
  for (const failure of ["http_error", "invalid_response", "network_error"] as const) {
    await page.route("**/api/onboarding", route => failure === "network_error" ? route.abort("failed")
      : failure === "http_error" ? route.fulfill({ status: 500, json: { error: "PRIVATE_SERVER_ERROR_FIXTURE" } })
        : route.fulfill({ status: 200, contentType: "application/json", body: "invalid json" }));
    await page.getByRole("button", { name: "Terminer", exact: true }).click();
    await expect.poll(() => onboarding(page).some(packet => packet.properties.errorType === failure)).toBe(true);
  }
  const failures = onboarding(page).filter(packet => packet.event === "onboarding_failed");
  expect(failures.map(packet => [packet.properties.step, packet.properties.errorType])).toEqual([
    ["profil", "validation"], ["pin", "validation"], ["pin", "http_error"],
    ["pin", "invalid_response"], ["pin", "network_error"],
  ]);
  expect(onboarding(page).filter(packet => packet.event === "onboarding_step_completed").map(packet => packet.properties.step)).toEqual(["profil", "reseaux"]);
  expectPrivateInputsAbsent(page);
});
