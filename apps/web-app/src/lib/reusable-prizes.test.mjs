import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";

registerHooks({ resolve(name, context, next) {
  if (name === "next/server") return next("next/server.js", context);
  const mocks = {
    "@/lib/auth": "export const getAuthenticatedSession=async()=>globalThis.__reuse.session",
    "@/lib/admin": "export const isSaasAdminEmail=email=>email==='admin@example.test'",
    "@/lib/admin-campaign-repository": "export const getAdminCampaignLocation=async(account,site)=>{globalThis.__reuse.targetReads++;return account==='account-b'&&site==='site-b'?{id:site,locationStatus:globalThis.__reuse.targetStatus}:null}",
    "@/lib/supabase": "export const getSupabaseAdmin=()=>globalThis.__reuse.db",
  };
  if (mocks[name]) return { url: "data:text/javascript," + encodeURIComponent(mocks[name]), shortCircuit: true };
  if (name.startsWith("@/")) return next(new URL("../" + name.slice(2) + ".ts", import.meta.url).href, context);
  return next(name, context);
}, load(url, context, next) {
  if (url.startsWith(new URL("../", import.meta.url).href) && /\.ts$/.test(url)) return {
    format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText, shortCircuit: true,
  };
  return next(url, context);
} });
const { GET } = await import("../app/api/merchant/prize-library/route.ts");
const { GET: adminGET } = await import("../app/api/admin/merchants/[merchantId]/locations/[locationId]/prize-library/route.ts");
const { getReusablePrizes } = await import("./reusable-prize-repository.ts");
const { copyReusablePrize, isReusablePrizeAdded } = await import("./reusable-prizes.ts");
let state;
const row = (id, site = "site-a", campaign = "game-old", date = "2026-10-01T10:00:00Z") => ({
  id, campaign_id: campaign, label: "MASQUE OFFERT", probability: "10", estimated_unit_cost: "4.50",
  total_quantity: 12, remaining_quantity: 2, purchase_required: true, created_at: date,
  campaigns: { id: campaign, merchant_id: site, title: "Ancien jeu", created_at: date,
    prize_settings: { [id]: { usageConditions: "Avec une prestation payante." } }, secret: "never-returned" },
});
beforeEach(() => {
  state = globalThis.__reuse = {
    session: { merchant: { id: "site-a", locationStatus: "active" }, user: { email: "owner@example.test" } },
    targetStatus: "active", targetReads: 0, reads: [], rows: [row("old")], fail: false,
  };
  state.db = { from(table) {
    assert.equal(table, "prizes"); const read = { filters: [] }; state.reads.push(read);
    const query = {
      select(fields, options) { read.fields = fields; assert.equal(options.count, "exact"); return query; },
      eq(key, value) { read.filters.push([key, value]); return query; },
      neq(key, value) { read.exclude = [key, value]; return query; },
      order(key) { assert.equal(key, "id"); return query; },
      range(offset, end) { read.offset = offset; read.end = end; return query; },
      async returns() {
        if (state.fail) return { data: null, error: { message: "private database error" } };
        // Deliberately return foreign/current rows too: test the DTO's defensive scope check.
        const cap = state.cap ?? 500;
        return { data: state.rows.slice(read.offset, Math.min(read.end + 1, read.offset + cap)), count: state.rows.length, error: null };
      },
    }; return query;
  } };
});
const request = (query = "") => new Request("https://app.example.test/api/merchant/prize-library" + query);
const target = { params: Promise.resolve({ merchantId: "account-b", locationId: "site-b" }) };

