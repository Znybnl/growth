import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { stockState, isPendingGain, globalConversion, marketingVolumes, activeSubscriptionOrTrial, effectiveRedemptionDate } from "./metric-rules.ts";
import { readAllRows } from "./paginated-read.ts";

const sql = name => readFileSync(new URL("../../../../supabase/migrations/" + name, import.meta.url), "utf8");
const migration = sql("20261013150000_consistent_metrics_498.sql");
const rollback = readFileSync(new URL("../../../../supabase/rollback/20261013150000_consistent_metrics_498.sql", import.meta.url), "utf8");
async function database() {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; set time zone 'UTC';");
  const initial = sql("20260611_init_full_project.sql");
  for (const table of ["merchants", "campaigns", "campaign_actions", "prizes", "leads", "campaign_events"]) {
    await db.exec(initial.match(new RegExp("create table if not exists public\\." + table + " \\([\\s\\S]*?\\n\\);"))[0]);
  }
  await db.exec(`alter table leads add column redeemed_at timestamptz;
    alter table leads add column redeemed_by_user_id text,add column purchase_verified boolean default false;
    alter table prizes add column if not exists purchase_required boolean default false;
    create table cashier_redemption_audits(id text primary key,merchant_id text,campaign_id text,lead_id text,
      redemption_code text,operator_user_id text,status text,purchase_verified boolean,idempotency_key text,reason text,created_at timestamptz,
      unique(merchant_id,idempotency_key));
    create table reward_email_deliveries(id text primary key,campaign_id text,status text,support_is_handled boolean default false);`);
  const sessions = sql("20260619_public_draw_sessions.sql");
  await db.exec(sessions.slice(0, sessions.indexOf("create or replace function")));
  const integrity = sql("20260712_game_flow_integrity.sql");
  for (const name of ["redeem_campaign_lead_prize", "reset_campaign_lead_prize"]) {
    await db.exec(integrity.match(new RegExp("create or replace function public\\." + name + "\\([\\s\\S]*?\\n\\$\\$;"))[0]);
  }
  await db.exec("grant all on all tables in schema public to service_role; alter table leads enable row level security; alter table campaign_events enable row level security;");
  await db.exec(sql("20261013120000_participation_metrics_496.sql"));
  await db.exec(migration);
  await db.exec(`insert into merchants(id,company_name,logo_text) values('m','Fictif','Logo'),('foreign','Autre','Logo');
    insert into campaigns(id,merchant_id,title,goal_type,cta_label,success_metric,accent_ink,accent_paper,accent_signal,game_type)
    values('c','m','Test','social_follow','Jouer','Participation','#000','#fff','#123','wheel'),
    ('foreign-c','foreign','Autre','social_follow','Jouer','Participation','#000','#fff','#123','scratch');
    insert into prizes(id,campaign_id,label,total_quantity,remaining_quantity,probability,estimated_unit_cost)
    values('p','c','Lot',100,20,100,4),('unlimited','c','Illimité',null,null,1,2);
    insert into campaign_actions(id,campaign_id,position,kind,label,url) values('instagram','c',0,'instagram','Suivre','https://example.test');`);
  return db;
}
test("seuil de stock commun, épuisé distinct, illimité et petit stock", () => {
  assert.equal(stockState(20,100), "low"); assert.equal(stockState(21,100), "available");
  assert.equal(stockState(0,100), "exhausted"); assert.equal(stockState(null,null), "unlimited");
  assert.equal(stockState(1,2), "low"); assert.equal(stockState(3,null), "available");
});

