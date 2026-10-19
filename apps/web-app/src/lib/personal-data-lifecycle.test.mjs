import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(new URL("../../../../supabase/migrations/20260831_personal_data_lifecycle.sql", import.meta.url), "utf8");

test("SQL historique : seuils 3/5 ans depuis création, archives restreintes et suppression des dépendances", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create function auth.role() returns text language sql as $$ select current_user::text $$;
      create table campaigns(id text primary key, merchant_id text);
      create table leads(
        id text primary key,campaign_id text,first_name text,email text,phone text,
        marketing_consent boolean default false,consent_timestamp timestamptz,prize_id text,
        status text default 'claimed',action_confirmed boolean default false,redemption_code text,
        reward_available_at timestamptz,reward_expires_at timestamptz,redeemed_at timestamptz,
        purchase_verified boolean default false,created_at timestamptz
      );
      create table campaign_events(id text primary key,campaign_id text,lead_id text references leads(id) on delete set null,event_type text,created_at timestamptz,metadata jsonb);
      create table cashier_redemption_audits(id text primary key,merchant_id text,campaign_id text,lead_id text references leads(id),redemption_code text,operator_user_id text,status text,purchase_verified boolean,idempotency_key text,reason text,created_at timestamptz);
      create table reward_email_deliveries(id text primary key,lead_id text references leads(id));
      insert into campaigns values('game','merchant');
      insert into leads(id,campaign_id,first_name,email,created_at) values
        ('recent','game','Fixture','fixture@example.test',now()-interval '2 years'),
        ('boundary','game','Fixture','fixture@example.test',now()-interval '3 years'+interval '1 day'),
        ('archive','game','Fixture','fixture@example.test',now()-interval '3 years'-interval '1 day'),
        ('expired','game','Fixture','fixture@example.test',now()-interval '5 years'-interval '1 day');
      insert into reward_email_deliveries values ('email','archive');
      insert into campaign_events values('event','game','archive','prize_won',now()-interval '4 years','{"private":"not archived"}');
      insert into cashier_redemption_audits(id,merchant_id,campaign_id,lead_id,redemption_code,status,purchase_verified,created_at)
        values('audit','merchant','game','archive','FIXTURE-CODE','redeemed',false,now()-interval '4 years');
    `);
    await db.exec(migration);
    const rights = (await db.query(`select
      has_function_privilege('anon','public.purge_personal_data()','execute') anon,
      has_function_privilege('authenticated','public.purge_personal_data()','execute') authenticated,
      has_function_privilege('service_role','public.purge_personal_data()','execute') service`)).rows[0];
    assert.deepEqual(rights, { anon: false, authenticated: false, service: true });
    const tables = (await db.query(`select relname,relrowsecurity from pg_class where relname in ('archived_leads','archived_campaign_events','archived_cashier_redemption_audits')`)).rows;
    assert.equal(tables.length, 3);
    assert.ok(tables.every((row) => row.relrowsecurity));
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select * from archived_leads"), /permission denied/);
      await assert.rejects(db.query("select purge_personal_data()"), /permission denied/);
      await db.exec("reset role");
    }
    await db.query("select purge_personal_data()");
    assert.deepEqual((await db.query("select id from leads order by id")).rows.map((row) => row.id), ["boundary", "recent"]);
    assert.deepEqual((await db.query("select id from archived_leads order by id")).rows.map((row) => row.id), ["archive"]);
    assert.equal((await db.query("select count(*)::int n from reward_email_deliveries")).rows[0].n, 0);
    assert.equal((await db.query("select count(*)::int n from archived_cashier_redemption_audits")).rows[0].n, 1);
    const event = (await db.query("select * from archived_campaign_events")).rows[0];
    assert.equal("metadata" in event, false);
    assert.equal((await db.query("select count(*)::int n from archived_leads where purge_after<>original_created_at+interval '5 years'")).rows[0].n, 0);
    // The old RPC can run again in a new transaction without duplicate archives.
    await db.query("select purge_personal_data()");
    assert.equal((await db.query("select count(*)::int n from archived_leads")).rows[0].n, 1);
  } finally { await db.close(); }
});
