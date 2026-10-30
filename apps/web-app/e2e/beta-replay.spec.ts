import { expect, test, type Page, type Request } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { BETA_REPLAY_VERSION, BETA_REPLAY_LEASE_MS } from "../src/lib/beta-replay-contract";

type Packet = { event: string; properties: Record<string, unknown>; distinct_id?: string };
function unpack(value: unknown): unknown {
  if (typeof value === "string" && value.charCodeAt(0) === 31 && value.charCodeAt(1) === 139) {
    return unpack(JSON.parse(gunzipSync(Buffer.from(value, "latin1")).toString("utf8")));
  }
  if (Array.isArray(value)) return value.map(unpack);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, unpack(item)]));
  return value;
}
function packets(request: Request): Packet[] {
  let bytes = request.postDataBuffer();
  if (!bytes?.length) return [];
  if (bytes[0] === 31 && bytes[1] === 139) bytes = gunzipSync(bytes);
  let raw = bytes.toString("utf8");
  if (raw.startsWith("data=")) raw = Buffer.from(new URLSearchParams(raw).get("data")!, "base64").toString("utf8");
  try { const value = JSON.parse(raw); return Array.isArray(value) ? value : value.batch ?? (value.event ? [value] : []); }
  catch { return []; }
}

async function setup(page: Page, enabled = true) {
  const state = { enabled, subject: "merchant-fixture:user-fixture", failure: false, leaseMs: BETA_REPLAY_LEASE_MS, packets: [] as Packet[], requests: [] as string[], outbound: [] as string[], checks: 0 };
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
  });
  await page.route(/https:\/\/[^/]*posthog\.com\//, async route => {
    const url = new URL(route.request().url());
    state.requests.push(url.pathname);
    let outbound = route.request().postDataBuffer();
    if (outbound?.[0] === 31 && outbound?.[1] === 139) outbound = gunzipSync(outbound);
    state.outbound.push(outbound?.toString("utf8") ?? "");
    if (url.pathname.endsWith("/config.js")) {
      await route.abort("failed"); // Exercise the SDK's JSON configuration fallback offline.
    } else if (url.pathname.endsWith(".js")) {
      const name = url.pathname.split("/").at(-1)!;
      const path = resolve(__dirname, "../../../node_modules/posthog-js/dist", name);
      if (!existsSync(path)) throw new Error(`Missing local SDK extension ${name}`);
      await route.fulfill({ body: readFileSync(path), contentType: "application/javascript" });
    } else if (/flags|decide|config/.test(url.pathname)) {
      await route.fulfill({ json: { featureFlags: {}, sessionRecording: {
        endpoint: "/s/", consoleLogRecordingEnabled: true, sampleRate: null,
        recorderVersion: "v2", networkPayloadCapture: { recordHeaders: true, recordBody: true },
        masking: { maskAllInputs: false, maskTextSelector: null, blockSelector: null },
      } } });
    } else {
      state.packets.push(...packets(route.request()));
      await route.fulfill({ json: { status: 1 } });
    }
  });
  await page.route("**/api/analytics/beta-replay-policy", route => {
    state.checks++;
    const now = Date.now();
    return route.fulfill({ status: state.failure ? 503 : 200, json: {
      enabled: state.enabled, version: BETA_REPLAY_VERSION,
      ...(state.enabled && { subject: state.subject, issuedAt: now, expiresAt: now + state.leaseMs }),
    } });
  });
  await page.route("**/private-logo.png?*", route => route.fulfill({ status: 404, body: "" }));
  await page.route("**/api/dev/replay-private-fixture", route => route.fulfill({ json: { value: "private-response-secret" } }));
  await page.goto("/dev/beta-replay");
  return state;
}

async function open(page: Page) {
  await page.getByRole("button", { name: "Ouvrir la session fictive" }).click();
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
}

async function waitForSnapshots(page: Page, state: Awaited<ReturnType<typeof setup>>) {
  await expect.poll(() => state.packets.filter(p => p.event === "$snapshot").length, { timeout: 20_000 }).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
}

