import { expect, test, type Page } from "@playwright/test";
import { gunzipSync } from "node:zlib";
import {
  ANALYTICS_CONSENT_COOKIE,
  ANALYTICS_CONSENT_VERSION,
} from "../src/lib/analytics-consent";

type CapturedEvent = { event: string; properties: Record<string, unknown> };

// Exercise the real SDK with synthetic data. No packet reaches PostHog.
test.use({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
});
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
  });
  await page.route("**/_vercel/insights/**", (route) =>
    route.fulfill({ status: 200, body: "" }),
  );
});

async function capturePackets(page: Page) {
  const events: CapturedEvent[] = [];
  await page.route(/https:\/\/[^/]*posthog\.com\//, async (route) => {
    const request = route.request();
    let body = request.postDataBuffer();
    if (body?.length) {
      if (body[0] === 0x1f && body[1] === 0x8b) body = gunzipSync(body);
      let value = body.toString();
      if (value.startsWith("data=")) {
        const encoded = new URLSearchParams(value).get("data")!;
        value =
          encoded.startsWith("{") || encoded.startsWith("[")
            ? encoded
            : Buffer.from(encoded, "base64").toString();
      }
      const payload = JSON.parse(value);
      events.push(
        ...(Array.isArray(payload) ? payload : (payload.batch ?? [payload])),
      );
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"status":1}',
    });
  });
  return events;
}

async function accept(page: Page) {
  await page
    .getByRole("button", { name: "Gérer les cookies", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Votre choix de mesure d’audience" })
    .getByRole("button", { name: "Accepter", exact: true })
    .click();
}

test("blog : refus et retrait bloquent la mesure ; les articles publics restent identifiables après accord", async ({ page }) => {
  const events = await capturePackets(page);
  await page.goto("/blog?email=private%40example.test&token=secret#private");
  const preferences = page.getByRole("region", { name: "Votre choix de mesure d’audience" });
  await preferences.getByRole("button", { name: "Refuser", exact: true }).click();
  await page.goto("/blog/animation-commerciale-institut-beaute");
  await expect(page.locator("h1")).toBeVisible();
  expect(events).toHaveLength(0);

  await accept(page);
  await expect.poll(() => events.some(event => event.event === "$pageview" &&
    event.properties.page === "/blog/animation-commerciale-institut-beaute")).toBe(true);
  for (const path of ["/blog", "/blog/attirer-clients-fleuriste", "/blog/animation-magasin-velos-journee-decouverte"]) {
    await page.goto(path + "?utm_source=fixture&email=private%40example.test&token=secret#private");
    await expect.poll(() => events.some(event => event.event === "$pageview" && event.properties.page === path)).toBe(true);
  }
  await page.goto("/blog/private-fixture@example.test?token=secret");
  await expect.poll(() => events.some(event => event.event === "$pageview" && event.properties.page === "/other")).toBe(true);
  expect(JSON.stringify(events)).not.toMatch(/private-fixture|private@|email=|token=|#private|referrer|current_url/);

  await page.getByRole("button", { name: "Gérer les cookies", exact: true }).click();
  await preferences.getByRole("button", { name: "Refuser", exact: true }).click();
  const afterWithdrawal = events.length;
  await page.goto("/blog/idees-animations-commerciales-boutique");
  await expect(page.locator("h1")).toBeVisible();
  expect(events).toHaveLength(afterWithdrawal);
});

test("blog : une découverte produit n'est pas un essai ; le vrai lien d'inscription garde son contexte", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE, value: encodeURIComponent(JSON.stringify({
    version: ANALYTICS_CONSENT_VERSION, choice: "accepted", decidedAt: Date.now(),
  })), url: baseURL! }]);
  const events = await capturePackets(page);
  await page.route("https://app.okado.app/**", route => route.fulfill({
    status: 200, contentType: "text/html", body: "<h1>Inscription simulée localement</h1>",
  }));
  await page.goto("/blog/animation-commerciale-institut-beaute");
  await page.getByRole("link", { name: "Imaginer une animation à votre image", exact: true }).click();
  await expect.poll(() => events.filter(event => event.event === "marketing_cta_clicked").length).toBe(1);
  expect(events.find(event => event.event === "marketing_cta_clicked")!.properties).toMatchObject({
    cta: "explore_product", location: "blog_article",
    page: "/blog/animation-commerciale-institut-beaute", destination: "/instituts-beaute",
  });
  expect(events.some(event => event.event === "marketing_cta_clicked" && event.properties.cta === "start_trial")).toBe(false);

  await page.goto("/blog/idees-animations-commerciales-boutique?utm_source=fixture&utm_campaign=blog_measurement");
  await page.getByRole("main").getByRole("link", { name: "Essayer Okado", exact: true }).click();
  await expect.poll(() => events.filter(event => event.event === "marketing_cta_clicked" &&
    event.properties.cta === "start_trial").length).toBe(1);
  expect(events.find(event => event.event === "marketing_cta_clicked" && event.properties.cta === "start_trial")!.properties).toMatchObject({
    page: "/blog/idees-animations-commerciales-boutique", location: "blog_article",
    destination: "/inscription", utmSource: "fixture", utmCampaign: "blog_measurement",
    consentVersion: ANALYTICS_CONSENT_VERSION,
  });
});

