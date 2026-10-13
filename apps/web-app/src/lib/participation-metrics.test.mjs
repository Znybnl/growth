import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { participationDates } from "./participation-metrics.ts";
import { issueParticipationToken, verifyParticipationToken } from "./participation-token.ts";
import { recordScratchParticipation } from "./public-participation.ts";

const migration = readFileSync(new URL("../../../../supabase/migrations/20261013120000_participation_metrics_496.sql", import.meta.url), "utf8");
const rollback = readFileSync(new URL("../../../../supabase/rollback/20261013120000_participation_metrics_496.sql", import.meta.url), "utf8");
const source = name => readFileSync(new URL("../../../../supabase/migrations/" + name, import.meta.url), "utf8");
async function database() {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; set time zone 'UTC';");
  const initial = source("20260611_init_full_project.sql");
  for (const name of ["merchants", "campaigns", "campaign_actions", "prizes", "leads", "campaign_events"]) {
    await db.exec(initial.match(new RegExp("create table if not exists public\\." + name + " \\([\\s\\S]*?\\n\\);"))[0]);
  }
  await db.exec("alter table campaigns add column campaign_local_settings jsonb default '{}';");
  const sessions = source("20260619_public_draw_sessions.sql");
  await db.exec(sessions.slice(0, sessions.indexOf("create or replace function")));
  await db.exec(source("20260805_scratch_participation_on_first_touch.sql"));
  const finalize = source("20260714_participation_interval_and_email_lock.sql");
  await db.exec(finalize.slice(finalize.indexOf("create or replace function public.finalize_draw_session_and_create_lead"), finalize.indexOf("revoke all on function")));
  await db.exec(source("20260701_review_clicked_actions_metric.sql"));
  await db.exec(source("20260714_fix_reward_reset_metrics.sql"));
  await db.exec("alter table leads enable row level security; alter table campaign_events enable row level security; grant all on all tables in schema public to service_role;");
  await db.exec(migration);
  await db.exec(`insert into merchants(id,company_name,logo_text) values('m','Commerce fictif','Logo'),('other','Autre','Logo');
    insert into campaigns(id,merchant_id,title,goal_type,cta_label,success_metric,accent_ink,accent_paper,accent_signal,game_type)
    values('wheel','m','Roue','social_follow','Jouer','Participation','#000','#fff','#123','wheel'),
    ('scratch','m','Ticket','social_follow','Jouer','Participation','#000','#fff','#123','scratch'),
    ('foreign','other','Autre','social_follow','Jouer','Participation','#000','#fff','#123','scratch');`);
  return db;
}
const summary = async (db, c) => (await db.query("select * from get_campaign_data_summary($1)", [c])).rows[0];
const session = (db, c, id) => db.query("select * from create_draw_session($1,$2)", [c,id]);
const played = async (db, c, id) => (await db.query("select record_draw_session_participation($1,$2) ok", [c,id])).rows[0].ok;
const finalize = (db, id, lead, email) => db.query("select * from finalize_draw_session_and_create_lead($1,$2,$3,$4,$5)", [id,lead,"Fictif",email,false]);

test("roue perdante anonyme, scan seul et ticket préparé : compteurs indépendants", async () => {
  const db = await database(); try {
    await db.exec("insert into campaign_events(id,campaign_id,event_type) values('scan','wheel','scan');");
    assert.equal((await summary(db,"wheel")).games_count,0);
    await session(db,"wheel","s-wheel"); await session(db,"scratch","s-scratch");
    assert.equal((await summary(db,"wheel")).games_count,1);
    assert.equal((await summary(db,"wheel")).leads_count,0);
    assert.equal((await summary(db,"wheel")).daily_stats.at(-1).participations,1);
    assert.equal((await summary(db,"scratch")).games_count,0);
    assert.equal(await played(db,"scratch","s-scratch"),true);
    assert.equal(await played(db,"scratch","s-scratch"),true);
    const ticket = await summary(db,"scratch");
    assert.equal(ticket.games_count,1); assert.equal(ticket.leads_count,0);
    assert.equal(ticket.daily_stats.at(-1).participations,1);
    assert.equal((await db.query("select count(*) n from campaign_events where campaign_id='scratch' and event_type='game_played'")).rows[0].n,1);
  } finally { await db.close(); }
});

test("gain/perte et formulaire ne créent pas de deuxième participation ; RPC réexécutable", async () => {
  const db = await database(); try {
    await session(db,"wheel","loss"); await finalize(db,"loss","l-lost","lost@example.test");
    let s = await summary(db,"wheel"); assert.equal(s.games_count,1); assert.equal(s.leads_count,1); assert.equal(s.wins_count,0);
    await db.exec("insert into prizes(id,campaign_id,label,probability) values('p','wheel','Lot fictif',100);");
    await session(db,"wheel","win");
    s=await summary(db,"wheel"); assert.equal(s.games_count,2); assert.equal(s.leads_count,1);
    await finalize(db,"win","l-win","win@example.test");
    assert.equal((await summary(db,"wheel")).games_count,2);
    await assert.rejects(()=>finalize(db,"win","duplicate","win@example.test"));
    await session(db,"scratch","ticket"); await played(db,"scratch","ticket");
    await finalize(db,"ticket","l-ticket","ticket@example.test");
    assert.equal(await played(db,"scratch","ticket"),true); // lost acknowledgement, even after finalization
    assert.equal((await summary(db,"scratch")).games_count,1);
    await session(db,"scratch","race"); await finalize(db,"race","l-race","race@example.test");
    assert.equal(await played(db,"scratch","race"),true);
    assert.equal((await summary(db,"scratch")).games_count,2);
    await db.exec(migration);
    assert.equal((await summary(db,"wheel")).games_count,2);
    const overview=(await db.query("select games_count,leads_count from get_merchant_campaign_overview('m') where id='wheel'")).rows[0];
    assert.deepEqual(overview,{games_count:2,leads_count:2});
  } finally { await db.close(); }
});

