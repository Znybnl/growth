import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
const src = new URL("../", import.meta.url);
const mocks = {
  "@/lib/supabase": "export const getSupabaseAdmin=()=>globalThis.__affiliate.db;export const isSupabaseConfigured=()=>true;",
  "@/lib/product-analytics": "export const captureProductEvent=async()=>{};export const merchantDistinctId=id=>id;",
  "@/lib/support-log": "export const logSupportEvent=()=>{};",
  "@/lib/auth": "export const getAuthenticatedSession=async()=>globalThis.__affiliate.session;export const requireAuthenticatedSession=getAuthenticatedSession;",
  "@/lib/merchant-account-repository": "export const syncMerchantBillingFromStripeCustomerIdInSupabase=async()=>{throw Error('Unexpected Stripe sync')};",
  "@/lib/store": "export const getMerchantRedemptionPinStates=async()=>({});",
  "@/components/merchant/account-settings-form": "export const AccountSettingsForm=props=>{globalThis.__affiliate.accountProps=props;return null};",
  "next/navigation": "export const redirect=p=>{throw Error('redirect:'+p)};export const useRouter=()=>({refresh(){}});",
};
registerHooks({
  resolve(name, context, next) {
    if (mocks[name]) return { url: `data:text/javascript,${encodeURIComponent(mocks[name])}`, shortCircuit: true };
    if (name.startsWith("@/")) { const p = new URL(name.slice(2) + ".ts", src); return next(existsSync(p) ? p.href : new URL(name.slice(2) + ".tsx", src).href, context); }
    if (name === "next/server") return next("next/server.js", context);
    return next(name, context.parentURL?.startsWith("data:") ? { ...context, parentURL: import.meta.url } : context);
  },
  load(url, context, next) {
    if (url.startsWith(src.href) && /\.tsx?$/.test(url)) return { format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    return next(url, context);
  },
});
const repo = await import("./affiliate-repository.ts");
const route = await import("../app/api/affiliates/accounts/[id]/route.ts");
const { default: accountPage } = await import("../app/(merchant)/account/page.tsx");
let state;
function db() {
  return {
    rpc(name, args) { state.rpcs.push({ name, args }); return Promise.resolve({ data: state.rpcId, error: state.rpcError }); },
    from(table) {
      let filters = [], action = "select", values, single = false, offset = 0, end = Infinity, count = false, sort;
      const q = {
        select(_, options) { count = options?.count === "exact"; return q; },
        eq(key, value) { filters.push(row => row[key] === value); return q; },
        is(key, value) { filters.push(row => (row[key] ?? null) === value); return q; },
        neq(key, value) { filters.push(row => row[key] !== value); return q; },
        in(key, values) { filters.push(row => values.includes(row[key])); return q; },
        order(key, options) { sort = [key, options?.ascending !== false]; return q; },
        range(start, last) { offset = start; end = last + 1; return q; },
        insert(input) { action = "insert"; values = input; return q; },
        update(input) { action = "update"; values = input; return q; },
        single() { single = true; return q; }, maybeSingle() { single = true; return q; },
        then(resolve, reject) {
          if (state.failTable === table) return Promise.resolve({ data: null, error: { message: "Private database details" } }).then(resolve, reject);
          let error = null;
          if (action === "insert") {
            const existing = state.tables[table] ?? [];
            const duplicate = table === "affiliate_accounts" ? existing.some(r => r.workspace_id === values.workspace_id && !r.canonical_account_id) :
              table === "affiliate_referrals" && existing.some(r => r.referred_workspace_id === values.referred_workspace_id);
            if (duplicate) error = { code: "23505", message: "duplicate" };
            else { const row = { id: `new-${table}-${existing.length}`, created_at: "2026-10-28", canonical_account_id: null, ...values }; (state.tables[table] ??= []).push(row); state.writes.push([table, action]); filters = [r => r.id === row.id]; }
          }
          let rows = (state.tables[table] ?? []).filter(row => filters.every(fn => fn(row)));
          if (action === "update") { rows.forEach(row => Object.assign(row, values)); state.writes.push([table, action]); }
          if (sort) rows.sort((a, b) => String(a[sort[0]]).localeCompare(String(b[sort[0]])) * (sort[1] ? 1 : -1));
          const total = rows.length; rows = rows.slice(offset, Math.min(end, offset + state.pageSize));
          return Promise.resolve({ data: error ? null : single ? rows[0] ?? null : rows, error, count: count ? total : null }).then(resolve, reject);
        },
      }; return q;
    },
  };
}
beforeEach(() => {
  state = globalThis.__affiliate = { writes: [], rpcs: [], rpcId: "commission", pageSize: Infinity, tables: {
    merchants: [{ id: "a1", workspace_id: "a", company_name: "Site A", restaurant_email: "site@example.test" }, { id: "a2", workspace_id: "a", company_name: "Annexe" }, { id: "b1", workspace_id: "b", company_name: "Site B" }, { id: "b2", workspace_id: "b", company_name: "Annexe B" }],
    merchant_users: [{ id: "u1", merchant_id: "a1", first_name: "Camille", last_name: "Durand", email: "owner@example.test", created_at: "2026-06-01" }, { id: "u2", merchant_id: "b1", first_name: "Nouvelle", last_name: "Inscription", email: "new@example.test", created_at: "2026-10-28" }],
    merchant_workspaces: [{ id: "a", name: "Compte A", created_at: "2026-06-01" }, { id: "b", name: "Compte B", created_at: "2026-10-28" }],
    merchant_workspace_memberships: [{ id: "m1", workspace_id: "a", merchant_user_id: "u1", role: "owner", status: "active" }, { id: "m2", workspace_id: "b", merchant_user_id: "u2", role: "owner", status: "active" }],
    affiliate_accounts: [{ id: "aff-a", merchant_id: "a1", workspace_id: "a", code: "OKADO-A", status: "active", canonical_account_id: null, commission_rate_bps: 4000, commission_duration_months: 12 }, { id: "old", merchant_id: "a2", workspace_id: "a", code: "OLD-CODE", status: "disabled", canonical_account_id: "aff-a" }],
    affiliate_referrals: [], affiliate_commissions: [],
  }, session: { user: { id: "u1", merchantId: "a1", role: "owner", email: "owner@example.test" }, merchant: { id: "a2", workspaceId: "a", companyName: "Annexe" }, locations: [] } };
  state.db = db();
});
test("administration : nouvelles inscriptions, compte unique, e-mail de connexion, tri et recherche sans écrire", async () => {
  state.pageSize = 1;
  const result = await repo.getAffiliateAdminOverview();
  assert.equal(result.totals.affiliates, 2); assert.equal(result.accounts.length, 2);
  assert.equal(result.accounts[0].id, "workspace:b"); assert.equal(result.accounts[0].merchantEmail, "new@example.test");
  assert.equal(result.accounts[1].locationCount, 2); assert.equal(result.accounts[1].merchantEmail, "owner@example.test");
  assert.equal(result.accounts[0].status, "disabled"); assert.deepEqual(state.writes, []);
  assert.equal((await repo.getAffiliateAdminOverview({ query: "new@example.test" })).accounts.length, 1);
});
test("activation d’un compte nouvellement inscrit, pas d’activation d’un alias établissement", async () => {
  await repo.updateAffiliateAccountSettings({ accountId: "workspace:b", status: "active", commissionRatePercent: 35, commissionDurationMonths: 12 });
  const row = state.tables.affiliate_accounts.find(a => a.workspace_id === "b");
  assert.equal(row.status, "active"); assert.equal(row.commission_rate_bps, 3500);
  await assert.rejects(() => repo.updateAffiliateAccountSettings({ accountId: "old", status: "active", commissionRatePercent: 40, commissionDurationMonths: 12 }), /impossible/);
});
test("le propriétaire est résolu par son adhésion au compte, pas par son établissement principal", async () => {
  state.tables.merchant_workspace_memberships[1].merchant_user_id = "u1";
  const account = (await repo.getAffiliateAdminOverview()).accounts.find(row => row.workspaceId === "b");
  assert.equal(account.merchantEmail, "owner@example.test"); assert.equal(account.merchantId, "b1");
  await repo.updateAffiliateAccountSettings({ accountId: account.id, status: "active", commissionRatePercent: 40, commissionDurationMonths: 12 });
  assert.equal(state.tables.affiliate_accounts.find(row => row.merchant_id === "b1").workspace_id, "b");
});
test("même carte depuis deux sites, absente si désactivée, aucun compte créé par la consultation", async () => {
  assert.deepEqual(await repo.getAffiliateSummaryForMerchant({ id: "a1" }), await repo.getAffiliateSummaryForMerchant({ id: "a2" }));
  state.tables.affiliate_accounts[0].status = "disabled";
  assert.equal(await repo.getAffiliateSummaryForMerchant({ id: "a2" }), null);
  assert.equal(await repo.getAffiliateSummaryForMerchant({ id: "b1" }), null); assert.deepEqual(state.writes, []);
});
test("ancien code conservé, auto-parrainage et double attribution inter-sites interdits", async () => {
  assert.equal(await repo.createAffiliateReferralForMerchant({ referredMerchantId: "a2", referralCode: "OLD-CODE", source: "signup" }), null);
  assert.ok(await repo.createAffiliateReferralForMerchant({ referredMerchantId: "b1", referralCode: " old-code ", source: "google_signup" }));
  assert.equal(await repo.createAffiliateReferralForMerchant({ referredMerchantId: "b2", referralCode: "OKADO-A", source: "signup" }), null);
  assert.equal(state.tables.affiliate_referrals.length, 1); assert.equal(state.tables.affiliate_referrals[0].affiliate_account_id, "aff-a");
});
test("facture payée transmise au calcul SQL atomique, montant HT et erreurs propagées", async () => {
  const invoice = { id: "in1", status: "paid", total_excluding_tax: 5000, amount_paid: 6000, currency: "eur", status_transitions: { paid_at: 1768471200 }, parent: { subscription_details: { subscription: "sub-new" } } };
  assert.equal(await repo.createAffiliateCommissionFromPaidInvoice(invoice, "b2"), "commission");
  assert.equal(state.rpcs[0].args.p_amount_cents, 5000); assert.equal(state.rpcs[0].args.p_merchant_id, "b2");
  assert.equal(await repo.createAffiliateCommissionFromPaidInvoice({ ...invoice, status: "open" }, "b2"), null);
  state.rpcError = { message: "private" }; await assert.rejects(() => repo.createAffiliateCommissionFromPaidInvoice(invoice, "b2"), /impossible/);
});
test("API administration : refus marchand et origine étrangère, activation autorisée uniquement à l’admin", async () => {
  const request = origin => new Request("http://localhost/api/affiliates/accounts/workspace:b", { method: "PATCH", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ status: "active" }) });
  const context = { params: Promise.resolve({ id: "workspace:b" }) };
  assert.equal((await route.PATCH(request("http://localhost"), context)).status, 403); assert.deepEqual(state.writes, []);
  state.session.user.email = "pierreh.brunelle@gmail.com";
  assert.equal((await route.PATCH(request("https://foreign.example"), context)).status, 403);
  assert.equal((await route.PATCH(request("http://localhost"), context)).status, 200);
});
test("Mon compte : lecture du compte actif, exclusion des rôles d’établissement et des comptes désactivés", async () => {
  renderToStaticMarkup(await accountPage({})); assert.equal(state.accountProps.affiliateSummary.account.workspaceId, "a");
  state.session.user.role = "manager"; renderToStaticMarkup(await accountPage({})); assert.equal(state.accountProps.affiliateSummary, null);
  state.session.user.role = "owner"; state.tables.affiliate_accounts[0].status = "disabled";
  renderToStaticMarkup(await accountPage({})); assert.equal(state.accountProps.affiliateSummary, null);
});
test("erreur de lecture : pas d’affiliés manquants présentés comme un résultat vide", async () => {
  state.failTable = "merchant_users";
  await assert.rejects(() => repo.getAffiliateAdminOverview(), /Lecture des comptes/);
});
test("plus de 1 000 inscriptions : aucun compte tronqué par le plafond REST", async () => {
  state.pageSize = 100; state.tables.affiliate_accounts = [];
  const ids = Array.from({ length: 1005 }, (_, i) => String(i).padStart(4, "0"));
  state.tables.merchants = ids.map(id => ({ id: `site-${id}`, workspace_id: `workspace-${id}`, company_name: "Compte" }));
  state.tables.merchant_workspaces = ids.map(id => ({ id: `workspace-${id}`, name: "Compte", created_at: id }));
  state.tables.merchant_users = ids.map(id => ({ id: `user-${id}`, merchant_id: `site-${id}`, first_name: "Test", last_name: id, email: `test-${id}@example.test`, created_at: id }));
  state.tables.merchant_workspace_memberships = ids.map(id => ({ id: `member-${id}`, workspace_id: `workspace-${id}`, merchant_user_id: `user-${id}`, role: "owner", status: "active" }));
  const result = await repo.getAffiliateAdminOverview();
  assert.equal(result.accounts.length, 1005); assert.equal(result.totals.affiliates, 1005);
  assert.equal(result.accounts[0].merchantEmail, "test-1004@example.test"); assert.deepEqual(state.writes, []);
});
