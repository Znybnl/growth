import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";

// Real route, renderer and signature, with infrastructure isolated in this process.
// No production database, merchant session, event capture or email is used.
const root = new URL("../", import.meta.url);
const mocks = {
  "@/lib/auth": "export const requireAuthenticatedSession = async () => {const s=globalThis.__previewQrTest.session; if(!s) throw Error('redirect:/connexion'); return s;};",
  "@/lib/store": "export const getCampaignPerformance = async (id, merchant) => {const s=globalThis.__previewQrTest; s.reads.push([id,merchant.id]); return s.performance;};",
  "@/lib/campaign-exports": "export const createCampaignQrSvg = async url => {const s=globalThis.__previewQrTest; s.urls.push(url); return s.render(url);};",
  "@/lib/product-analytics": "export const captureProductEvent = async () => {globalThis.__previewQrTest.events++;}; export const merchantDistinctId = () => 'fixture';",
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`${specifier.slice(2)}.ts`, root).href, context);
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    return nextResolve(specifier, context);
  },
});
const { GET } = await import("../app/api/campaigns/[id]/qr/route.ts");
const { createCampaignQrSvg } = await import("./campaign-qr.ts");
const { verifyPreviewAccessToken } = await import("./preview-token.ts");
let state;
beforeEach(() => {
  state = globalThis.__previewQrTest = {
    session: { merchant: { id: "site-fixture" }, user: { id: "user-fixture" } },
    performance: { campaign: { id: "test-game", merchantId: "site-fixture", isActive: false } },
    reads: [], urls: [], events: 0, render: createCampaignQrSvg,
  };
});
const params = { params: Promise.resolve({ id: "test-game" }) };

for (const active of [false, true]) {
  test(`diffusion ${active ? "publiée" : "brouillon"} : affichage sans téléchargement, même URL au clic explicite`, async () => {
    state.performance.campaign.isActive = active;
    const inline = await GET(new Request("https://app.example.test/api/campaigns/test-game/qr?inline=1"), params);
    const inlineSvg = await inline.text();
    assert.match(inline.headers.get("content-disposition"), /^inline;/);
    assert.equal(state.events, 0);
    // Reopening does not inflate downloads.
    await GET(new Request("https://app.example.test/api/campaigns/test-game/qr?inline=1"), params);
    assert.equal(state.events, 0);
    const download = await GET(new Request("https://app.example.test/api/campaigns/test-game/qr"), params);
    assert.equal(await download.text(), inlineSvg);
    assert.match(download.headers.get("content-disposition"), /^attachment;/);
    assert.equal(state.events, 1);
    assert.deepEqual(state.urls, Array(3).fill("https://app.example.test/campaign/test-game"));
    assert.equal(state.performance.campaign.isActive, active);
  });
}

test("QR privé de brouillon : vrai SVG et jeton de test signé limité au bon jeu", async () => {
  const response = await GET(new Request("https://app.example.test/api/campaigns/test-game/qr?preview=1&inline=1"), params);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^image\/svg\+xml/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-disposition"), /^inline;/);
  const svg = await response.text();
  assert.match(svg, /<svg[^>]+width="1200"/);
  assert.match(svg, /<path/);
  const target = new URL(state.urls[0]);
  assert.equal(target.origin, "https://app.example.test");
  assert.equal(target.pathname, "/campaign/test-game");
  assert.equal(target.searchParams.get("preview"), "1");
  const token = target.searchParams.get("previewToken");
  const claims = verifyPreviewAccessToken(token, "test-game");
  assert.ok(claims);
  assert.ok(Math.abs(claims.exp - Math.floor(Date.now() / 1000) - 1800) <= 1);
  assert.equal(verifyPreviewAccessToken(token, "other-game"), null);
  assert.equal(state.performance.campaign.isActive, false);
  assert.equal(state.events, 0);
});

test("une nouvelle tentative reste une prévisualisation sans événement de téléchargement", async () => {
  for (const retry of [0, 1, 2]) {
    assert.equal((await GET(new Request(`https://app.example.test/api/campaigns/test-game/qr?preview=1&inline=1&qrRetry=${retry}`), params)).status, 200);
  }
  assert.equal(state.urls.length, 3);
  assert.equal(state.events, 0);
  assert.ok(state.urls.every(url => new URL(url).searchParams.get("preview") === "1"));
});

test("absence de session : refus avant lecture et génération", async () => {
  state.session = null;
  await assert.rejects(GET(new Request("https://app.example.test/api/campaigns/test-game/qr?preview=1&inline=1"), params), /redirect:\/connexion/);
  assert.deepEqual(state.reads, []);
  assert.deepEqual(state.urls, []);
});

for (const missing of [false, true]) {
  test(missing ? "jeu inconnu : 404 sans QR" : "jeu d'un autre établissement : 404 sans QR", async () => {
    state.performance = missing ? null : { campaign: { id: "test-game", merchantId: "foreign-site" } };
    const response = await GET(new Request("https://app.example.test/api/campaigns/test-game/qr?preview=1&inline=1"), params);
    assert.equal(response.status, 404);
    assert.deepEqual(state.urls, []);
    assert.equal(state.events, 0);
  });
}