test("les nouveaux clics modèles et spécialités gardent le contexte de consentement", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE, value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "accepted", decidedAt: Date.now() })), url: baseURL! }]);
  const events = await capturePackets(page);
  await page.goto("/?utm_source=fixture&utm_medium=test&utm_campaign=site_601");
  await page.getByRole("button", { name: "Voir le modèle Nude Élégance — Ticket à gratter", exact: true }).click();
  await expect.poll(() => events.filter(event => event.event === "marketing_cta_clicked").length).toBe(1);
  expect(events.find(event => event.event === "marketing_cta_clicked")!.properties).toMatchObject({ cta: "model_preview", location: "models", variant: "beauty-scratch-nude", page: "/", utmSource: "fixture", consentVersion: ANALYTICS_CONSENT_VERSION });
  await page.keyboard.press("Escape");
  await page.goto("/instituts-beaute");
  await page.getByRole("tab", { name: "Regard · cils & sourcils", exact: true }).click();
  await page.getByRole("tabpanel").getByRole("link", { name: "Essayer cet exemple" }).click();
  await expect.poll(() => events.filter(event => event.event === "marketing_cta_clicked" && event.properties.cta === "sector_demo").length).toBe(1);
  expect(events.find(event => event.event === "marketing_cta_clicked" && event.properties.cta === "sector_demo")!.properties).toMatchObject({ variant: "eyes", page: "/instituts-beaute", destination: "/instituts-beaute", consentVersion: ANALYTICS_CONSENT_VERSION });
});

