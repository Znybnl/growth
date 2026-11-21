import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const read = path => readFileSync(new URL(`../../../../supabase/${path}`, import.meta.url), "utf8");

test("la consultation est isolée, persistante et n’acquitte jamais un nouvel événement", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table campaigns(id text primary key,merchant_id text,is_active boolean);
      create table leads(id text primary key,campaign_id text,prize_id text,status text,reward_expires_at timestamptz);
      create table prizes(id text primary key,campaign_id text,total_quantity integer,remaining_quantity integer);
      create table reward_email_deliveries(id text primary key,campaign_id text,lead_id text,status text,
        support_is_handled boolean default false,updated_at timestamptz,last_event_at timestamptz,resend_email_id text,error_message text);
      create table reward_email_events(reward_email_delivery_id text,resend_email_id text,event_type text,payload jsonb);
      create function get_merchant_operational_alerts(text) returns integer language sql as 'select 1';
      insert into campaigns values ('a','m',true),('b','m',true),('c','other',true);
      insert into leads values ('l1','a','p','claimed',null),('l2','b','p','claimed',null),('l3','c','p','claimed',null);
      insert into reward_email_deliveries values
       ('d1','a','l1','bounced',false,'2026-01-03','2026-01-01T00:00:00.123456Z','provider','message'),
       ('d2','b','l2','failed',false,'2026-01-02',null,'p2','message'),
       ('d3','c','l3','failed',false,'2026-01-02',null,'p3','message');
      insert into reward_email_events values ('d1','provider','email.bounced',
       '{"created_at":"2026-01-01T00:00:00.123456Z","data":{"bounce":{"type":"Permanent"}}}');`);
    await db.exec(read("migrations/20261119010000_merchant_email_alerts_828.sql"));
    await db.exec(read("migrations/20261119010000_merchant_email_alerts_828.sql"));
    assert.equal((await db.query("select bounce_type from reward_email_deliveries where id='d1'")).rows[0].bounce_type, "Permanent");
    const first = (await db.query("select * from get_merchant_operational_alerts('m')")).rows[0];
    assert.equal(first.email_count, 2); assert.equal(first.email_campaign_id, "a");
    await db.query("select see_merchant_email_alerts('other','a',$1::jsonb)", [JSON.stringify(first.email_snapshot)]);
    assert.equal((await db.query("select * from get_merchant_operational_alerts('m')")).rows[0].email_count, 2);
    await db.query("select see_merchant_email_alerts('m','a',$1::jsonb)", [JSON.stringify(first.email_snapshot)]);
    const after = (await db.query("select * from get_merchant_operational_alerts('m')")).rows[0];
    assert.equal(after.email_count, 1); assert.equal(after.email_campaign_id, "b");
    const delivery = (await db.query("select status,error_message,support_is_handled from reward_email_deliveries where id='d1'")).rows[0];
    assert.deepEqual(delivery, { status: "bounced", error_message: "message", support_is_handled: false });
    await db.exec("update reward_email_deliveries set last_event_at='2026-01-01T00:00:00.123457Z' where id='d1'");
    await db.query("select see_merchant_email_alerts('m','a',$1::jsonb)", [JSON.stringify(first.email_snapshot)]);
    assert.equal((await db.query("select * from get_merchant_operational_alerts('m')")).rows[0].email_count, 2);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select * from get_merchant_operational_alerts('m')"), /permission denied/);
      await assert.rejects(db.query("select see_merchant_email_alerts('m','a','[]')"), /permission denied/);
      await db.exec("reset role");
    }
    await db.exec(read("rollback/20261119010000_merchant_email_alerts_828.sql"));
    assert.equal((await db.query("select status from reward_email_deliveries where id='d1'")).rows[0].status, "bounced");
  } finally { await db.close(); }
});
