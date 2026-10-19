import { expect, test, type Page, type Request } from "@playwright/test";
import { gunzipSync } from "node:zlib";

type Packet = { event: string; distinct_id?: string; $set?: { email?: string }; properties: Record<string, unknown> };
const profileEmail = (packet: Packet) => packet.$set?.email ?? (packet.properties.$set as { email?: string } | undefined)?.email;

function packetsFrom(request: Request): Packet[] {
  let buffer = request.postDataBuffer();
  if (!buffer?.length) return [];
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) buffer = gunzipSync(buffer);
  let text = buffer.toString("utf8");
  if (text.startsWith("data=")) text = Buffer.from(new URLSearchParams(text).get("data")!, "base64").toString("utf8");
  const value = JSON.parse(text);
  return Array.isArray(value) ? value : value.batch ?? (value.event ? [value] : []);
}

const captured = new WeakMap<Page, Packet[]>();
const id = (packet: Packet) => packet.distinct_id ?? packet.properties.distinct_id;
test.use({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36" });
test.beforeEach(async ({ page }) => {
  const packets: Packet[] = [];
  captured.set(page, packets);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
  });
  await page.route(/https:\/\/[^/]*posthog\.com\//, async (route) => {
    packets.push(...packetsFrom(route.request()));
    await route.fulfill({ json: { status: 1 } });
  });
  await page.route("**/_vercel/insights/**", (route) => route.fulfill({ body: "" }));
  await page.route("**/api/**", (route) => route.fulfill({ json: { items: [], emailCount: 0 } }));
});

async function capture(page: Page) {
  const packets = captured.get(page)!;
  const count = packets.filter((packet) => packet.event === "campaign_preview_opened").length;
  await page.getByRole("button", { name: "Capturer un événement fictif" }).click();
  await expect.poll(() => packets.filter((packet) => packet.event === "campaign_preview_opened").length).toBe(count + 1);
  return packets.filter((packet) => packet.event === "campaign_preview_opened").at(-1)!;
}

test("SDK réel : établissement, route, focus, consentement et compte gardent une identité cohérente", async ({ page }) => {
  await page.goto("/dev/template-rendering-proof?mode=analytics-identity");
  const preferences = page.getByRole("region", { name: "Votre choix de mesure d’audience" });
  expect(captured.get(page)).toEqual([]);
  await preferences.getByRole("button", { name: "Accepter", exact: true }).click();
  expect(id(await capture(page))).toBe("merchant-primary:user-identity-fixture");
  const packets = captured.get(page)!;
  expect(packets.filter((packet) => packet.event === "$identify")).toHaveLength(1);
  expect(packets.some((packet) => profileEmail(packet) === "fixture@example.test")).toBe(true);
  const profileUpdates = packets.filter(profileEmail).length;
  await page.getByRole("button", { name: "Changer d’établissement" }).click();
  const second = await capture(page);
  expect(id(second)).toBe("merchant-primary:user-identity-fixture");
  expect(second.properties.merchantId).toBe("merchant-location-b");
  expect(packets.filter((packet) => packet.event === "$identify")).toHaveLength(1);
  expect(packets.filter(profileEmail)).toHaveLength(profileUpdates);
  await page.getByRole("button", { name: "Modifier l’e-mail fictif" }).click();
  expect(id(await capture(page))).toBe("merchant-primary:user-identity-fixture");
  expect(profileEmail(packets.filter(profileEmail).at(-1)!)).toBe("updated-fixture@example.test");
  expect(packets.filter(profileEmail)).toHaveLength(profileUpdates + 1);

  await page.getByRole("button", { name: "Simuler une identité effacée" }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  expect(id(await capture(page))).toBe("merchant-primary:user-identity-fixture");
  expect(packets.filter((packet) => packet.event === "$identify")).toHaveLength(2);
  await page.getByRole("button", { name: "Simuler une identité effacée" }).click();
  await page.evaluate(() => window.history.pushState({}, "", "/dev/identity-route"));
  expect(id(await capture(page))).toBe("merchant-primary:user-identity-fixture");

  await page.getByRole("button", { name: "Gérer les cookies" }).click();
  await preferences.getByRole("button", { name: "Refuser", exact: true }).click();
  const count = packets.length;
  await page.getByRole("button", { name: "Capturer un événement fictif" }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  expect(packets).toHaveLength(count);
  await page.getByRole("button", { name: "Gérer les cookies" }).click();
  await preferences.getByRole("button", { name: "Accepter", exact: true }).click();
  expect(id(await capture(page))).toBe("merchant-primary:user-identity-fixture");

  await page.getByRole("button", { name: "Changer d’utilisateur fictif" }).click();
  expect(id(await capture(page))).toBe("merchant-other-account:user-other-fixture");
  const identify = packets.filter((packet) => packet.event === "$identify").at(-1)!;
  expect(identify.properties.$anon_distinct_id).not.toBe("merchant-primary:user-identity-fixture");
  expect(packets.some((packet) => packet.event === "$create_alias")).toBe(false);
  expect(profileEmail(identify)).toBe("other-fixture@example.test");
  expect(JSON.stringify(packets.filter((packet) => !["$identify", "$set"].includes(packet.event)))).not.toContain("fixture@example.test");
});

test("SDK réel : connexion par mot de passe identifiée avant login_completed et redirection", async ({ page }) => {
  await page.route("**/api/auth/signin", (route) => route.fulfill({ json: {
    merchant: { id: "merchant-location-b", onboardingCompleted: true },
    user: { id: "user-login-fixture", merchantId: "merchant-primary", email: "login@example.test" },
  } }));
  await page.goto("/connexion");
  await page.getByRole("button", { name: "Accepter", exact: true }).click();
  await page.getByPlaceholder("Email", { exact: true }).fill("login@example.test");
  await page.getByPlaceholder("Mot de passe", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  const packets = captured.get(page)!;
  await expect.poll(() => packets.some((packet) => packet.event === "login_completed")).toBe(true);
  const login = packets.find((packet) => packet.event === "login_completed")!;
  expect(id(login)).toBe("merchant-primary:user-login-fixture");
  expect(login.properties.merchantId).toBe("merchant-location-b");
  expect(packets.findIndex((packet) => packet.event === "$identify")).toBeLessThan(packets.indexOf(login));
  expect(packets.some((packet) => profileEmail(packet) === "login@example.test")).toBe(true);
  expect(JSON.stringify(login)).not.toContain("login@example.test");
});

test("SDK réel : session déjà ouverte, premier événement métier sous le compte principal", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "okado_analytics_consent", value: encodeURIComponent(JSON.stringify({
    version: "2026-10-15", choice: "accepted", decidedAt: Date.now(),
  })), url: baseURL! }]);
  await page.goto("/dev/template-rendering-proof?mode=analytics-identity");
  const packets = captured.get(page)!;
  await expect.poll(() => packets.some((packet) => packet.event === "campaign_creation_started")).toBe(true);
  const first = packets.find((packet) => packet.event === "campaign_creation_started")!;
  expect(id(first)).toBe("merchant-primary:user-identity-fixture");
  expect(first.properties.merchantId).toBe("merchant-location-a");
  expect(packets.filter((packet) => packet.event === "$identify")).toHaveLength(1);
});