test("session étrangère, expirée, brouillon, inexistante, accès public et preview exclus", async () => {
  const db = await database(); try {
    await session(db,"scratch","expired");
    await db.exec("update draw_sessions set expires_at=now()-interval '1 minute' where id='expired';");
    assert.equal(await played(db,"scratch","expired"),false);
    await session(db,"scratch","draft"); await db.exec("update campaigns set is_active=false where id='scratch';");
    assert.equal(await played(db,"scratch","draft"),false);
    assert.equal(await played(db,"foreign","draft"),false);
    assert.equal(await played(db,"scratch","missing"),false);
    await db.exec("create table preview_participations(id text, campaign_id text); insert into preview_participations values('preview','wheel');");
    assert.equal((await summary(db,"wheel")).games_count,0);
    for (const role of ["anon","authenticated"]) {
      await db.exec("set role " + role);
      await assert.rejects(()=>db.query("select * from campaign_participations"),/permission denied/);
      await assert.rejects(()=>played(db,"scratch","draft"),/permission denied/);
      await assert.rejects(()=>db.query("select * from get_merchant_participation_activity('m')"),/permission denied/);
      await assert.rejects(()=>db.query("select * from get_merchant_participation_counts('m')"),/permission denied/);
      await assert.rejects(()=>db.query("select * from get_merchant_campaign_overview('m')"),/permission denied/);
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    assert.equal((await db.query("select count(*) n from campaign_participations")).rows[0].n,0);
    await db.exec("reset role");
  } finally { await db.close(); }
});

test("historique fiable dédoublonné, premier jour UTC complet, >1000 parties et sites isolés", async () => {
  const db=await database();try {
    await db.exec(`insert into campaign_events(id,campaign_id,event_type,metadata,created_at)
      select 'many-'||n,'wheel','game_played',jsonb_build_object('sessionId','historical-'||n),
      ((now() at time zone 'UTC')::date - 6)::timestamp at time zone 'UTC' from generate_series(1,1005) n;
      insert into campaign_events(id,campaign_id,event_type,metadata) values('duplicate','wheel','game_played','{"sessionId":"historical-1"}');
      insert into leads(id,campaign_id,first_name,email,status) values('legacy','wheel','Fictif','legacy@example.test','lost');
      insert into campaign_events(id,campaign_id,lead_id,event_type) values('old-event','wheel','legacy','game_played');`);
    assert.equal((await summary(db,"wheel")).games_count,1006);
    assert.equal((await summary(db,"wheel")).daily_stats[0].participations,1005);
    const days=(await db.query("select * from get_merchant_participation_activity('m')")).rows;
    assert.equal(days.reduce((n,d)=>n+d.participations,0),1006);
    assert.equal((await db.query("select * from get_merchant_participation_activity('other')")).rows.reduce((n,d)=>n+d.participations,0),0);
    await db.exec(rollback);
    assert.equal((await summary(db,"wheel")).games_count,1007); // previous raw event logic
    assert.equal((await summary(db,"wheel")).leads_count,1);
    assert.equal((await db.query("select count(*) n from campaign_events")).rows[0].n,1007);
  } finally {await db.close();}
});

test("helper mémoire : partie anonyme, contact rattaché, doublon, scan et date de jeu", () => {
  const event=(id,type,metadata={},leadId)=>({id,campaignId:"c",eventType:type,metadata,leadId,createdAt:"2026-10-12T23:59:00Z"});
  const lead={id:"l",campaignId:"c",createdAt:"2026-10-13T00:01:00Z"};
  const events=[event("a","game_played",{sessionId:"s"}),event("retry","game_played",{sessionId:"s"}),event("contact","lead_created",{sessionId:"s"},"l"),event("scan","scan")];
  assert.deepEqual(participationDates([lead],events),["2026-10-12T23:59:00Z"]);
  assert.equal(participationDates([],events).length,1);
  assert.equal(participationDates([],[event("scan","scan")]).length,0);
});

test("capacité signée : autre campagne/session, falsification, expiration et token de preview refusés", () => {
  const token=issueParticipationToken("c","s",new Date(Date.now()+60000).toISOString());
  assert.equal(verifyParticipationToken(token,"c","s"),true);
  for(const [value,c,s] of [[token,"other","s"],[token,"c","other"],[token+"a","c","s"],[token+".extra","c","s"],["preview-session-token","c","s"]]) assert.equal(verifyParticipationToken(value,c,s),false);
  assert.equal(verifyParticipationToken(issueParticipationToken("c","s",new Date(0).toISOString()),"c","s"),false);
});

test("client : premier grattage transmis sans coordonnées, retries idempotents et preview sans requête", async () => {
  const s={id:"s",campaignId:"c",participationToken:"signed",expiresAt:new Date(Date.now()+60000).toISOString()};
  const calls=[]; assert.equal(await recordScratchParticipation(s,async(url,options)=>{calls.push([url,options]);return new Response(null,{status:calls.length===1?503:200});}),true);
  assert.equal(calls.length,2);assert.equal(calls[0][0],"/api/public/draw/played");
  assert.equal(calls[0][1].body,calls[1][1].body);assert.equal(JSON.parse(calls[0][1].body).email,undefined);
  assert.equal(await recordScratchParticipation({...s,isPreview:true},()=>{throw Error("must not send")}),true);
  let n=0;assert.equal(await recordScratchParticipation(s,async()=>{n++;return new Response(null,{status:403});}),false);assert.equal(n,1);
});
