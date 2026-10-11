import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(new URL("../../../../supabase/migrations/20261011220000_support_monitoring_491.sql", import.meta.url), "utf8");
const rollback = readFileSync(new URL("../../../../supabase/rollback/20261011220000_support_monitoring_491.sql", import.meta.url), "utf8");

test("RPC SQL : recherche complète, pagination, compteurs, isolement, statuts, droits et rollback sans mutation", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      set time zone 'UTC';
      create role anon; create role authenticated; create role service_role;
      create table merchants(id text primary key,company_name text);
      create table campaigns(id text primary key,merchant_id text,title text);
      create table prizes(id text primary key,label text);
      create table leads(id text primary key,campaign_id text,prize_id text,first_name text,email text,
        status text,redemption_code text,reward_available_at timestamptz,reward_expires_at timestamptz,created_at timestamptz);
      create table reward_email_deliveries(id text primary key,campaign_id text,lead_id text,recipient_email text,
        status text,error_message text,last_event_at timestamptz,created_at timestamptz,
        support_is_handled boolean default false,support_handled_at timestamptz);
      create table reward_email_events(id text primary key,reward_email_delivery_id text,resend_email_id text,event_type text,created_at timestamptz);
      create table merchant_gain_notification_jobs(id text primary key,merchant_id text,merchant_name text,
        frequency text,status text,attempts integer,recipient text,period_start timestamptz,period_end timestamptz,
        part integer,parts integer,retry_at timestamptz,sent_at timestamptz,created_at timestamptz);
      create table merchant_gain_notification_events(merchant_id text,job_id text,won_at timestamptz);
      create table business_logs(id text primary key,merchant_id text,campaign_id text,lead_id text,email text,
        redemption_code text,level text,event text,summary text,created_at timestamptz);
      insert into merchants values ('a','Institut Démo'),('b','Autre établissement'),('empty','Sans jeu');
      insert into campaigns values ('c','a','Jeu Démo'),('foreign','b','Jeu étranger');
      insert into prizes values ('p','Soin offert');
      insert into leads values ('lead','c','p','Camille','player@example.test','claimed','DEMO',
        '2026-10-11T12:00Z','2026-11-11T12:00Z','2026-10-11T12:00Z');
      insert into leads select 'l'||n,'c','p','Test','test@example.test','redeemed','CODE'||n,null,null,'2026-10-11T12:00Z' from generate_series(1,60) n;
      insert into reward_email_deliveries
        select 'd'||n,'c','lead','player@example.test','failed','Erreur',null,
          '2026-10-11T12:00Z'::timestamptz+n*interval '1 minute',false,null from generate_series(1,60) n;
      insert into reward_email_deliveries values ('old','c','lead','older@example.test','bounced','Historique',
        '2026-06-30T09:05:00.123456Z','2026-06-30T09:05Z',true,'2026-10-11T12:00Z'),
        ('sent','foreign','lead','other@example.test','sent',null,null,'2026-10-11T12:00Z',false,null);
      insert into reward_email_events values ('unlinked',null,'provider-1','email.delivered','2026-06-18T18:10Z'),
        ('linked','d1','provider-2','email.bounced','2026-10-11T13:00Z');
      insert into merchant_gain_notification_jobs values
        ('retry','a','Institut Démo','instant','pending',2,'owner@example.test','2026-10-11T12:00Z','2026-10-11T12:01Z',1,1,'2026-10-12T12:00Z',null,'2026-10-11T12:00Z'),
        ('review','a','Institut Démo','weekly','needs_review',6,null,'2026-10-01T12:00Z','2026-10-08T12:00Z',1,1,'2026-10-12T12:00Z',null,'2026-10-11T12:00Z');
      insert into merchant_gain_notification_events values ('a',null,'2026-10-10T12:00Z');
      insert into business_logs values ('global',null,null,null,null,null,'info','gain_notification_scheduled_run','Acceptés : 2','2026-10-11T12:00Z'),
        ('error','a','c',null,null,null,'error','test','Erreur démo','2026-10-11T12:00Z');
    `);
    await db.exec(migration);
    await db.exec(migration);
    const call = async (section, extra = {}) => {
      const args = {merchant:null,q:"",from:null,until:null,status:"all",incidents:"all",page:1,size:25,...extra};
      return (await db.query("select get_support_monitoring($1,$2,$3,$4,$5,$6,$7,$8,$9) result",
        [section,args.merchant,args.q,args.from,args.until,args.status,args.incidents,args.page,args.size])).rows[0].result;
    };
    const first = await call("emails",{merchant:"a"});
    assert.equal(first.total,63); assert.equal(first.rows.length,25); assert.equal(first.stats.incidents,60);
    assert.equal(first.stats.jobsRetry,1); assert.equal(first.stats.jobsReview,1); assert.equal(first.stats.eventsWaiting,1);
    const last = await call("emails",{merchant:"a",page:3});
    assert.equal(last.rows.length,13);assert.equal(last.page,3);
    assert.equal((await call("emails",{merchant:"a",page:999999})).page,3);
    const unique = new Set([...first.rows,...(await call("emails",{merchant:"a",page:2})).rows,...last.rows].map(r=>r.kind+r.id));
    assert.equal(unique.size,63);assert.ok(!unique.has("rewardsent"));
    assert.equal((await call("emails",{q:"OLDER@",incidents:"handled"})).total,1);
    const old=(await call("emails",{incidents:"handled"})).rows[0];
    assert.equal(old.eventAt,"2026-06-30T09:05:00.123456+00:00");assert.equal(old.canHandle,false);
    assert.equal((await call("emails",{merchant:"a",q:"d1",incidents:"active"})).total,11);
    assert.equal((await call("emails",{status:"retry"})).rows[0].kind,"notification");
    assert.equal((await call("emails",{q:"%"})).total,0); // literal search, not SQL wildcard
    assert.equal((await call("emails",{q:"' or true --"})).total,0);
    assert.equal((await call("emails",{merchant:"no-such"})).total,0);
    assert.equal((await call("emails",{from:"2026-10-12T00:00Z",until:"2026-10-13T00:00Z"})).total,0);
    const webhook = await call("webhooks");
    assert.equal(webhook.total,2);assert.ok(webhook.rows.some(r=>r.id==="unlinked"));
    assert.equal((await call("webhooks",{merchant:"a"})).total,1);
    assert.equal((await call("claims")).total,61);
    assert.equal((await call("claims",{status:"redeemed"})).total,60);
    assert.equal((await call("logs",{merchant:"empty"})).total,0);
    assert.equal((await call("logs",{merchant:"a"})).stats.errorLogs,1);
    assert.equal((await call("logs",{from:"2026-10-12T00:00Z"})).stats.errorLogs,0);
    assert.equal((await call("logs",{merchant:"empty"})).stats.lastRun.event,"gain_notification_scheduled_run");
    assert.equal((await call("locations")).length,3);
    await assert.rejects(call("emails",{size:51}),/Invalid monitoring/);
    await assert.rejects(call("emails",{from:"2026-10-13T00:00Z",until:"2026-10-12T00:00Z"}),/Invalid monitoring/);
    for(const role of ["anon","authenticated"]){
      await db.exec(`set role ${role}`);
      await assert.rejects(call("locations"),/permission denied/);
      await db.exec("reset role");
    }
    await db.exec("set role service_role");assert.equal((await call("emails")).total,64);await db.exec("reset role");
    // A missing journal does not affect the other RPC branches.
    await db.exec("alter table business_logs rename to missing_business_logs");
    await assert.rejects(call("logs"),/does not exist/);
    assert.equal((await call("emails")).total,64);
    await db.exec("alter table missing_business_logs rename to business_logs");
    assert.equal((await db.query("select count(*) n from reward_email_deliveries")).rows[0].n,62);
    assert.equal((await db.query("select attempts from merchant_gain_notification_jobs where id='retry'")).rows[0].attempts,2);
    await db.exec(rollback);
    await assert.rejects(call("emails"),/does not exist/);
  } finally {await db.close();}
});
