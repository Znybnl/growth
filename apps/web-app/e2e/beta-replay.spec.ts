import { expect, test, type Page, type Request } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { BETA_REPLAY_VERSION, BETA_REPLAY_LEASE_MS } from "../src/lib/beta-replay-contract";
import { assertNoPageOverflow } from "./helpers/visual-1280";

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
    await expect(page.frameLocator('iframe[title^="Aperçu du brouillon"]').getByText("Description du lot visible dans la prévisualisation.")).toBeVisible();
    await expect(page.frameLocator('iframe[title="Aperçu de l’e-mail de gain"]').getByText("Votre invitation vous attend dans cette prévisualisation.")).toBeVisible();
    await page.getByLabel("Champ libre").fill("private-input@example.test");
    await waitForSnapshots(page, state);
    await page.getByRole("button", { name: "Simuler une requête privée" }).click();
    await page.getByRole("button", { name: "Événement ordinaire fictif" }).click();
    await page.waitForTimeout(3_000);
    const snapshots = state.packets.filter(p => p.event === "$snapshot");
    const decoded = unpack(snapshots);
    const metadata: Record<string, unknown>[] = [];
    const styleNodes: { attrs: Record<string, unknown> }[] = [];
    const inspect = (value: unknown) => {
      if (Array.isArray(value)) { value.forEach(inspect); return; }
      if (value && typeof value === "object") {
        const node = value as Record<string, unknown>;
        if (node.type === 4 && node.data && typeof node.data === "object") {
          metadata.push(node.data as Record<string, unknown>);
        }
        if (node.tagName === "link" || node.tagName === "style") styleNodes.push({ attrs: node.attributes as Record<string, unknown> });
        Object.values(node).forEach(inspect);
      }
    };
    inspect(decoded);
    const viewport = page.viewportSize();
    const replayUrl = new URL("/campaigns/new/guided", page.url()).href;
    expect(metadata).toContainEqual(expect.objectContaining({
      href: replayUrl, width: viewport?.width, height: viewport?.height,
    }));
    expect(styleNodes.some(node => typeof node.attrs?._cssText === "string" && node.attrs._cssText.length > 100)).toBe(true);
    await test.info().attach("synthetic-snapshots", { body: JSON.stringify(decoded), contentType: "application/json" });
    expect(snapshots.every(p => p.properties.distinct_id === state.subject)).toBe(true);
    const raw = JSON.stringify(decoded);
    const canvasNodeIds = new Set<number>();
    const safeCanvasNodeIds = new Set<number>();
    const blockedCanvasNodeIds = new Set<number>();
    const canvasMutationIds: number[] = [];
    const inspectCanvas = (value: unknown) => {
      if (Array.isArray(value)) { value.forEach(inspectCanvas); return; }
      if (!value || typeof value !== "object") return;
      const node = value as Record<string, unknown>;
      if (node.tagName === "canvas" && typeof node.id === "number") {
        canvasNodeIds.add(node.id);
        const attributes = node.attributes as Record<string, unknown> | undefined;
        if (attributes?.class === "replay-safe-canvas") safeCanvasNodeIds.add(node.id);
        if (attributes?.class === "replay-blocked-canvas") blockedCanvasNodeIds.add(node.id);
      }
      const data = node.data as Record<string, unknown> | undefined;
      if (node.type === 3 && data?.source === 9 && typeof data.id === "number") canvasMutationIds.push(data.id);
      Object.values(node).forEach(inspectCanvas);
    };
    inspectCanvas(decoded);
    expect(canvasNodeIds.size).toBe(2);
    expect(safeCanvasNodeIds.size).toBe(1);
    expect(blockedCanvasNodeIds.size).toBe(1);
    expect(canvasMutationIds.length).toBeGreaterThan(0);
    expect(canvasMutationIds.every(id => safeCanvasNodeIds.has(id))).toBe(true);
    if (choice !== "accepted") expect(state.outbound.join(" ")).not.toContain("private-query");
    expect(raw).toContain("Toutes vos campagnes");
    expect(raw).toContain("Description libre affichée dans l’aperçu du jeu.");
    expect(raw).toContain("Sous-titre visible de campagne fictive.");
    expect(raw).not.toContain("Nom du participant fictif");
    expect(raw).toContain("color:#abcdef");
    expect(raw).not.toContain("iframe-private-person@example.test");
    expect(raw).toContain("contact-fixture@example.test");
    expect(raw).toContain("+33 6 12 34 56 78");
    expect(raw).toContain("contact@merchant.example.test");
    expect(raw).toContain("private-input@example.test");
    expect(raw).toContain("private-title");
    expect(raw).not.toContain("iframe-password-secret");
    expect(raw).not.toContain("client-frame-secret@example.test");
    expect(raw).not.toContain("Le type de jeu.");
    expect(raw).toContain("Description du lot visible dans la prévisualisation.");
    expect(raw).toContain("Votre invitation vous attend dans cette prévisualisation.");
    expect(raw).not.toContain("draft-private-person@example.test");
    expect(raw).not.toContain("email-private-person@example.test");
    expect(raw).not.toContain("private-optimized-client.png");
    expect(raw).toContain("/images/scratch-templates/beauty-noir-or.webp");
    expect(raw.split("/images/scratch-templates/beauty-noir-or.webp").length - 1).toBeGreaterThanOrEqual(2);
    expect(raw).toContain("childNodes"); // A real DOM snapshot was inspected, not just compressed bytes.
    const unmaskedPrivateFixtures = ["participant@example.test", "Prénom participant fictif", "Prénom participant iframe", "9876-private-pin", "private-destination", "private-token", "private-image", "private-query", "private-hash", "private-private-container", "private-console-secret", "private-network-secret", "private-response-secret", "private-css-secret"].filter(secret => raw.includes(secret));
    expect(unmaskedPrivateFixtures).toEqual([]);
    expect(raw).toContain("data-layout");
    expect(raw).toContain("wide");
    expect(raw).toContain("data-inline-preview");
    expect((await page.context().cookies()).find(c => c.name === "okado_analytics_consent")?.value).toBe(before);
    if (choice !== "accepted") {
      expect(state.packets.every(p => p.event === "$snapshot")).toBe(true);
      expect((await page.context().cookies()).some(c => c.name.startsWith("ph_"))).toBe(false);
      expect(await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter(key => key.startsWith("ph_") || key.startsWith("okado_beta_replay")))).toEqual([]);
    } else {
      const ordinary = state.packets.find(p => p.event === "campaign_preview_opened");
      expect(ordinary?.properties.distinct_id ?? ordinary?.distinct_id).toBe(state.subject);
      expect(ordinary?.properties.$session_id).toBe(snapshots[0]?.properties.$session_id);
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

test("merchant game preview is recorded while participant information remains hidden", async ({ page }) => {
  const state = await setup(page);
  await page.route("**/campaign/replay-fixture/preview-embed?preview=1", route => route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><html><body><h1>La meilleure surprise de la semaine.</h1><p>Durée de validité du gain (jours)</p><p data-replay-private>Participant fictif</p><p data-replay-private>participant-game@example.test</p><input type="password" value="game-password-secret" /></body></html>',
  }));
  await open(page);
  await waitForSnapshots(page, state);
  await page.getByRole("button", { name: "Ouvrir aperçu jeu fictif" }).click();
  await expect(page.frameLocator('iframe[title="Prévisualisation mobile du jeu"]').getByText("La meilleure surprise de la semaine.")).toBeVisible();
  await expect.poll(() => JSON.stringify(unpack(state.packets.filter(p => p.event === "$snapshot"))).includes("La meilleure surprise de la semaine.")).toBe(true);
  const raw = JSON.stringify(unpack(state.packets.filter(p => p.event === "$snapshot")));
  expect(raw).not.toContain("participant-game@example.test");
  expect(raw).not.toContain("game-password-secret");
  expect(raw).not.toContain("Participant fictif");
  expect(raw).toContain("Durée de validité du gain (jours)");
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

// Read the actual SDK output with an independent rrweb player, not a second copy
// of our serializer. The player has no access to the original DOM or stylesheet.
for (const size of [{ width: 1280, height: 720 }, { width: 1280, height: 600 }, { width: 390, height: 844 }]) {
  test(`@visual-1280 reconstructed replay keeps the workspace layout at ${size.width}x${size.height}`, async ({ page, context }, info) => {
    await page.setViewportSize(size);
    const state = await setup(page);
    await page.getByRole("button", { name: "Refuser", exact: true }).click();
    await open(page);
    await waitForSnapshots(page, state);
    if (size.width < 1024) {
      await page.getByRole("button", { name: "Ouvrir le menu" }).click();
      await expect.poll(async () => (await page.locator('aside[aria-label="Navigation de l’espace de travail"]').boundingBox())?.x).toBe(0);
    }
    await page.waitForTimeout(3_000);
    const events: { type: number; timestamp: number; data: unknown }[] = [];
    const collect = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) { value.forEach(collect); return; }
      const node = value as Record<string, unknown>;
      if (typeof node.timestamp === "number" && typeof node.type === "number" && node.data) events.push(node as typeof events[number]);
      else Object.values(node).forEach(collect);
    };
    collect(unpack(state.packets.filter(packet => packet.event === "$snapshot")));
    events.sort((a, b) => a.timestamp - b.timestamp);
    expect(events.some(event => event.type === 2)).toBe(true);
    const raw = JSON.stringify(events);
    for (const secret of ["private-image", "private-css-secret", "participant@example.test"]) expect(raw).not.toContain(secret);
    const original = await page.locator('aside[aria-label="Navigation de l’espace de travail"]').boundingBox();
    const player = await context.newPage();
    await player.setViewportSize(size);
    await player.setContent('<html><head></head><body style="margin:0"><div id="player"></div></body></html>');
    await player.addStyleTag({ path: resolve(__dirname, "../../../node_modules/@rrweb/replay/dist/style.css") });
    await player.addStyleTag({ content: "iframe { border: 0; display: block; }" });
    await player.addScriptTag({ path: resolve(__dirname, "../../../node_modules/@rrweb/replay/dist/replay.umd.cjs") });
    await player.evaluate(({ events }) => {
      const runtime = window as unknown as { rrwebReplay: { Replayer: new (events: unknown[], config: object) => { pause: (time: number) => void } } };
      const replay = new runtime.rrwebReplay.Replayer(events, { root: document.getElementById("player"), mouseTail: false, showWarning: true });
      replay.pause(events.at(-1)!.timestamp - events[0].timestamp);
    }, { events });
    const replay = player.frameLocator("iframe");
    const replayNavigation = replay.locator('aside[aria-label="Navigation de l’espace de travail"]');
    await expect(replayNavigation).toBeVisible();
    await expect(replay.getByRole("heading", { name: "Pilotez vos campagnes" })).toBeVisible();
    await expect(replay.frameLocator('iframe[title="Prévisualisation fictive"]').getByText("Description libre affichée dans l’aperçu du jeu.")).toBeVisible();
    await expect(replayNavigation.locator("nav").first()).toContainText("Campagnes");
    await expect(replayNavigation.locator("nav svg").first()).toBeVisible();
    await expect(replay.locator(".okado-wizard .wizard-progress")).toBeVisible();
    await expect(replay.locator(".okado-wizard .wizard-form")).toBeVisible();
    await expect(replay.locator(".okado-wizard .wizard-live-preview")).toBeVisible();
    await expect(replay.locator(".okado-wizard .wizard-live-preview").getByText("Description de la preview visible dans le wizard.")).toBeVisible();
    await expect.poll(() => replay.getByLabel("Miniature du template Voyage").evaluate(element => getComputedStyle(element).backgroundImage))
      .toContain("/images/templates/travel/elegant.webp");
    await expect(replay.locator(".okado-metric-card__value").first()).toHaveText("12");
    const restored = await replayNavigation.boundingBox();
    expect(restored?.width).toBeCloseTo(original!.width, 0);
    // rrweb reconstructs the mobile class mutation, then CSS finishes its slide.
    await expect.poll(async () => (await replayNavigation.boundingBox())?.x).toBeCloseTo(original!.x, 0);
    expect(await replayNavigation.evaluate(element => getComputedStyle(element).position)).toBe("fixed");
    expect(await replayNavigation.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    if (size.width >= 1024) {
      const main = await replay.locator("main.flex-1.overflow-y-auto").boundingBox();
      expect(main!.x).toBeGreaterThanOrEqual(restored!.width);
      const wizard = replay.locator(".okado-wizard");
      await expect(wizard).toHaveAttribute("data-layout", "wide");
      await expect(wizard).toHaveAttribute("data-inline-preview", "true");
      const menu = await wizard.locator(".wizard-progress").boundingBox();
      const form = await wizard.locator(".wizard-form").boundingBox();
      const preview = await wizard.locator(".wizard-live-preview").boundingBox();
      expect(menu!.x).toBeLessThan(form!.x);
      expect(form!.x).toBeLessThan(preview!.x);
    }
    await assertNoPageOverflow(player);
    const path = info.outputPath(`reconstructed-${size.width}x${size.height}.png`);
    await player.screenshot({ path });
    await info.attach("Reconstructed SDK recording", { path, contentType: "image/png" });
    await player.close();
  });
}