test("les choix multisectoriels et le ticket conservent les UTM sans transmettre les saisies", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE, value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "accepted", decidedAt: Date.now() })), url: baseURL! }]);
  const events = await capturePackets(page);
  await page.goto("/?utm_source=fixture&utm_campaign=multisector_607");
  // The compact layout is visible before the lazily loaded analytics SDK.
  await expect.poll(() => events.filter(event => event.event === "$pageview").length).toBeGreaterThan(0);
  await page.getByRole("navigation", { name: "Activité de la démo" }).getByRole("link", { name: "Boutiques & commerces" }).click();
  await expect.poll(() => events.filter(event => event.event === "marketing_cta_clicked" && event.properties.cta === "select_demo_sector").length).toBe(1);
  await page.locator("#fonctionnalites").getByRole("button", { name: "Commerce", exact: true }).click();
  const demo = page.locator("#demo");
  await demo.getByRole("button", { name: "Jouer", exact: true }).click();
  await demo.getByRole("button", { name: "Jouer maintenant" }).click();
  await demo.getByRole("button", { name: "Révéler le ticket" }).click();
  await demo.getByLabel("Prénom de démonstration").fill("Private retail fixture");
  await demo.getByLabel("E-mail de démonstration").fill("private-retail@example.test");
  await demo.getByRole("button", { name: "Recevoir mon gain" }).click();
  await expect.poll(() => events.filter(event => event.event === "marketing_demo_completed").length).toBe(1);
  for (const cta of ["select_demo_sector", "select_gift_sector"]) {
    expect(events.find(event => event.event === "marketing_cta_clicked" && event.properties.cta === cta)?.properties).toMatchObject({ variant: "retail", page: "/", utmSource: "fixture", utmCampaign: "multisector_607", consentVersion: ANALYTICS_CONSENT_VERSION });
  }
  for (const name of ["marketing_demo_started", "marketing_demo_completed"]) {
    expect(events.filter(event => event.event === name)).toHaveLength(1);
    expect(events.find(event => event.event === name)?.properties).toMatchObject({ variant: "retail", page: "/", utmSource: "fixture" });
  }
  expect(JSON.stringify(events)).not.toMatch(/Private retail|private-retail|#demo-retail/);
  await page.goto("/instituts-beaute?utm_source=fixture#demo-eyes");
  await page.locator("#demo").getByRole("button", { name: "Jouer", exact: true }).click();
  await expect.poll(() => events.filter(event => event.event === "marketing_demo_started" && event.properties.specialty === "eyes").length).toBe(1);
});

test("une tentative de démo produit un début et une fin, pas les retours ou le reset", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(60000);
  await context.addCookies([
    {
      name: ANALYTICS_CONSENT_COOKIE,
      value: encodeURIComponent(
        JSON.stringify({
          version: ANALYTICS_CONSENT_VERSION,
          choice: "accepted",
          decidedAt: Date.now(),
        }),
      ),
      url: baseURL!,
    },
  ]);
  const events = await capturePackets(page);
  for (const path of ["/", "/restaurants", "/instituts-beaute"]) {
    await page.goto(
      path +
        "?utm_source=fixture&utm_medium=test&utm_campaign=conversion_507&email=private%40example.test#secret",
    );
    const demo = page.locator("#demo");
    const counts = () =>
      ["marketing_demo_started", "marketing_demo_completed"].map(
        (name) =>
          events.filter(
            (event) => event.event === name && event.properties.page === path,
          ).length,
      );
    await demo.getByRole("button", { name: "Jouer", exact: true }).click();
    await expect.poll(counts).toEqual([1, 0]);
    await demo.getByRole("button", { name: "Écrire un avis" }).click();
    await demo.getByRole("radio", { name: "1 étoile", exact: true }).check();
    await demo.getByRole("button", { name: "Revenir au jeu" }).click();
    await page.getByLabel("Prénom de démonstration").fill("Private fixture");
    await page
      .getByLabel("E-mail de démonstration")
      .fill("private@example.test");
    await demo.getByRole("button", { name: "Recevoir mon gain" }).click();
    await expect.poll(counts).toEqual([1, 1]);
    await demo.getByRole("button", { name: "Voir l’e-mail" }).click();
    await demo
      .getByRole("button", { name: "Revenir à la confirmation" })
      .click();
    await demo.getByRole("button", { name: "Redémarrer la démo" }).click();
    expect(counts()).toEqual([1, 1]);
    await demo.getByRole("button", { name: "Jouer", exact: true }).click();
    await expect.poll(counts).toEqual([2, 1]);
    await demo.getByRole("button", { name: "Jouer maintenant" }).click();
    await demo.getByRole("button", { name: "Recevoir mon gain" }).click();
    await expect.poll(counts).toEqual([2, 2]);
    const packet = events.find(
      (event) =>
        event.event === "marketing_demo_started" &&
        event.properties.page === path,
    )!;
    expect(packet.properties).toMatchObject({
      variant: path === "/instituts-beaute" ? "beauty" : "restaurant",
      consentVersion: ANALYTICS_CONSENT_VERSION,
      utmSource: "fixture",
      utmMedium: "test",
      utmCampaign: "conversion_507",
      source: "client",
      trackingVersion: "v1",
    });
  }
  expect(JSON.stringify(events)).not.toMatch(
    /private@example|Private fixture|email=|#secret/,
  );
});