test.use({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36" });

for (const choice of ["absent", "rejected", "accepted"] as const) {
  test(`real SDK: beta replay with ${choice} consent preserves the cookie choice and masks private content`, async ({ page }) => {
    const state = await setup(page);
    if (choice !== "absent") {
      await page.context().addCookies([{ name: "okado_analytics_consent", value: encodeURIComponent(JSON.stringify({ version: "2026-10-15", choice, decidedAt: Date.now() })), url: new URL(page.url()).origin }]);
    }
    const before = (await page.context().cookies()).find(c => c.name === "okado_analytics_consent")?.value;
    await open(page);
    await waitForSnapshots(page, state);
    await page.getByRole("button", { name: "Simuler une requête privée" }).click();
    await page.getByRole("button", { name: "Événement ordinaire fictif" }).click();
    await page.waitForTimeout(3_000);
    const snapshots = state.packets.filter(p => p.event === "$snapshot");
    const decoded = unpack(snapshots);
    const styleNodes: { attrs: Record<string, unknown> }[] = [];
    const inspect = (value: unknown) => {
      if (Array.isArray(value)) { value.forEach(inspect); return; }
      if (value && typeof value === "object") {
        const node = value as Record<string, unknown>;
        if (node.tagName === "link" || node.tagName === "style") styleNodes.push({ attrs: node.attributes as Record<string, unknown> });
        Object.values(node).forEach(inspect);
      }
    };
    inspect(decoded);
    expect(styleNodes.some(node => typeof node.attrs?._cssText === "string" && node.attrs._cssText.length > 100)).toBe(true);
    await test.info().attach("synthetic-snapshots", { body: JSON.stringify(decoded), contentType: "application/json" });
    expect(snapshots.every(p => p.properties.distinct_id === state.subject)).toBe(true);
    const raw = JSON.stringify(decoded);
    if (choice !== "accepted") expect(state.outbound.join(" ")).not.toContain("private-query");
    expect(raw).toContain("childNodes"); // A real DOM snapshot was inspected, not just compressed bytes.
    for (const secret of ["client-secret", "private-input", "9876-private-pin", "private-destination", "private-token", "private-title", "private-image", "private-query", "private-hash", "private-private-container", "private-console-secret", "private-network-secret", "private-response-secret", "private-css-secret"]) {
      expect(raw).not.toContain(secret);
    }
    expect((await page.context().cookies()).find(c => c.name === "okado_analytics_consent")?.value).toBe(before);
    if (choice !== "accepted") {
      expect(state.packets.every(p => p.event === "$snapshot")).toBe(true);
      expect((await page.context().cookies()).some(c => c.name.startsWith("ph_"))).toBe(false);
      expect(await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter(key => key.startsWith("ph_") || key.startsWith("okado_beta_replay")))).toEqual([]);
    } else {
      const ordinary = state.packets.find(p => p.event === "campaign_preview_opened");
      expect(ordinary?.properties.distinct_id ?? ordinary?.distinct_id).toBe(state.subject);
      await page.getByRole("button", { name: "Déconnexion fictive" }).click();
      await page.getByRole("button", { name: "Événement ordinaire fictif" }).click();
      await expect.poll(() => state.packets.filter(p => p.event === "campaign_preview_opened").length).toBe(2);
    }
  });
}

test("noneligible or public phase never loads the recorder", async ({ page }) => {
  const state = await setup(page, false);
  await open(page);
  await expect.poll(() => state.checks).toBeGreaterThan(0);
  expect(state.requests).toEqual([]);
  expect(state.packets).toEqual([]);
});

test("signout and public navigation stop an active replay", async ({ page }) => {
  const state = await setup(page);
  await open(page);
  await waitForSnapshots(page, state);
  await page.getByRole("button", { name: "Déconnexion fictive" }).click();
  const count = state.packets.length;
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.getByRole("button", { name: "Page de jeu fictive" }).click();
  await page.waitForTimeout(3_000);
  expect(state.packets.length).toBe(count);
});

for (const reason of ["public", "failure"] as const) {
  test(`server ${reason} refresh revokes active recording`, async ({ page }) => {
    const state = await setup(page);
    await open(page);
    await waitForSnapshots(page, state);
    const checks = state.checks;
    if (reason === "public") state.enabled = false;
    else state.failure = true;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => state.checks).toBeGreaterThan(checks);
    await page.waitForTimeout(200);
    const count = state.packets.length;
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await page.waitForTimeout(3_000);
    expect(state.packets.length).toBe(count);
  });
}

test("changing account resets the replay identity and ignores a late response after signout", async ({ page }) => {
  const state = await setup(page);
  await open(page);
  await waitForSnapshots(page, state);
  const first = state.packets.length;
  state.subject = "merchant-other:user-other";
  await page.getByRole("button", { name: "Changer de compte fictif" }).click();
  await expect.poll(() => state.packets.slice(first).filter(p => p.event === "$snapshot" && p.properties.distinct_id === state.subject).length, { timeout: 15_000 }).toBeGreaterThan(0);
  const pending: (() => Promise<void>)[] = [];
  await page.route("**/api/analytics/beta-replay-policy", route => {
    pending.push(async () => { const now = Date.now(); await route.fulfill({ json: { enabled: true, version: BETA_REPLAY_VERSION, subject: "merchant-fixture:user-fixture", issuedAt: now, expiresAt: now + BETA_REPLAY_LEASE_MS } }); });
  });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => pending.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Déconnexion fictive" }).click();
  await pending[0]().catch(() => {}); // Aborted fetches may no longer accept a response.
  const stopped = state.packets.length;
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await page.waitForTimeout(3_000);
  expect(state.packets.length).toBe(stopped);
});

test("leaving for a public game stops recording without signing out", async ({ page }) => {
  const state = await setup(page);
  await open(page);
  await waitForSnapshots(page, state);
  await page.getByRole("button", { name: "Page de jeu fictive" }).click();
  const count = state.packets.length;
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await page.waitForTimeout(3_000);
  expect(state.packets.length).toBe(count);
});

test("an expired server lease stops snapshots without a new policy response", async ({ page }) => {
  const state = await setup(page);
  await open(page);
  await waitForSnapshots(page, state);
  state.leaseMs = 1_000;
  const checks = state.checks;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => state.checks).toBeGreaterThan(checks);
  await page.waitForTimeout(1_500);
  const count = state.packets.length;
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await page.waitForTimeout(3_000);
  expect(state.packets.length).toBe(count);
});
