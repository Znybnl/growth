import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const migration=readFileSync(new URL("../../../../supabase/migrations/20261012090000_reward_expiry_reminders_304.sql",import.meta.url),"utf8");
const rollback=readFileSync(new URL("../../../../supabase/rollback/20261012090000_reward_expiry_reminders_304.sql",import.meta.url),"utf8");
const dailyMigration=readFileSync(new URL("../../../../supabase/migrations/20261012160000_reward_reminder_daily_vercel_304.sql",import.meta.url),"utf8");
const dailyRollback=readFileSync(new URL("../../../../supabase/rollback/20261012160000_reward_reminder_daily_vercel_304.sql",import.meta.url),"utf8");
const now="2030-10-12T07:00:00Z";
async function database(){const db=new PGlite();await db.exec(`
set time zone 'UTC'; create role anon; create role authenticated; create role service_role;
create table merchant_workspaces(id text primary key);
create table merchant_workspace_memberships(id text,workspace_id text,merchant_user_id text,role text,status text);
create table merchants(id text primary key,workspace_id text,location_status text,time_zone text,company_name text,appointment_url text,restaurant_email text,industry text);
create table campaigns(id text primary key,merchant_id text,title text,logo_url text,campaign_local_settings jsonb);
create table prizes(id text primary key,campaign_id text,label text,purchase_required boolean);
create table leads(id text primary key,campaign_id text,prize_id text,status text,email text,first_name text,redemption_code text,
created_at timestamptz,reward_expires_at timestamptz,reward_available_at timestamptz,redeemed_at timestamptz,is_preview boolean,prize_label_snapshot text,prize_usage_conditions_snapshot text);
create table reward_email_deliveries(id text primary key,status text); insert into reward_email_deliveries values('initial','delivered');
insert into merchant_workspaces values('w'),('other');
insert into merchant_workspace_memberships values('m','w','u','owner','active'),('m2','w','manager','manager','active'),('m3','other','v','owner','active');
insert into merchants(id,workspace_id,location_status,time_zone,company_name,restaurant_email) values('a','w','active','Europe/Paris','Institut Démo','shop@example.test'),('b','w','active','Europe/Paris','Deuxième site','shop2@example.test'),('x','other','active','Europe/Paris','Autre compte','other@example.test');
insert into campaigns values('c','a','Jeu','https://example.test/logo.png','{}'),('c2','b','Ticket',null,'{}'),('cx','x','Autre jeu',null,'{}');
insert into prizes values('p','c','Un soin',false),('p2','c2','Un soin 2',false),('px','cx','Autre lot',false);
`);await db.exec(migration);await db.exec(dailyMigration);return db;}
const rpc=async(db,name,args)=> (await db.query(`select ${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args)).rows[0].result;
async function enable(db){await rpc(db,'set_reward_reminder_settings',['u','w',true,7]);await db.exec("update reward_reminder_settings set updated_at='2030-09-01T00:00Z'");}
async function gain(db,id,c='c',p='p'){await db.query(`insert into leads(id,campaign_id,prize_id,status,email,first_name,redemption_code,created_at,reward_expires_at)
values($1,$2,$3,'claimed','camille@example.test','Camille','DEMO-NON-VALIDE','2030-09-01T00:00Z','2030-10-19T12:00Z')`,[id,c,p]);}
const claim=(db,date=now)=>rpc(db,'claim_reward_reminder',[date]);
const payload={to:'camille@example.test',from:'Démo <sender@example.test>',subject:'Rappel',html:'<p>Démo</p>',text:'Démo'};
const prepare=(db,j,value=payload)=>rpc(db,'prepare_reward_reminder',[j.id,j.lease_token,value,now]);
const authorize=(db,j,date=now)=>rpc(db,'authorize_reward_reminder',[j.id,j.lease_token,date]);
const finish=(db,j,provider='provider-test',date=now)=>rpc(db,'finish_reward_reminder',[j.id,j.lease_token,provider,date]);

test('réglage commun : défaut désactivé, permissions et migration réexécutable',async()=>{
const db=await database();try{
assert.deepEqual(await rpc(db,'get_reward_reminder_settings',['u','w']),{enabled:false,days:7,canEdit:true,updatedAt:null});
assert.equal((await db.query('select count(*) n from reward_reminder_settings')).rows[0].n,0);
assert.equal((await rpc(db,'get_reward_reminder_settings',['manager','w'])).canEdit,false);
await assert.rejects(rpc(db,'set_reward_reminder_settings',['manager','w',true,7]),e=>e.code==='42501');
await assert.rejects(rpc(db,'set_reward_reminder_settings',['u','other',true,7]),e=>e.code==='42501');
for(const days of [0,366,null])await assert.rejects(rpc(db,'set_reward_reminder_settings',['u','w',true,days]),e=>e.code==='22023');
await enable(db);await db.exec(migration);assert.equal((await rpc(db,'get_reward_reminder_settings',['u','w'])).enabled,true);
for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(rpc(db,'get_reward_reminder_settings',['u','w']),e=>e.code==='42501');await assert.rejects(db.query('select * from reward_reminder_jobs'),e=>e.code==='42501');await db.exec('reset role');}
}finally{await db.close();}});

test('éligibilité : multi-sites, 20 jours, exclusions et absence de rattrapage',async()=>{
const db=await database();try{
await enable(db);for(const id of ['ok','short','twenty','preview','redeemed','email','no-date','no-code','not-ready'])await gain(db,id);
await gain(db,'second','c2','p2');await gain(db,'foreign','cx','px');
await db.exec(`update leads set created_at='2030-09-30T12:00Z' where id='short'; update leads set created_at='2030-09-29T12:00Z' where id='twenty';
update leads set is_preview=true where id='preview';update leads set redeemed_at='2030-10-01' where id='redeemed';
update leads set email='invalid' where id='email';update leads set reward_expires_at=null where id='no-date';
update leads set redemption_code=null where id='no-code';update leads set reward_available_at='2030-10-13' where id='not-ready';`);
assert.equal(await rpc(db,'enqueue_reward_reminders',['2030-10-11T21:59:59Z']),0);
assert.equal(await rpc(db,'enqueue_reward_reminders',[now]),3);assert.equal(await rpc(db,'enqueue_reward_reminders',[now]),0);
assert.deepEqual((await db.query('select lead_id from reward_reminder_jobs order by lead_id')).rows.map(r=>r.lead_id),['ok','second','twenty']);
assert.equal(await rpc(db,'reward_reminder_gain_eligible',['ok','2030-10-12T08:59:00Z']),true);
assert.equal(await rpc(db,'reward_reminder_gain_eligible',['ok','2030-10-12T21:59:59Z']),true);
assert.equal(await rpc(db,'reward_reminder_gain_eligible',['ok','2030-10-12T22:00:00Z']),false);
assert.equal(await rpc(db,'enqueue_reward_reminders',['2030-10-13T07:00:00Z']),0);
}finally{await db.close();}});

test('jour local : été/hiver, transitions DST et délai personnalisé',async()=>{
const db=await database();try{
for(const [expiry,expected] of [['2030-03-31T12:00Z','2030-03-30T08:00:00Z'],['2030-04-01T12:00Z','2030-03-31T07:00:00Z'],['2030-10-27T12:00Z','2030-10-26T07:00:00Z'],['2030-10-28T12:00Z','2030-10-27T08:00:00Z']])assert.equal(Date.parse(await rpc(db,'reward_reminder_due',[expiry,1,'Europe/Paris'])),Date.parse(expected));
await enable(db);await rpc(db,'set_reward_reminder_settings',['u','w',true,3]);await db.exec("update reward_reminder_settings set updated_at='2030-09-01'");await gain(db,'custom');
assert.equal(await rpc(db,'enqueue_reward_reminders',[now]),0);assert.equal(await rpc(db,'enqueue_reward_reminders',['2030-10-16T07:00Z']),1);
}finally{await db.close();}});

test('lease, payload immuable, identité unique, expurgation et e-mail initial inchangé',async()=>{
const db=await database();try{
await enable(db);await gain(db,'ok');await rpc(db,'enqueue_reward_reminders',[now]);const j=await claim(db);
assert.equal(await claim(db),null);assert.deepEqual(await prepare(db,j),payload);assert.deepEqual(await prepare(db,j,{...payload,subject:'Changed'}),payload);
const input=await rpc(db,'get_reward_reminder_input',[j.id,j.lease_token,now]);assert.equal(input.prizeLabel,'Un soin');assert.equal(input.merchantEmail,'shop@example.test');
assert.equal(await authorize(db,j),true);assert.equal(await finish(db,j),true);await rpc(db,'enqueue_reward_reminders',[now]);assert.equal(await claim(db),null);
const row=(await db.query('select * from reward_reminder_jobs')).rows[0];assert.equal(row.status,'sent');assert.equal(row.email_payload,null);
assert.deepEqual((await db.query('select * from reward_email_deliveries')).rows,[{id:'initial',status:'delivered'}]);
await db.exec(rollback);assert.equal((await rpc(db,'get_reward_reminder_settings',['u','w'])).enabled,false);
}finally{await db.close();}});

test('reprise : même identité/payload, retrait et désactivation avant transmission',async()=>{
const db=await database();try{
await enable(db);await gain(db,'retry');await rpc(db,'enqueue_reward_reminders',[now]);const j=await claim(db);await prepare(db,j);await authorize(db,j);await finish(db,j,null);assert.equal(await claim(db),null);
const retry=await claim(db,'2030-10-12T07:00:31Z');assert.equal(retry.id,j.id);assert.deepEqual(retry.email_payload,payload);
await db.exec("update leads set status='redeemed' where id='retry'");assert.equal(await authorize(db,retry,'2030-10-12T07:00:31Z'),false);
await gain(db,'off');await rpc(db,'enqueue_reward_reminders',[now]);const off=await claim(db);await prepare(db,off);
await rpc(db,'set_reward_reminder_settings',['u','w',false,7]);assert.equal(await authorize(db,off),false);
}finally{await db.close();}});

test('runner exclusif, tentative ambiguë terminale et changement de délai sans doublon',async()=>{
const db=await database();try{
await enable(db);await gain(db,'ok');const t=await rpc(db,'acquire_reward_reminder_runner',[now]);assert.ok(t);assert.equal(await rpc(db,'acquire_reward_reminder_runner',[now]),null);
await rpc(db,'release_reward_reminder_runner',[t]);assert.ok(await rpc(db,'acquire_reward_reminder_runner',[now]));
await rpc(db,'enqueue_reward_reminders',[now]);const j=await claim(db);await prepare(db,j);await authorize(db,j);await finish(db,j,null);
assert.equal(await claim(db,'2030-10-13T07:00:00Z'),null);assert.equal((await db.query('select status from reward_reminder_jobs')).rows[0].status,'needs_review');
await rpc(db,'set_reward_reminder_settings',['u','w',true,3]);await db.exec("update reward_reminder_settings set updated_at='2030-09-01'");await rpc(db,'enqueue_reward_reminders',['2030-10-16T07:00Z']);
assert.equal((await db.query('select count(*) n from reward_reminder_jobs')).rows[0].n,1);
}finally{await db.close();}});

test('migration quotidienne réexécutable : arrêt du seul ancien cron, permissions et rollback sans perte',async()=>{
const db=await database();try{
await db.exec(`create schema cron;create table cron.job(jobid bigint primary key,jobname text);
insert into cron.job values(304,'okado-reward-expiry-reminders-304'),(473,'other-notifications'),(1,'maintenance');
create function cron.unschedule(p_id bigint) returns boolean language plpgsql as $$
begin delete from cron.job where jobid=p_id;return found;end $$;
`);
await enable(db);await gain(db,'ok');await db.exec(dailyMigration);await db.exec(dailyMigration);
assert.deepEqual((await db.query('select jobname from cron.job order by jobid')).rows.map(r=>r.jobname),['maintenance','other-notifications']);
assert.equal(await rpc(db,'reward_reminder_schedule_version',[]),'vercel-daily-v1');
assert.equal((await rpc(db,'get_reward_reminder_settings',['u','w'])).enabled,true);
for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(rpc(db,'reward_reminder_schedule_version',[]),error=>error.code==='42501');await db.exec('reset role');}
assert.equal(await rpc(db,'reward_reminder_gain_eligible',['ok','2030-10-12T08:45Z']),true);
await db.exec(dailyRollback);assert.equal(await rpc(db,'reward_reminder_schedule_version',[]),'supabase-nine-v1');
assert.equal(await rpc(db,'reward_reminder_gain_eligible',['ok','2030-10-12T08:45Z']),false);
assert.equal((await db.query('select count(*) n from leads')).rows[0].n,1);
assert.deepEqual((await db.query('select * from reward_email_deliveries')).rows,[{id:'initial',status:'delivered'}]);
assert.equal((await db.query('select count(*) n from cron.job')).rows[0].n,2);
}finally{await db.close();}});

test('passage Hobby tardif et activation du jour : pas de fenêtre de cinq minutes ni rattrapage',async()=>{
const db=await database();try{
await enable(db);await gain(db,'late');await db.exec("update reward_reminder_settings set updated_at='2030-10-12T08:15Z'");
assert.equal(await rpc(db,'enqueue_reward_reminders',['2030-10-12T08:14:59Z']),0);
assert.equal(await rpc(db,'enqueue_reward_reminders',['2030-10-12T08:45Z']),1);
const j=await claim(db,'2030-10-12T08:45Z');assert.ok(j);
assert.deepEqual(await rpc(db,'prepare_reward_reminder',[j.id,j.lease_token,payload,'2030-10-12T08:45Z']),payload);
assert.equal(await authorize(db,j,'2030-10-12T08:45Z'),true);await finish(db,j,'provider-late','2030-10-12T08:45Z');
assert.equal(await rpc(db,'enqueue_reward_reminders',['2030-10-12T09:30Z']),0);
await gain(db,'missed');assert.equal(await rpc(db,'enqueue_reward_reminders',['2030-10-13T08:45Z']),0);
}finally{await db.close();}});

test('jour civil au fuseau du site : minuit, heure indicative hiver/été et sécurité de reprise 23 h',async()=>{
const db=await database();try{
await enable(db);await gain(db,'zone');await db.exec("update merchants set time_zone='Pacific/Honolulu' where id='a'");
assert.equal(await rpc(db,'reward_reminder_gain_eligible',['zone','2030-10-12T08:45Z']),false);
assert.equal(await rpc(db,'reward_reminder_gain_eligible',['zone','2030-10-13T08:45Z']),true);
await db.exec("update merchants set time_zone='Europe/Paris' where id='a';update leads set created_at='2030-01-01',reward_expires_at='2030-02-19T12:00Z' where id='zone';update reward_reminder_settings set updated_at='2030-01-01'");
assert.equal(await rpc(db,'reward_reminder_gain_eligible',['zone','2030-02-12T08:45Z']),true);
await db.exec("update leads set reward_expires_at='2030-10-19T12:00Z' where id='zone'");
assert.equal(await rpc(db,'reward_reminder_gain_eligible',['zone','2030-10-12T08:45Z']),true);
await rpc(db,'enqueue_reward_reminders',['2030-10-11T22:01Z']);const j=await claim(db,'2030-10-11T22:01Z');
await rpc(db,'prepare_reward_reminder',[j.id,j.lease_token,payload,'2030-10-11T22:01Z']);await authorize(db,j,'2030-10-11T22:01Z');await finish(db,j,null,'2030-10-11T22:01Z');
assert.equal(await claim(db,'2030-10-12T21:01Z'),null);
assert.equal((await db.query('select status,email_payload from reward_reminder_jobs')).rows[0].status,'needs_review');
assert.equal((await db.query('select email_payload from reward_reminder_jobs')).rows[0].email_payload,null);
}finally{await db.close();}});