test("absence, refus et retrait de consentement bloquent la démo sans replay des clics", async ({
  page,
}) => {
  const events = await capturePackets(page);
  await page.goto("/");
  const demo = page.locator("#demo");
  const starts = () =>
    events.filter((event) => event.event === "marketing_demo_started").length;
  const ends = () =>
    events.filter((event) => event.event === "marketing_demo_completed").length;
  await demo.getByRole("button", { name: "Jouer", exact: true }).click();
  await demo.getByRole("button", { name: "Jouer maintenant" }).click();
  await demo.getByRole("button", { name: "Recevoir mon gain" }).click();
  expect(events).toEqual([]);
  await accept(page);
  await expect
    .poll(() => events.filter((event) => event.event === "$pageview").length)
    .toBeGreaterThan(0);
  expect([starts(), ends()]).toEqual([0, 0]);
  await demo.getByRole("button", { name: "Redémarrer la démo" }).click();
  await demo.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect.poll(starts).toBe(1);
  await page
    .getByRole("button", { name: "Gérer les cookies", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Votre choix de mesure d’audience" })
    .getByRole("button", { name: "Refuser", exact: true })
    .click();
  await demo.getByRole("button", { name: "Jouer maintenant" }).click();
  await demo.getByRole("button", { name: "Recevoir mon gain" }).click();
  expect([starts(), ends()]).toEqual([1, 0]);
});

test("les pages et CTA conservent uniquement le contexte d’acquisition autorisé", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    {
      name: ANALYTICS_CONSENT_COOKIE,
      value: encodeURIComponent(
        JSON.stringify({
          version: ANALYTICS_CONSENT_VERSION,
          choice: "accepted",
          decidedAt: Date.now(),
        }),
      ),
      url: baseURL!,
    },
  ]);
  const events = await capturePackets(page);
  await page.route("https://app.okado.app/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<h1>Destination simulée</h1>",
    }),
  );
  await page.goto(
    "/restaurants?utm_source=fixture&utm_medium=seo&utm_campaign=private%40example.test&token=secret",
  );
  await expect
    .poll(() => events.filter((event) => event.event === "$pageview").length)
    .toBeGreaterThan(0);
  const view = events.find((event) => event.event === "$pageview")!;
  expect(view.properties).toMatchObject({
    page: "/restaurants",
    utmSource: "fixture",
    utmMedium: "seo",
  });
  expect(view.properties.utmCampaign).toBeUndefined();
  await page
    .getByRole("link", { name: "Essai gratuit", exact: true })
    .first()
    .click();
  await expect
    .poll(
      () =>
        events.filter((event) => event.event === "marketing_cta_clicked")
          .length,
    )
    .toBe(1);
  expect(
    events.find((event) => event.event === "marketing_cta_clicked")!.properties,
  ).toMatchObject({
    cta: "start_trial",
    page: "/restaurants",
    destination: "/inscription",
  });
  expect(JSON.stringify(events)).not.toMatch(/private@example|token=secret/);
  await page.goto("/?utm_source=fixture&utm_medium=seo");
  await expect.poll(() => events.filter(event => event.event === "$pageview" && event.properties.page === "/").length).toBeGreaterThan(0);
  await page.getByRole("region", { name: /Donnez à vos clients/ }).getByRole("link", { name: "Essayer gratuitement", exact: true }).click();
  await expect.poll(() => events.filter(event => event.event === "marketing_cta_clicked" && event.properties.location === "hero").length).toBe(1);
  expect(events.find(event => event.event === "marketing_cta_clicked" && event.properties.location === "hero")!.properties).toMatchObject({
    cta: "start_trial", page: "/", location: "hero", destination: "/inscription", utmSource: "fixture", utmMedium: "seo",
  });
});