test("session obligatoire, établissement actif et paramètres non injectables", async () => {
  state.session = null;
  assert.equal((await GET(request())).status, 401);
  assert.equal(state.reads.length, 0);
  state.session = { merchant: { id: "site-a", locationStatus: "archived" }, user: { email: "owner@example.test" } };
  assert.equal((await GET(request())).status, 404);
  state.session.merchant.locationStatus = "active";
  assert.equal((await GET(request("?excludeCampaignId=%22bad"))).status, 400);
  const response = await GET(request("?merchantId=site-b&locationId=site-b"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(state.reads[0].filters, [["campaigns.merchant_id", "site-a"]]);
});

test("admin : refus marchand avant lecture, cible associée et non archivée seulement", async () => {
  assert.equal((await adminGET(request(), target)).status, 403);
  assert.equal(state.targetReads, 0); assert.equal(state.reads.length, 0);
  state.session.user.email = "admin@example.test";
  assert.equal((await adminGET(request(), { params: Promise.resolve({ merchantId: "wrong", locationId: "site-b" }) })).status, 404);
  state.targetStatus = "archived";
  assert.equal((await adminGET(request(), target)).status, 404);
  state.targetStatus = "active"; state.rows = [row("target-prize", "site-b")];
  const response = await adminGET(request(), target);
  assert.equal(response.status, 200);
  assert.deepEqual(state.reads[0].filters, [["campaigns.merchant_id", "site-b"]]);
  assert.equal((await response.json()).prizes[0].id, "target-prize");
});

test("projection minimale, conditions conservées, aucun stock restant, média ou autre établissement", async () => {
  state.rows.push(row("foreign", "site-b"), row("current", "site-a", "game-current"));
  const response = await GET(request("?excludeCampaignId=game-current"));
  const { prizes } = await response.json();
  assert.equal(prizes.length, 1);
  assert.equal(prizes[0].usageConditions, "Avec une prestation payante.");
  assert.equal(prizes[0].purchaseRequired, true);
  assert.equal(prizes[0].totalQuantity, 12);
  assert.ok(!JSON.stringify(prizes).includes("never-returned"));
  assert.ok(!JSON.stringify(prizes).includes("remaining"));
  assert.ok(state.reads[0].fields.includes("prize_settings:campaign_local_settings->prizeSettings"));
  assert.ok(!state.reads[0].fields.includes("remaining_quantity"));
  assert.deepEqual(state.reads[0].exclude, ["campaign_id", "game-current"]);
});

test("tri récent, doublons exacts seulement et pagination au-delà du plafond PostgREST", async () => {
  const newer = row("new", "site-a", "game-new", "2026-10-20T10:00:00Z");
  state.rows.push(newer, { ...row("different"), estimated_unit_cost: 8 });
  const items = await getReusablePrizes("site-a");
  assert.deepEqual(items.map((item) => item.id), ["new", "different"]);
  state.rows = Array.from({ length: 601 }, (_, index) => ({ ...row(`item-${index}`), label: `Lot ${index}` }));
  state.reads = []; state.cap = 100;
  assert.equal((await getReusablePrizes("site-a")).length, 601);
  assert.equal(state.reads.length, 7);
});

test("copie indépendante, stock initial restauré, doublon empêché après personnalisation", async () => {
  const [prize] = await getReusablePrizes("site-a");
  const snapshot = structuredClone(state.rows);
  const a = copyReusablePrize(prize, "wizard-prize-a", 7.5, 9);
  const b = copyReusablePrize(prize, "wizard-prize-b", 10, 12);
  assert.notEqual(a.id, b.id);
  assert.equal(a.remainingQuantity, 9);
  assert.equal(b.remainingQuantity, 12);
  assert.equal(b.purchaseRequired, true);
  assert.equal(b.usageConditions, prize.usageConditions);
  a.label = "Autre libellé"; a.usageConditions = "Personnalisé";
  assert.equal(isReusablePrizeAdded(prize, [a], new Map([[prize.id, a.id]])), true);
  assert.equal(isReusablePrizeAdded(prize, []), false);
  assert.deepEqual(state.rows, snapshot);
  assert.ok(copyReusablePrize({ ...prize, id: "x".repeat(120) }, "wizard-prize-1790000000000-test12", 10, 12).id.length <= 120);
});

test("données invalides / PERDU exclus et panne générique sans fuite", async () => {
  state.rows = [row("valid"), { ...row("losing"), label: "PERDU !" }, { ...row("bad"), probability: 101 }, { ...row("bad-stock"), total_quantity: 0 }];
  assert.equal((await getReusablePrizes("site-a")).length, 1);
  state.fail = true;
  const response = await GET(request());
  assert.equal(response.status, 500);
  assert.ok(!(await response.text()).includes("private database"));
});
