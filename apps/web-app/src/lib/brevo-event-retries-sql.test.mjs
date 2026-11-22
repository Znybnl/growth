import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const deliveryMigration = readFileSync(new URL("../../../../supabase/migrations/20261117100000_brevo_onboarding_event_deliveries.sql", import.meta.url), "utf8");
const monitoringMigration = readFileSync(new URL("../../../../supabase/migrations/20261118120000_brevo_event_retry_monitoring.sql", import.meta.url), "utf8");
const deliveryRollback = readFileSync(new URL("../../../../supabase/rollback/20261117100000_brevo_onboarding_event_deliveries.sql", import.meta.url), "utf8");
const monitoringRollback = readFileSync(new URL("../../../../supabase/rollback/20261118120000_brevo_event_retry_monitoring.sql", import.meta.url), "utf8");

test("RPC Brevo : reprise atomique, erreurs ambiguës, monitoring non nominatif, droits et rollback", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      set time zone 'UTC';
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create function auth.role() returns text language sql as 'select current_user::text';
      create table merchants(id text primary key, company_name text not null);
      create table merchant_users(id text primary key, merchant_id text not null references merchants(id) on delete cascade, email text not null);
      create table business_logs(id text primary key, merchant_id text, level text, event text, summary text, created_at timestamptz);
      insert into merchants values ('m1','Commerce démo'),('m2','Autre commerce');
      insert into merchant_users values ('u1','m1','owner@example.test'),('u2','m2','other@example.test');
    `);
    await db.exec(deliveryMigration);
    await db.exec(deliveryMigration);
    await db.exec(monitoringMigration);
    const now = "2026-11-18T12:00:00Z";
    await db.query(`insert into brevo_event_deliveries
      (dedupe_key,merchant_id,merchant_user_id,event_name,event_properties,status,attempts,last_attempt_at,next_attempt_at,last_error_code,last_error_status,created_at,updated_at)
      values
      ('retry-due','m1','u1','okado_trial_started','{}','retry',1,'2026-11-17T12:00Z','2026-11-18T11:00Z','brevo_http_503',503,'2026-11-17T12:00Z','2026-11-17T12:00Z'),
      ('retry-later','m1','u1','okado_game_published','{}','retry',1,'2026-11-17T12:00Z','2026-11-19T11:00Z','brevo_http_429',429,'2026-11-17T12:00Z','2026-11-17T12:00Z'),
      ('interrupted-session-secret','m1','u1','okado_game_metrics_updated','{}','processing',1,'2026-11-17T11:00Z',null,null,null,'2026-11-17T11:00Z','2026-11-17T11:00Z'),
      ('old-failure','m1','u1','okado_onboarding_completed','{}','failed',2,'2026-11-17T10:00Z',null,null,500,'2026-11-17T10:00Z','2026-11-17T10:00Z'),
      ('retry-limit','m1','u1','okado_onboarding_completed','{}','retry',5,'2026-11-17T10:00Z','2026-11-17T11:00Z','brevo_http_503',503,'2026-11-17T10:00Z','2026-11-17T10:00Z'),
      ('success','m2','u2','okado_game_published','{}','sent',1,'2026-11-17T09:00Z',null,null,null,'2026-11-17T09:00Z','2026-11-17T09:00Z')`);

    const claimed = (await db.query("select * from claim_brevo_event_retry($1)", [now])).rows[0];
    assert.equal(claimed.dedupe_key, "retry-due");
    assert.equal(claimed.status, "processing");
    assert.equal(claimed.attempts, 2);
    assert.equal((await db.query("select * from claim_brevo_event_retry($1)", [now])).rows[0], undefined);

    const interrupted = (await db.query("select status,last_error_code from brevo_event_deliveries where dedupe_key='interrupted-session-secret'")).rows[0];
    assert.deepEqual(interrupted, { status: "needs_review", last_error_code: "processing_interrupted" });
    const oldFailure = (await db.query("select status,last_error_code from brevo_event_deliveries where dedupe_key='old-failure'")).rows[0];
    assert.deepEqual(oldFailure, { status: "needs_review", last_error_code: "previous_failure_needs_review" });
    const capped = (await db.query("select status,last_error_code from brevo_event_deliveries where dedupe_key='retry-limit'")).rows[0];
    assert.deepEqual(capped, { status: "needs_review", last_error_code: "retry_limit_reached" });

    await db.query("insert into business_logs values ('run',null,'info','brevo_event_retry_run','Traités : 1', $1)", [now]);
    const monitoring = (await db.query("select get_brevo_event_monitoring($1,$2,$3,$4,$5,$6,$7) result", [null,"",null,null,"all",1,25])).rows[0].result;
    assert.equal(monitoring.total, 6);
    assert.equal(monitoring.stats.needsReview, 3);
    assert.equal(monitoring.stats.lastRun.event, "brevo_event_retry_run");
    assert.ok(monitoring.rows.every((row) => !JSON.stringify(row).includes("@example.test")));
    assert.ok(monitoring.rows.every((row) => !JSON.stringify(row).includes("interrupted-session-secret")));

    await db.exec("set role authenticated");
    await assert.rejects(db.query("select * from claim_brevo_event_retry($1)", [now]), /permission denied/);
    await assert.rejects(db.query("select get_brevo_event_monitoring()"), /permission denied/);
    await db.exec("reset role");
    await db.exec("set role service_role");
    assert.ok((await db.query("select get_brevo_event_monitoring() result")).rows[0].result);
    await db.exec("reset role");

    await db.exec(monitoringRollback);
    await db.exec(deliveryRollback);
    await assert.rejects(db.query("select * from claim_brevo_event_retry($1)", [now]), /does not exist/);
  } finally {
    await db.close();
  }
});
