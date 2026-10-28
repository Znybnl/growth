import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { readAllRows } from "./paginated-read.ts";
import * as rules from "./metric-rules.ts";

const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const testModule = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module: testModule, exports: testModule.exports, Date, Map, Set, Error,
    require: name => name in dependencies ? dependencies[name] : name.startsWith("@/") ? {} : require(name) });
  return testModule.exports;
}

function fixture() {
  const site = (id, workspace_id, extra = {}) => ({ id, workspace_id, company_name: id, ...extra });
  const user = (id, merchant_id) => ({ id, merchant_id, first_name: id, last_name: "Test", email: `${id}@example.test`, created_at: "2026-01-01" });
  const membership = (id, workspace_id, merchant_user_id, role = "owner", status = "active") => ({ id, workspace_id, merchant_user_id, role, status });
  return {
    merchants: [site("a1", "a", { onboarding_completed: true, stripe_subscription_status: "active" }),
      site("a2", "a", { onboarding_completed: true, trial_end_date: "2999-01-01" }),
      site("b1", "b"), site("technical", "technical"), site("inactive", "inactive")],
    merchant_users: [user("alice", "a1"), user("co-owner", "a2"), user("bob", "a1"), user("inactive", "inactive")],
    merchant_workspaces: ["a", "b", "technical", "inactive", "empty"].map(id => ({ id, name: id, created_at: "2026-01-01" })),
    merchant_workspace_memberships: [membership("1", "a", "alice"), membership("2", "a", "co-owner"),
      membership("3", "b", "bob"), membership("4", "technical", "alice", "admin"),
      membership("5", "inactive", "inactive", "owner", "inactive"), membership("6", "empty", "alice"),
      membership("7", "technical", "missing")],
    campaigns: [{ id: "c", merchant_id: "a1", is_active: true }],
    metrics: [{ merchant_id: "a1", contacts: 51, pending_rewards: 8, low_stock: 1, exhausted_stock: 0, failed_emails: 0 }],
  };
}

function repository(tables, errorTable) {
  const reads = [];
  const query = table => {
    let start = 0, end = Infinity;
    const q = {
      select() { return q; }, order() { return q; },
      range(a, b) { start = a; end = b; return q; },
      then(resolve, reject) {
        reads.push({ table, start });
        const rows = tables[table] ?? [];
        return Promise.resolve({ data: rows.slice(start, end + 1), count: rows.length,
          error: errorTable === table ? { message: "private database details" } : null }).then(resolve, reject);
      },
    };
    return q;
  };
  const db = { from: query, rpc: name => { assert.equal(name, "get_platform_operational_metrics"); return query("metrics"); } };
  const repo = load("./admin-repository.ts", {
    "@/lib/supabase": { getSupabaseAdmin: () => db },
    "@/lib/paginated-read": { readAllRows }, "@/lib/metric-rules": rules,
    "@/lib/affiliate-account-directory": load("./affiliate-account-directory.ts"),
    "@/lib/admin-last-sign-in": { readAdminLastSignIns: async () => new Map() },
    "@/lib/stripe": { getStripeClient: () => { throw Error("Unexpected Stripe access"); } },
  });
  return { ...repo, reads };
}

test("registered accounts are deduplicated across sites/owners, independent of affiliation and selected site", async () => {
  const repo = repository(fixture());
  const result = await repo.getSaasAdminOverview();
  assert.equal(result.totals.accounts, 2);
  assert.equal(result.totals.merchants, 5);
  assert.equal(result.totals.onboardedMerchants, 2);
  assert.equal(result.totals.activeSubscriptions, 2);
  assert.equal(result.totals.activeCampaigns, 1);
  assert.equal(result.totals.leads, 51);
  assert.equal(result.totals.pendingRewards, 8);
  const filtered = await repo.getSaasAdminOverview("nobody-matches");
  assert.equal(filtered.users.length, 0);
  assert.deepEqual(filtered.totals, result.totals);
  assert.equal(repo.reads.some(read => /affiliate/.test(read.table)), false);
});

test("global account and establishment counts include all pages beyond the database row ceiling", async () => {
  const tables = fixture();
  tables.merchants = []; tables.merchant_users = []; tables.merchant_workspace_memberships = []; tables.merchant_workspaces = [];
  for (let i = 0; i < 1003; i++) {
    const id = String(i).padStart(4, "0");
    tables.merchants.push({ id, workspace_id: id, company_name: id });
    tables.merchant_users.push({ id, merchant_id: id, created_at: "2026-01-01" });
    tables.merchant_workspace_memberships.push({ id, workspace_id: id, merchant_user_id: id, role: "owner", status: "active" });
    tables.merchant_workspaces.push({ id, name: id });
  }
  const repo = repository(tables);
  const result = await repo.getSaasAdminOverview();
  assert.equal(result.totals.accounts, 1003);
  assert.equal(result.totals.merchants, 1003);
  for (const table of ["merchants", "merchant_users", "merchant_workspace_memberships", "merchant_workspaces"]) {
    assert.deepEqual(repo.reads.filter(read => read.table === table).map(read => read.start), [0, 500, 1000]);
  }
});

for (const table of ["merchant_workspace_memberships", "merchant_workspaces"]) {
  test(`failed ${table} read never produces a fabricated zero or leaks database details`, async () => {
    await assert.rejects(repository(fixture(), table).getSaasAdminOverview(),
      error => error.message === "Lecture du pilotage impossible.");
  });
}