test("#500 SQL : charge utile sans images, mêmes indicateurs, alertes isolées, ACL et rollback", async () => {
  const db = await database();
  try {
    await db.exec("alter table reward_email_deliveries add column lead_id text, add column updated_at timestamptz;");
    const optimized = sql("20261014150000_merchant_page_performance_500.sql");
    await db.exec(optimized);
    await db.exec(optimized);
    await db.exec(`update campaigns set background_image_url='data:image/png;base64,'||repeat('A',1700000),
      logo_url='data:image/png;base64,'||repeat('B',150000) where id='c';
      insert into leads(id,campaign_id,first_name,email,marketing_consent,prize_id,status,reward_expires_at)
      select 'pending-'||n,'c','Fictif','test@example.test',true,'unlimited','claimed',null from generate_series(1,1005) n;
      insert into leads(id,campaign_id,first_name,email,prize_id,status,reward_expires_at) values
      ('expired','c','Fictif','test@example.test','p','claimed',now()-interval '1 day'),
      ('redeemed','c','Fictif','test@example.test','p','redeemed',null),
      ('loss','c','Fictif','test@example.test',null,'claimed',null),
      ('other','foreign-c','Autre','test@example.test',null,'claimed',null);
      insert into reward_email_deliveries(id,campaign_id,lead_id,status,support_is_handled,updated_at) values
      ('valid','c','pending-1','failed',false,now()),
      ('handled','c','pending-2','failed',true,now()),
      ('expired','c','expired','failed',false,now()),
      ('redeemed','c','redeemed','bounced',false,now()),
      ('loss','c','loss','failed',false,now()),
      ('cross','c','other','failed',false,now());
      insert into prizes(id,campaign_id,label,total_quantity,remaining_quantity,probability,estimated_unit_cost)
      values('zero','c','Épuisé',10,0,0,0);`);
    const [page] = (await db.query("select * from get_merchant_page_overview('m')")).rows;
    const [old] = (await db.query("select * from get_merchant_campaign_overview('m')")).rows;
    for (const key of ['scans_count','games_count','leads_count','wins_count','redeemed_count','actions_count','estimated_spend'])
      assert.equal(Number(page.metrics[key]),Number(old[key]),key);
    assert.equal(page.metrics.opt_ins,1005);
    assert.deepEqual(page.pending_redemptions,[{prizeId:'unlimited',count:1005}]);
    assert.equal(page.campaign.logo_url,null);
    assert.equal(page.campaign.background_image_url,null);
    assert.equal('campaign_local_settings' in page.campaign,false);
    assert.ok(JSON.stringify(page).length < 5000);
    assert.ok(JSON.stringify(page).length < JSON.stringify(old).length * .01);
    assert.equal((await db.query("select * from get_merchant_page_overview('missing')")).rows.length,0);
    const [alerts] = (await db.query("select * from get_merchant_operational_alerts('m')")).rows;
    assert.equal(alerts.email_count,1);
    assert.equal(alerts.low_stock_count,1);
    assert.equal(alerts.exhausted_stock_count,1);
    const [foreign] = (await db.query("select * from get_merchant_operational_alerts('foreign')")).rows;
    assert.equal(foreign.email_count,0);
    assert.equal(foreign.low_stock_count,0);
    await db.exec("update campaigns set is_active=false where id='c'");
    assert.equal((await db.query("select * from get_merchant_operational_alerts('m')")).rows[0].low_stock_count,0);
    for (const role of ['anon','authenticated']) {
      await db.exec('set role '+role);
      for (const name of ['get_merchant_page_overview','get_merchant_operational_alerts'])
        await assert.rejects(()=>db.query("select * from "+name+"('m')"),/permission denied/);
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    assert.equal((await db.query("select * from get_merchant_page_overview('m')")).rows.length,1);
    await db.exec('reset role');
    await db.exec(readFileSync(new URL("../../../../supabase/rollback/20261014150000_merchant_page_performance_500.sql",import.meta.url),'utf8'));
    assert.equal((await db.query("select count(*) n from leads")).rows[0].n,1009);
    assert.ok((await db.query("select * from get_merchant_campaign_overview('m')")).rows.length);
  } finally { await db.close(); }
});
test("gain en attente : lot, état et expiration ; disponibilité future reste à suivre", () => {
  const now=Date.now(), base={prizeId:"p",status:"claimed"};
  assert.equal(isPendingGain(base,now),true);
  assert.equal(isPendingGain({...base,prizeId:null},now),false);
  assert.equal(isPendingGain({...base,status:"redeemed"},now),false);
  assert.equal(isPendingGain({...base,rewardExpiresAt:new Date(now-1).toISOString()},now),false);
  assert.equal(isPendingGain({...base,rewardExpiresAt:new Date(now+1).toISOString()},now),true);
});
test("conversion globale pondérée, jeux sans activité, zéro scans et absence de bornage artificiel", () => {
  assert.equal(globalConversion([{kpis:{games:1,scans:1}},{kpis:{games:1,scans:99}}]),2);
  assert.equal(globalConversion([]),0); assert.equal(globalConversion([{kpis:{games:2,scans:0}}]),0);
  assert.equal(globalConversion([{kpis:{games:3,scans:1}}]),300);
});
test("essai applicatif et abonnements : prédicat partagé sans Stripe", () => {
  const now=Date.now();
  assert.equal(activeSubscriptionOrTrial(null,new Date(now+60000).toISOString(),now),true);
  assert.equal(activeSubscriptionOrTrial("active",null,now),true);
  assert.equal(activeSubscriptionOrTrial(null,new Date(now-60000).toISOString(),now),false);
  assert.equal(activeSubscriptionOrTrial("trialing",new Date(now-60000).toISOString(),now),false);
});
test("volumes fondés sur les clics, indépendants des contacts et de l'ordre des actions", () => {
  const events=[{eventType:"social_clicked",metadata:{actionId:"b"}},{eventType:"review_clicked"},
    {eventType:"social_clicked",metadata:{actionId:"deleted"}},{eventType:"lead_created"}];
  const rows=marketingVolumes(events,[{id:"a"},{id:"b"}]);
  assert.equal(rows.reduce((n,r)=>n+r.value,0),3); assert.equal(rows[1].value,1); assert.equal(rows.at(-1).value,2);
});
test("pagination réelle >1000 et plafond serveur inférieur ; panne ne devient pas total partiel", async () => {
  const rows=Array.from({length:1203},(_,id)=>({id}));
  const result=await readAllRows(async(start,end)=>({data:rows.slice(start,Math.min(end+1,start+200)),count:rows.length,error:null}));
  assert.equal(result.data.length,1203); assert.equal(new Set(result.data.map(r=>r.id)).size,1203);
  const failed=await readAllRows(async(start)=>start?{data:null,error:{message:"failure"}}:{data:rows.slice(0,500),count:1203,error:null});
  assert.equal(failed.data,null); assert.equal(failed.error.message,"failure");
});
test("ancien retrait : aucune date inventée et reset antérieur pris en compte", () => {
  const lead={id:"l",status:"redeemed",createdAt:"2026-01-01T00:00:00Z"};
  assert.equal(effectiveRedemptionDate(lead,[]),undefined);
  const events=[{leadId:"l",eventType:"prize_redeemed",createdAt:"2026-01-02T00:00:00Z"},
    {leadId:"l",eventType:"prize_reset",createdAt:"2026-01-03T00:00:00Z"}];
  assert.equal(effectiveRedemptionDate(lead,events),undefined);
});
test("SQL réel : métriques, clicks idempotents, historiques, retraits, opt-ins et >1000 concordent", async () => {
  const db=await database(); try {
    await db.exec(`insert into leads(id,campaign_id,first_name,email,marketing_consent,prize_id,status,created_at,reward_expires_at)
      select 'l-'||n,'c','Fictif','test@example.test',true,'unlimited','claimed',now()-interval '30 days',null from generate_series(1,1005) n;
      insert into leads(id,campaign_id,first_name,email,status,prize_id,reward_expires_at,created_at) values
      ('expired','c','Fictif','test@example.test','claimed','p',now()-interval '1 day',now()-interval '30 days'),
      ('loss','c','Fictif','test@example.test','claimed',null,null,now()-interval '30 days'),
      ('historical','c','Fictif','test@example.test','redeemed','p',null,now()-interval '30 days'),
      ('undated','c','Fictif','test@example.test','redeemed','p',null,now()-interval '30 days');
      insert into campaign_events(id,campaign_id,lead_id,event_type,created_at) values
      ('r','c','historical','prize_redeemed',((now() at time zone 'UTC')::date-6)::timestamp + interval '1 minute'),
      ('s','c',null,'social_clicked',now());`);
    for(let i=0;i<2;i++)await db.query("select record_marketing_click('c','click-id','social_clicked','instagram','session')");
    await assert.rejects(()=>db.query("select record_marketing_click('foreign-c','click-id','social_clicked','instagram','session')"),/Action indisponible/);
    const summary=(await db.query("select * from get_campaign_data_summary('c')")).rows[0];
    const overview=(await db.query("select * from get_merchant_campaign_overview('m')")).rows[0];
    for(const key of ['scans_count','leads_count','games_count','actions_count','wins_count','redeemed_count','estimated_spend'])assert.equal(summary[key],overview[key],key);
    assert.equal(summary.actions_count,2); assert.equal(summary.action_volumes.reduce((n,r)=>n+r.value,0),2);
    assert.equal(summary.action_volumes.find(r=>r.actionId==='instagram').value,1);
    assert.equal(summary.daily_stats[0].redeemed,1);
    const detail=(await db.query("select * from get_merchant_metric_details('m')")).rows[0];
    assert.equal(detail.opt_ins,1005);assert.equal(detail.undated_redemptions,1);
    assert.equal(detail.pending_redemptions.reduce((n,r)=>n+r.count,0),1005);
    const admin=(await db.query("select * from get_platform_operational_metrics() where merchant_id='m'")).rows[0];
    assert.equal(admin.pending_rewards,1005);assert.equal(admin.low_stock,1);assert.equal(admin.exhausted_stock,0);
    const digest=(await db.query("select get_merchant_gain_notification_digest_context('m',(now() at time zone 'UTC')::date-6,(now() at time zone 'UTC')::date+1) value")).rows[0].value;
    assert.equal(digest.redeemedCount,1);
    assert.equal((await db.query("select redeemed_at from leads where id='historical'")).rows[0].redeemed_at,null);
    await db.exec("update campaigns set is_active=false where id='c';");
    assert.equal((await db.query("select low_stock from get_platform_operational_metrics() where merchant_id='m'")).rows[0].low_stock,0);
    await db.exec("update campaigns set is_active=true where id='c';");
    await db.exec("update leads set status='redeemed' where id='l-1';");
    const date=(await db.query("select redeemed_at from leads where id='l-1'")).rows[0].redeemed_at;
    assert.ok(date);
    await db.exec("update leads set status='claimed' where id='l-1';");
    assert.equal((await db.query("select redeemed_at from leads where id='l-1'")).rows[0].redeemed_at,null);
    await db.exec("update leads set redeemed_at=now()-interval '5 days' where id='l-1';");
    // Legacy real withdrawal writes date and event in one transaction too.
    await db.query("select * from redeem_campaign_lead_prize('l-1')");
    assert.ok((await db.query("select redeemed_at from leads where id='l-1'")).rows[0].redeemed_at);
    assert.equal((await db.query("select redeemed_at>now()-interval '1 minute' fresh from leads where id='l-1'")).rows[0].fresh,true);
    await assert.rejects(()=>db.query("select * from redeem_campaign_lead_prize('l-1')"));
    await db.query("select * from redeem_cashier_lead_prize('l-2','m','operator',false,'cashier-once')");
    await db.query("select * from redeem_cashier_lead_prize('l-2','m','operator',false,'cashier-once')");
    await assert.rejects(()=>db.query("select * from redeem_cashier_lead_prize('l-3','m','operator',false,'cashier-once')"),/incompatible/);
    assert.equal((await db.query("select count(*) n from campaign_events where lead_id='l-2' and event_type='prize_redeemed'")).rows[0].n,1);
    await db.query("select * from reset_campaign_lead_prize('l-2')");
    assert.equal((await db.query("select redeemed_at from leads where id='l-2'")).rows[0].redeemed_at,null);
    await assert.rejects(()=>db.query("select * from redeem_cashier_lead_prize('l-2','m','operator',false,'cashier-once')"),/réinitialisé/);
    await db.query("select * from redeem_cashier_lead_prize('l-2','m','operator',false,'new-withdrawal')");
    await assert.rejects(()=>db.query("select * from redeem_cashier_lead_prize('l-3','foreign','operator',false,'foreign')"),/Gain introuvable/);
    await assert.rejects(()=>db.query("select * from redeem_cashier_lead_prize_force('expired','m','operator',false,'forced',true,'court')"));
    await db.query("select * from redeem_cashier_lead_prize_force('expired','m','operator',false,'forced',true,'Retrait autorisé après expiration')");
    assert.ok((await db.query("select redeemed_at from leads where id='expired'")).rows[0].redeemed_at);
    await db.exec("update prizes set purchase_required=true where id='p';");
    await db.exec("update leads set status='expired' where id='expired';");
    await assert.rejects(()=>db.query("select * from redeem_cashier_lead_prize_force('expired','m','operator',false,'purchase-required',true,'Retrait autorisé après expiration')"));
    assert.equal((await db.query("select redeemed_at from leads where id='expired'")).rows[0].redeemed_at,null);
    await db.exec(migration);
    assert.equal((await db.query("select count(*) n from campaign_events where metadata->>'eventId'='click-id'")).rows[0].n,1);
    for(const role of ['anon','authenticated']) {
      await db.exec('set role '+role);
      for(const query of ["select * from campaign_effective_redemptions","select * from get_campaign_metric_counts(array['c'])",
        "select * from get_merchant_metric_details('m')","select * from get_platform_operational_metrics()",
        "select record_marketing_click('c','x','social_clicked','instagram','session')",
        "select * from redeem_cashier_lead_prize('l-3','m','operator',false,'denied')",
        "select * from redeem_cashier_lead_prize_force('expired','m','operator',true,'denied',true,'Motif fictif autorisé')"]){await assert.rejects(()=>db.query(query),/permission denied/);}
      await db.exec('reset role');
    }
    await db.exec(rollback);
    assert.equal((await db.query("select count(*) n from leads")).rows[0].n,1009);
    assert.ok((await db.query("select * from get_campaign_data_summary('c')")).rows.length);
  } finally {await db.close();}
});
