import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const sql = name => readFileSync(new URL(`../../../../supabase/${name}`, import.meta.url), "utf8");
const migration = sql("migrations/20261028110000_affiliate_merchant_accounts_677.sql");
const rollback = sql("rollback/20261028110000_affiliate_merchant_accounts_677.sql");
async function database({ migrate = true } = {}) {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create function auth.role() returns text language sql as 'select current_user::text';
    create table merchant_workspaces(id text primary key);
    create table merchants(id text primary key,workspace_id text references merchant_workspaces(id));
    insert into merchant_workspaces values('a'),('b');
    insert into merchants values('a1','a'),('a2','a'),('b1','b'),('b2','b');`);
  await db.exec(sql("migrations/20260630_affiliate_program.sql"));
  await db.exec(`insert into affiliate_referrals(affiliate_account_id,affiliate_merchant_id,referred_merchant_id,referral_code)
    select id,'a1','b1',code from affiliate_accounts where merchant_id='a1';`);
  if (migrate) await db.exec(migration);
  return db;
}
async function activate(db) { await db.exec("update affiliate_accounts set status='active' where workspace_id='a' and canonical_account_id is null"); }
async function paid(db, id, at, amount = 5000, site = "b1", subscription = "sub-first") {
  return (await db.query("select record_affiliate_paid_invoice_677($1,$2,$3,$4,'eur',$5) id", [site, id, at, amount, subscription])).rows[0].id;
}
test("2 mois payés, 3 interrompus, 2 repris = 4 commissions, fenêtre initiale inchangée", async () => {
  const db = await database(); try {
    await activate(db);
    for (const month of [1, 2]) assert.ok(await paid(db, `invoice-${month}`, `2026-0${month}-15T10:00Z`));
    await db.exec("update affiliate_referrals set status='canceled'");
    const before = (await db.query("select first_subscription_paid_at,commission_eligible_until from affiliate_referrals")).rows[0];
    for (const month of [6, 7]) assert.ok(await paid(db, `invoice-${month}`, `2026-0${month}-15T10:00Z`, 5000, "b2", "sub-resumed"));
    const ref = (await db.query("select * from affiliate_referrals")).rows[0];
    assert.equal(ref.status, "active");
    assert.deepEqual([ref.first_subscription_paid_at, ref.commission_eligible_until], [before.first_subscription_paid_at, before.commission_eligible_until]);
    assert.equal((await db.query("select count(*)::int n,sum(commission_amount_cents)::int total from affiliate_commissions")).rows[0].n, 4);
    assert.equal((await db.query("select sum(commission_amount_cents)::int total from affiliate_commissions")).rows[0].total, 8000);
    assert.equal(await paid(db, "invoice-13", "2027-01-15T10:00Z"), null);
    assert.equal(await paid(db, "invoice-later", "2027-06-15T10:00Z"), null);
  } finally { await db.close(); }
});
test("facture unique, montant nul, statut désactivé, mois civil et permissions privées", async () => {
  const db = await database(); try {
    assert.equal(await paid(db, "off", "2026-01-31T10:00Z"), null);
    await activate(db); await db.exec("update affiliate_accounts set commission_duration_months=1 where workspace_id='a'");
    assert.equal(await paid(db, "free", "2026-01-31T10:00Z", 0), null);
    assert.ok(await paid(db, "one", "2026-01-31T10:00Z"));
    assert.equal(await paid(db, "one", "2026-01-31T10:00Z"), null);
    assert.equal(await paid(db, "outside", "2026-02-28T10:00Z"), null);
    const ref = (await db.query("select commission_eligible_until from affiliate_referrals")).rows[0];
    assert.equal(new Date(ref.commission_eligible_until).toISOString(), "2026-02-28T10:00:00.000Z");
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(() => paid(db, "forged", "2026-02-01T10:00Z"), /permission denied/);
      await assert.rejects(() => db.query("select * from affiliate_accounts"), /permission denied/);
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    assert.ok(await paid(db, "service", "2026-02-01T10:00Z"));
  } finally { await db.close(); }
});
test("migration conserve codes et historique, une affiliation par compte, pas d’auto-parrainage multi-site, rollback", async () => {
  const db = await database({ migrate: false }); try {
    const original = (await db.query("select id,code,merchant_id,status from affiliate_accounts order by id")).rows;
    await db.exec(migration);
    assert.deepEqual((await db.query("select id,code,merchant_id,status from affiliate_accounts order by id")).rows, original);
    assert.equal((await db.query("select count(*)::int n from affiliate_accounts where canonical_account_id is null")).rows[0].n, 2);
    assert.equal((await db.query("select count(*)::int n from affiliate_accounts where canonical_account_id is not null")).rows[0].n, 2);
    await db.exec("insert into merchants values('a3','a')");
    await assert.rejects(() => db.exec("insert into affiliate_accounts(merchant_id,workspace_id,code) values('a3','a','NEW')"), /unique|duplicate/);
    await assert.rejects(() => db.exec("update affiliate_referrals set referred_merchant_id='a2',referred_workspace_id='a'"), /check constraint/);
    await activate(db); assert.ok(await paid(db, "historical", "2026-01-15T10:00Z"));
    await db.exec(rollback);
    assert.equal((await db.query("select count(*)::int n from affiliate_accounts")).rows[0].n, 4);
    assert.equal((await db.query("select count(*)::int n from affiliate_referrals")).rows[0].n, 1);
    assert.equal((await db.query("select count(*)::int n from affiliate_commissions")).rows[0].n, 1);
  } finally { await db.close(); }
});
test("paramètres historiques actifs contradictoires : arrêt sans perte de données", async () => {
  const db = await database({ migrate: false }); try {
    await db.exec("update affiliate_accounts set status='active',commission_rate_bps=case when merchant_id='a1' then 3000 else 4000 end where merchant_id in ('a1','a2')");
    await assert.rejects(() => db.exec(migration), /contradictoires/);
    await db.exec("rollback");
    assert.equal((await db.query("select count(*)::int n from affiliate_accounts")).rows[0].n, 4);
  } finally { await db.close(); }
});
test("compatibilité des anciennes écritures avant déploiement et contrôle de périmètre", async () => {
  const db = await database(); try {
    await db.exec("insert into merchant_workspaces values('c');insert into merchants values('c1','c')");
    await db.exec("insert into affiliate_accounts(merchant_id,code) values('c1','LEGACY')");
    assert.equal((await db.query("select workspace_id from affiliate_accounts where code='LEGACY'")).rows[0].workspace_id, "c");
    await db.exec(`insert into affiliate_referrals(affiliate_account_id,affiliate_merchant_id,referred_merchant_id,referral_code)
      select id,merchant_id,'c1',code from affiliate_accounts where workspace_id='a' and canonical_account_id is null`);
    assert.equal((await db.query("select referred_workspace_id from affiliate_referrals where referred_merchant_id='c1'")).rows[0].referred_workspace_id, "c");
    await assert.rejects(() => db.exec("update affiliate_accounts set workspace_id='a' where code='LEGACY'"), /Périmètre/);
    await assert.rejects(() => db.exec("update affiliate_referrals set referred_workspace_id='b' where referred_merchant_id='c1'"), /Périmètre/);
  } finally { await db.close(); }
});
test("fenêtre historique récupérée depuis les factures, jamais redémarrée à la reprise", async () => {
  const db = await database(); try {
    await activate(db);
    await db.exec(`insert into affiliate_commissions(referral_id,affiliate_merchant_id,referred_merchant_id,stripe_invoice_id,
      invoice_paid_at,invoice_amount_cents,commission_rate_bps,commission_amount_cents)
      select id,'a1','b1','old-invoice','2025-01-15T10:00Z',5000,4000,2000 from affiliate_referrals;
      update affiliate_referrals set status='canceled';`);
    assert.equal(await paid(db, "too-late", "2026-02-01T10:00Z"), null);
    assert.ok(await paid(db, "in-window", "2025-06-01T10:00Z"));
    const ref = (await db.query("select first_subscription_paid_at,commission_eligible_until from affiliate_referrals")).rows[0];
    assert.equal(new Date(ref.first_subscription_paid_at).toISOString(), "2025-01-15T10:00:00.000Z");
    assert.equal(new Date(ref.commission_eligible_until).toISOString(), "2026-01-15T10:00:00.000Z");
  } finally { await db.close(); }
});
test("erreur après insertion : commission et fenêtre annulées dans la même transaction", async () => {
  const db = await database(); try {
    await activate(db);
    await db.exec(`create function fail_ref() returns trigger language plpgsql as $$ begin raise exception 'expected rollback'; end $$;
      create trigger fail_ref before update on affiliate_referrals for each row execute function fail_ref();`);
    await assert.rejects(() => paid(db, "atomic", "2026-01-15T10:00Z"), /expected rollback/);
    assert.equal((await db.query("select count(*)::int n from affiliate_commissions")).rows[0].n, 0);
    assert.equal((await db.query("select first_subscription_paid_at from affiliate_referrals")).rows[0].first_subscription_paid_at, null);
  } finally { await db.close(); }
});
