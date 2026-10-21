import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";

registerHooks({ resolve(name, context, next) {
  const mocks = {
    "@/lib/supabase": `export const getSupabaseAdmin=()=>globalThis.__budget.db;
      export const assertSupabaseResult=(r,m)=>{if(r.error)throw new Error(m)};
      export const unwrapSupabaseResult=(r,m)=>{if(r.error)throw new Error(m);return r.data};`,
    "@/lib/billing": "export const assertMerchantBillingAccess=async()=>{}",
    "@/lib/campaign-local-settings": `export const getCampaignLocalSettings=async()=>globalThis.__budget.settings;
      export const setCampaignLocalSettings=async(id,value)=>{globalThis.__budget.settings=value;return value}`,
    "@/lib/support-log": "export const logSupportEvent=()=>{}",
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
const { calculatePrizeBudget, prizeRuleErrors } = await import("./prize-budget.ts");
const { parseCampaignSetupInput } = await import("./merchant-input.ts");
const { updateCampaignSetupInSupabase, getSupabaseCampaignSetupPerformance } = await import("./campaign-repository.ts");
const { copyReusablePrize, deduplicateReusablePrizes } = await import("./reusable-prizes.ts");
const prize = (probability, estimatedUnitCost, extra = {}) => ({ label: "Lot", probability, estimatedUnitCost, totalQuantity: null, ...extra });
const payload = (patch = {}) => ({ accent: {}, rewardRules: {}, presentation: { logo: {}, background: {}, heading: {}, button: {}, layout: {}, wheel: {}, poster: { wheel: {} }, email: {} }, ...patch });

beforeEach(() => {
  const state = globalThis.__budget = { row: null, settings: {}, prizes: [], calls: [] };
  state.db = {
    async rpc(name, args) {
      assert.equal(name, "save_campaign_setup");
      state.calls.push(args); state.row = args.p_campaign; state.settings = args.p_settings; state.prizes = args.p_prizes;
      return { data: state.row.id, error: null };
    },
    from(table) {
      let start = 0, end = 499;
      const query = {
        select() { return query; }, eq() { return query; }, order() { return query; },
        range(a, b) { start = a; end = b; return query; }, returns() { return query; },
        insert() { return Promise.resolve({ error: null }); },
        maybeSingle() { return Promise.resolve({ data: state.row, error: null }); },
        then(resolve) { const data = table === "prizes" ? state.prizes : []; return Promise.resolve({ data: data.slice(start, end + 1), error: null, count: data.length }).then(resolve); },
      }; return query;
    },
  };
});

test("SFD : 3,08 € par participation et 308 € pour100, sans coût pour la part perdante", () => {
  const result = calculatePrizeBudget([prize(3, 20), prize(17, 4), prize(30, 6)]);
  assert.ok(Math.abs(result.average - 3.08) < 1e-9);
  assert.equal(result.projection100, 308);
  assert.equal(result.complete, true);
});

test("coût inconnu ≠ zéro, chances nulles, états invalides et stocks limités", () => {
  assert.equal(calculatePrizeBudget([prize(50, 0)]).average, 0);
  const unknown = calculatePrizeBudget([prize(50, 0, { estimatedUnitCostKnown: false })]);
  assert.deepEqual(unknown.missingCostIndexes, [0]); assert.equal(unknown.average, null);
  assert.equal(calculatePrizeBudget([prize(0, 0, { estimatedUnitCostKnown: false })]).complete, true);
  assert.equal(calculatePrizeBudget([prize(0, NaN, { estimatedUnitCostKnown: false })]).average, 0);
  assert.equal(calculatePrizeBudget([prize(50, NaN)]).complete, false);
  assert.equal(calculatePrizeBudget([prize(101, 1)]).average, null);
  assert.equal(calculatePrizeBudget([prize(NaN, 1)]).valid, false);
  assert.equal(calculatePrizeBudget([prize(50, 2, { totalQuantity: 1 })]).hasLimitedStock, true);
});

test("bornes existantes des paramètres : entiers, pas de correction silencieuse", () => {
  assert.deepEqual(prizeRuleErrors({ availabilityDurationDays: 0, participationIntervalDays: 365, availableAfterHours: 8760 }), {});
  for (const value of [-1, 366, 1.5, NaN]) assert.ok(prizeRuleErrors({ availabilityDurationDays: value }).availabilityDurationDays);
  assert.ok(prizeRuleErrors({ participationIntervalDays: 0 }).participationIntervalDays);
  assert.throws(() => parseCampaignSetupInput(payload({ rewardRules: { participationIntervalDays: 0 } }), "site"), /entre 1 et 365/);
  assert.throws(() => parseCampaignSetupInput(payload({ rewardRules: { availabilityDurationDays: 366 } }), "site"), /entre 0 et 365/);
  assert.throws(() => parseCampaignSetupInput(payload({ isActive: false, prizes: [prize(70, 1), prize(40, 2)] }), "site"), /100/);
});

test("sauvegarde atomique et relecture réelles de la DAL : marqueur inconnu persistant sans SQL nouveau", async () => {
  const state = globalThis.__budget;
  const input = parseCampaignSetupInput(payload({ title: "Test", gameType: "wheel", prizes: [prize(20, 0, { id: "original", estimatedUnitCostKnown: false })] }), "site");
  const id = await updateCampaignSetupInSupabase(input);
  const savedPrize = state.calls[0].p_prizes[0];
  assert.equal(state.calls[0].p_settings.prizeSettings[savedPrize.id].estimatedUnitCostKnown, false);
  assert.equal(savedPrize.estimated_unit_cost, 0);
  const result = await getSupabaseCampaignSetupPerformance(id, { id: "site", companyName: "Établissement fictif", industry: "Beauté" });
  assert.equal(result.prizes[0].estimatedUnitCostKnown, false);
  assert.equal(calculatePrizeBudget(result.prizes).complete, false);
  const explicitZero = parseCampaignSetupInput(payload({ id, title: "Test", prizes: [prize(20, 0, { id: savedPrize.id, remainingQuantity: null, estimatedUnitCostKnown: true })] }), "site");
  await updateCampaignSetupInSupabase(explicitZero);
  const zeroRead = await getSupabaseCampaignSetupPerformance(id, { id: "site", companyName: "Test" });
  assert.equal(calculatePrizeBudget(zeroRead.prizes).complete, true);
  state.settings.prizeSettings[savedPrize.id] = {}; // Historical explicit numeric zero stays zero, never guessed unknown.
  const historical = await getSupabaseCampaignSetupPerformance(id, { id: "site", companyName: "Test" });
  assert.equal(calculatePrizeBudget(historical.prizes).average, 0);
});

test("copie d'un coût inconnu conservée et distincte d'un vrai zéro", () => {
  const previous = { ...prize(10, 0), id: "source", sourceCampaignId: "old", sourceCampaignTitle: "Ancien", lastUsedAt: "2026-10-21", purchaseRequired: false, usageConditions: "", estimatedUnitCostKnown: false };
  const copy = copyReusablePrize(previous, "wizard-prize-test", 10, null);
  assert.equal(copy.estimatedUnitCostKnown, false);
  assert.equal(calculatePrizeBudget([copy]).complete, false);
  assert.equal(deduplicateReusablePrizes([previous, { ...previous, id: "zero", estimatedUnitCostKnown: true }]).length, 2);
});
