import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(new URL("../../../../supabase/migrations/20261011_support_email_incidents_487.sql", import.meta.url), "utf8");
const rollback = readFileSync(new URL("../../../../supabase/rollback/20261011_support_email_incidents_487.sql", import.meta.url), "utf8");
const id = "11111111-1111-4111-8111-111111111111";
const event = "2026-06-30T09:05:00Z";

test("migration/RPC : clôture atomique, réapparition, droits privés, données et retries préservés, rollback", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create table merchant_users(id text primary key);
      insert into merchant_users values ('admin'),('other-admin');
      create table reward_email_deliveries(
        id uuid primary key, campaign_id text, status text, last_event_at timestamptz,
        error_message text, retry_count integer, next_retry_at timestamptz,
        recipient_email text, created_at timestamptz default now()
      );
      alter table reward_email_deliveries enable row level security;
      create policy reward_email_deliveries_service_role_all on reward_email_deliveries
        for all to service_role using (true) with check (true);
      grant all on reward_email_deliveries to service_role;
      create table reward_email_events(id text primary key, event_type text);
      insert into reward_email_events values ('old-event','email.failed');
      insert into reward_email_deliveries(id,campaign_id,status,last_event_at,error_message,retry_count,next_retry_at,recipient_email)
        values ('${id}','campaign-demo','failed','${event}','Ancienne erreur',2,'2026-10-12T10:00Z','player@example.test');
    `);
    await db.exec(migration);
    await db.exec(migration); // safe re-execution
    const row = async () => (await db.query("select * from reward_email_deliveries")).rows[0];
    const before = await row();
    assert.equal(before.support_is_handled, false);
    await assert.rejects(db.query("select handle_support_email_incident($1,'unknown',$2,'failed')", [id, event]), /Unknown actor/);
    assert.equal((await db.query("select handle_support_email_incident($1,'admin',$2,'failed') ok", [id, event])).rows[0].ok, true);
    const handled = await row();
    assert.equal(handled.support_is_handled, true);
    assert.equal(handled.support_handled_by, "admin");
    assert.ok(handled.support_handled_at);
    for (const field of ["status","last_event_at","error_message","retry_count","next_retry_at","recipient_email"]) {
      assert.deepEqual(handled[field], before[field]);
    }
    await db.query("select handle_support_email_incident($1,'other-admin',$2,'failed')", [id, event]);
    assert.deepEqual((await row()).support_handled_at, handled.support_handled_at);
    assert.equal((await row()).support_handled_by, "admin");
    await db.exec("update reward_email_deliveries set last_event_at='2026-10-11T12:00Z',error_message='Nouvel échec'");
    assert.equal((await row()).support_is_handled, false);
    assert.ok((await row()).support_handled_at); // old acknowledgement retained
    assert.equal((await db.query("select handle_support_email_incident($1,'admin',$2,'failed') ok", [id, event])).rows[0].ok, false);
    assert.equal((await db.query("select handle_support_email_incident($1,'admin','2026-10-11T12:00Z','failed') ok", [id])).rows[0].ok, true);
    await db.exec("update reward_email_deliveries set status='bounced'");
    assert.equal((await row()).support_is_handled, false); // status change even at identical timestamp
    assert.equal((await db.query("select handle_support_email_incident($1,'admin','2026-10-11T12:00Z','failed') ok", [id])).rows[0].ok, false);
    await db.exec("update reward_email_deliveries set status='sent'");
    assert.equal((await db.query("select handle_support_email_incident($1,'admin','2026-10-11T12:00Z','sent') ok", [id])).rows[0].ok, false);
    // Legacy records without a provider timestamp remain actionable.
    await db.exec("update reward_email_deliveries set status='failed',last_event_at=null");
    assert.equal((await db.query("select handle_support_email_incident($1,'admin',null,'failed') ok", [id])).rows[0].ok, true);
    assert.equal((await row()).support_is_handled, true);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select * from reward_email_deliveries"), /permission denied/);
      await assert.rejects(db.query("select handle_support_email_incident($1,'admin',null,'failed')", [id]), /permission denied/);
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    assert.equal((await db.query("select handle_support_email_incident($1,'admin',null,'failed') ok", [id])).rows[0].ok, true);
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int n from reward_email_events")).rows[0].n, 1);
    await db.exec(rollback);
    assert.equal((await row()).support_is_handled, undefined);
    assert.equal((await row()).retry_count, 2);
    assert.equal((await db.query("select count(*)::int n from reward_email_events")).rows[0].n, 1);
  } finally { await db.close(); }
});
