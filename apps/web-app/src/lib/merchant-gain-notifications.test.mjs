import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { renderMerchantGainNotification } from "./merchant-gain-notification-email.ts";

const migration = readFileSync(new URL("../../../../supabase/migrations/20261006_merchant_gain_notifications_473.sql",import.meta.url),"utf8");
const rollback = readFileSync(new URL("../../../../supabase/rollback/20261006_merchant_gain_notifications_473.sql",import.meta.url),"utf8");
async function database() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table merchants(id text primary key,company_name text,workspace_id text,location_status text,time_zone text);
    create table merchant_users(id text primary key,email text);
    create table merchant_workspace_memberships(id text primary key,workspace_id text,merchant_user_id text,role text,status text);
    create table merchant_membership_locations(membership_id text,merchant_id text);
    create table campaigns(id text primary key,merchant_id text,title text,game_type text);
    create table prizes(id text primary key,campaign_id text,label text);
    create table leads(id text primary key,campaign_id text,prize_id text,status text,created_at timestamptz,first_name text,last_name text);
    create table preview_participations(like leads);
    insert into merchants values ('a','Institut Démo','w','active','Europe/Paris'),('b','Autre site','w2','active','Europe/Paris');
    insert into merchant_users values ('u','owner@example.test'),('v','other@example.test');
    insert into merchant_workspace_memberships values ('wu','w','u','owner','active'),('wv','w2','v','manager','active');
    insert into merchant_membership_locations values ('wv','b');
    insert into campaigns values ('c','a','Jeu Démo','wheel'),('s','a','Ticket Démo','scratch'),('x','b','Autre Jeu','wheel');
    insert into prizes values ('p','c','Soin offert'),('ps','s','-10% PROCHAINE VISITE'),('px','x','Autre lot');
  `);
  await db.exec(migration);
  return db;
}
const pref = (db,f="daily",user="u",site="a") =>
  db.query("select set_merchant_gain_notification_preference($1,$2,$3)",[user,site,f]);
const gain = (db,id,date,c="c",p="p",status="claimed") =>
  db.query("insert into leads(id,campaign_id,prize_id,status,created_at) values ($1,$2,$3,$4,$5)",[id,c,p,status,date]);
async function claim(db,date,lead=null) {
  return (await db.query("select claim_merchant_gain_notification($1,$2) job",[date,lead])).rows[0].job;
}
const finish = (db,job,sent=true,date="2026-10-06T07:00:00Z") =>
  db.query("select finish_merchant_gain_notification($1,$2,$3,$4,$5)",[job.id,job.lease_token,sent,sent?"provider-demo":null,date]);

test("désactivé par défaut, activation non rétroactive, gains réels roue/ticket seulement",async()=>{
  const db=await database();
  try {
    await gain(db,"old","2026-10-05T10:00Z");
    assert.equal((await db.query("select count(*)::int n from merchant_gain_notification_events")).rows[0].n,0);
    await pref(db);
    await gain(db,"real","2026-10-05T12:00Z");
    await gain(db,"scratch","2026-10-05T13:00Z","s","ps");
    await gain(db,"lost","2026-10-05T14:00Z","c",null,"lost");
    await gain(db,"other","2026-10-05T14:00Z","x","px");
    await db.exec("insert into preview_participations(id,campaign_id,prize_id,status,created_at) values ('preview','c','p','claimed','2026-10-05T14:00Z')");
    const job=await claim(db,"2026-10-06T07:00Z");
    assert.equal(job.frequency,"daily");assert.equal(job.gains.length,2);
    assert.deepEqual(job.gains.map(g=>g.leadId),["real","scratch"]);
    assert.equal(job.recipient,"owner@example.test");
    await finish(db,job);assert.equal(await claim(db,"2026-10-06T07:01Z"),null);
    assert.deepEqual((await db.query("select gains from merchant_gain_notification_jobs")).rows[0].gains,[]);
  }finally{await db.close();}
});
test("fréquences et fuseaux : 09h locale, lundi et premier du mois, périodes non chevauchantes",async()=>{
  for (const [frequency,date,before,due] of [
    ["daily","2026-10-05T21:59Z","2026-10-06T06:59Z","2026-10-06T07:00Z"],
    ["weekly","2026-10-09T12:00Z","2026-10-12T06:59Z","2026-10-12T07:00Z"],
    ["monthly","2026-10-15T12:00Z","2026-11-01T07:59Z","2026-11-01T08:00Z"],
    ["daily","2026-10-25T00:30Z","2026-10-26T07:59Z","2026-10-26T08:00Z"],
  ]) {
    const db=await database();
    try {await pref(db,frequency);await gain(db,"g",date);
      assert.equal(await claim(db,before),null,`pas avant 09h ${frequency}`);
      const job=await claim(db,due);assert.equal(job.gains.length,1);
      assert.ok(new Date(job.period_start)<=new Date(date));assert.ok(new Date(job.period_end)>new Date(date));
    }finally{await db.close();}
  }
});
test("immédiat : un e-mail par gain même horodatage ; lease, reprise et déduplication",async()=>{
  const db=await database();
  try {await pref(db,"instant");await gain(db,"a","2026-10-06T09:00Z");await gain(db,"b","2026-10-06T09:00Z");
    const first=await claim(db,"2026-10-06T09:01Z","a");assert.equal(first.gains.length,1);
    assert.equal(await claim(db,"2026-10-06T09:02Z","a"),null);
    const retried=await claim(db,"2026-10-06T09:07Z","a");
    assert.equal(retried.id,first.id);assert.notEqual(retried.lease_token,first.lease_token);
    await finish(db,first,true,"2026-10-06T09:07Z");
    assert.equal((await db.query("select status from merchant_gain_notification_jobs where id=$1",[first.id])).rows[0].status,"sending");
    await finish(db,retried,true,"2026-10-06T09:07Z");
    assert.equal(await claim(db,"2026-10-06T09:08Z","a"),null);
    assert.equal((await claim(db,"2026-10-06T09:08Z","b")).gains.length,1);
  }finally{await db.close();}
});

test("passage quotidien : reprise à la maintenance dans les 23h, sans anticiper la synthèse du matin",async()=>{
  const db=await database();
  try {
    await pref(db);await gain(db,"monday","2026-10-05T12:00Z");
    const original=await claim(db,"2026-10-06T08:00Z");
    await finish(db,original,false,"2026-10-06T08:00Z");
    await gain(db,"tuesday","2026-10-06T14:00Z");
    const recovered=await claim(db,"2026-10-07T03:15Z");
    assert.equal(recovered.id,original.id);assert.deepEqual(recovered.gains,original.gains);
    assert.equal(recovered.attempts,2);
    await finish(db,recovered,true,"2026-10-07T03:15Z");
    assert.equal(await claim(db,"2026-10-07T03:16Z"),null);
    const morning=await claim(db,"2026-10-07T08:00Z");
    assert.deepEqual(morning.gains.map(g=>g.leadId),["tuesday"]);
  }finally{await db.close();}
});
test("listing complet en parties numérotées, sans limite arbitraire de gains",async()=>{
  const db=await database();
  try {await pref(db);
    await db.exec("insert into leads(id,campaign_id,prize_id,status,created_at) select 'g'||n,'c','p','claimed','2026-10-05T12:00Z'::timestamptz from generate_series(1,85)n");
    const jobs=[];for(let n=0;n<3;n++){const job=await claim(db,"2026-10-06T07:00Z");jobs.push(job);await finish(db,job);}
    assert.deepEqual(jobs.map(j=>j.gains.length).sort((a,b)=>a-b),[5,40,40]);
    assert.ok(jobs.every(j=>j.parts===3));assert.equal(new Set(jobs.flatMap(j=>j.gains.map(g=>g.leadId))).size,85);
    assert.deepEqual(jobs.map(j=>j.part),[1,2,3]);
    assert.equal(await claim(db,"2026-10-06T07:00Z"),null);
  }finally{await db.close();}
});
test("changement de fréquence garde les gains en attente ; désactivation ne les rejoue pas",async()=>{
  const db=await database();
  try {await pref(db,"monthly");await gain(db,"g","2026-10-05T12:00Z");
    await pref(db,"daily");const job=await claim(db,"2026-10-06T07:00Z");assert.equal(job.gains.length,1);
    await pref(db,"disabled");assert.equal(await claim(db,"2026-10-06T07:06Z"),null);
    await pref(db,"daily");assert.equal(await claim(db,"2026-10-07T07:00Z"),null);
    await gain(db,"new","2026-10-06T12:00Z");assert.equal((await claim(db,"2026-10-07T07:00Z")).gains[0].leadId,"new");
  }finally{await db.close();}
});
test("permission retirée, site archivé, e-mail changé et reset de gain bloquent la reprise",async()=>{
  for(const mutation of [
    "update merchant_workspace_memberships set status='suspended' where id='wu'",
    "update merchants set location_status='archived' where id='a'",
    "update merchant_users set email='changed@example.test' where id='u'",
    "update leads set status='lost',prize_id=null where id='g'",
  ]) {const db=await database();
    try {await pref(db,"instant");await gain(db,"g","2026-10-06T09:00Z");
      const job=await claim(db,"2026-10-06T09:01Z");await db.exec(mutation);
      assert.equal((await db.query("select authorize_merchant_gain_notification($1,$2) ok",[job.id,job.lease_token])).rows[0].ok,false);
      assert.equal(await claim(db,"2026-10-06T09:07Z"),null);
    }finally{await db.close();}
  }
});
test("RLS et RPC privées, autorisations multisites, conservation des données et rollback",async()=>{
  const db=await database();
  try {await assert.rejects(pref(db,"daily","u","b"),/Access denied/);
    await pref(db,"weekly","v","b");
    await db.exec("update merchant_workspace_memberships set role='manager' where id='wu'");
    await assert.rejects(pref(db),/Access denied/);
    await db.exec("insert into merchant_membership_locations values ('wu','a')");
    await pref(db);
    const before=await db.query("select * from campaigns order by id");
    await db.exec(migration);assert.deepEqual(await db.query("select * from campaigns order by id"),before);
    for(const role of ["anon","authenticated"]){await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select * from merchant_gain_notification_events"),/permission denied/);
      await assert.rejects(db.exec("select claim_merchant_gain_notification()"),/permission denied/);await db.exec("reset role");}
    await db.exec(rollback);assert.deepEqual(await db.query("select * from campaigns order by id"),before);
    assert.equal((await db.query("select frequency from merchant_gain_notification_preferences where user_id='u'")).rows[0].frequency,"disabled");
  }finally{await db.close();}
});
test("pas de reprise ambiguë après 23h, payload et clé stables pendant la reprise",async()=>{
  const db=await database();
  try {await pref(db,"instant");await gain(db,"g","2026-10-06T09:00Z");
    const original=await claim(db,"2026-10-06T09:01Z");
    await db.exec("update merchants set company_name='Changed' where id='a'");
    const retry=await claim(db,"2026-10-06T09:07Z");assert.equal(retry.merchant_name,original.merchant_name);assert.deepEqual(retry.gains,original.gains);
    assert.equal(await claim(db,"2026-10-07T09:00Z"),null);
    assert.equal((await db.query("select status from merchant_gain_notification_jobs")).rows[0].status,"needs_review");
  }finally{await db.close();}
});
test("payload exact persistant et privé, nouvelle lease/release sans régénération",async()=>{
  const db=await database();
  try {await pref(db,"instant");await gain(db,"g","2026-10-06T09:00Z");
    const job=await claim(db,"2026-10-06T09:01Z");
    const payload={subject:"Original",html:"<p>Original</p>",text:"Original",from:"Okado <test@example.test>"};
    const prepare=(token,value,at)=>db.query("select prepare_merchant_gain_notification_payload($1,$2,$3,$4) payload",[job.id,token,JSON.stringify(value),at]);
    assert.deepEqual((await prepare(job.lease_token,payload,"2026-10-06T09:02Z")).rows[0].payload,payload);
    const retry=await claim(db,"2026-10-06T09:07Z");
    assert.equal((await prepare(job.lease_token,payload,"2026-10-06T09:08Z")).rows[0].payload,null);
    assert.deepEqual((await prepare(retry.lease_token,{...payload,html:"<p>New deployment</p>"},"2026-10-06T09:08Z")).rows[0].payload,payload);
    await assert.rejects(prepare(retry.lease_token,{...payload,to:"injected@example.test"},"2026-10-06T09:08Z"),/Invalid payload/);
    await finish(db,retry,true,"2026-10-06T09:08Z");
    assert.equal((await db.query("select email_payload from merchant_gain_notification_jobs")).rows[0].email_payload,null);
  }finally{await db.close();}
});
test("effacement d’une participation et désactivation effacent aussi les snapshots",async()=>{
  const db=await database();
  try {await pref(db,"instant");await gain(db,"g","2026-10-06T09:00Z");
    const job=await claim(db,"2026-10-06T09:01Z");
    await db.exec("delete from leads where id='g'");
    const redacted=(await db.query("select status,gains,recipient from merchant_gain_notification_jobs where id=$1",[job.id])).rows[0];
    assert.deepEqual(redacted,{status:"cancelled",gains:[],recipient:null});
    assert.equal((await db.query("select count(*)::int n from merchant_gain_notification_events")).rows[0].n,0);
    await gain(db,"g2","2026-10-06T09:02Z");await claim(db,"2026-10-06T09:03Z");await pref(db,"disabled");
    assert.ok((await db.query("select gains,recipient from merchant_gain_notification_jobs")).rows.every(j=>j.gains.length===0&&j.recipient===null));
  }finally{await db.close();}
});
test("travailleurs simultanés : une seule lease par gain ; périodes manquées récupérées",async()=>{
  const db=await database();
  try {await pref(db,"daily");
    await gain(db,"older","2026-10-03T12:00Z");await gain(db,"newer","2026-10-05T12:00Z");
    const jobs=(await Promise.all([claim(db,"2026-10-06T07:00Z"),claim(db,"2026-10-06T07:00Z")])).filter(Boolean);
    assert.equal(jobs.length,2);assert.equal(new Set(jobs.map(j=>j.id)).size,2);
    assert.deepEqual(jobs.flatMap(j=>j.gains.map(g=>g.leadId)),["older","newer"]);
    assert.equal(await claim(db,"2026-10-06T07:01Z"),null);
  }finally{await db.close();}
});
const input={merchantName:"Institut Démo",merchantId:"a",frequency:"daily",timeZone:"Europe/Paris",periodStart:"2026-10-05T22:00Z",periodEnd:"2026-10-06T22:00Z",origin:"https://app.okado.app",
  gains:[{leadId:"g",campaignId:"c",campaignTitle:"Jeu Démo",prizeLabel:"Soin offert",wonAt:"2026-10-06T12:00Z",firstName:"Camille",lastName:"Martin"}]};
test("rendu nominatif autorisé, listing détaillé et préférences, sans e-mail ni code du participant",()=>{
  for(const frequency of ["instant","daily","weekly","monthly"]){
    const email=renderMerchantGainNotification({...input,frequency});
    assert.match(email.html,/Soin offert/);assert.match(email.text,/06\/10.*14:00/);
    assert.match(email.html,/location=a/);assert.doesNotMatch(email.html,/QR code|Code de retrait|participant@example/);
    assert.match(email.html,/Camille Martin/);assert.match(email.text,/Camille Martin/);
    assert.doesNotMatch(email.html,/✦ Okado|<img|Vos gains/);
    assert.match(email.html,/modifier vos préférences de notifications/);
    assert.match(email.html,/\/api\/merchant\/gain-notifications\/account\?location=a/);
    assert.match(email.text,/\/api\/merchant\/gain-notifications\/account\?location=a/);
  }
  const hostile=renderMerchantGainNotification({...input,merchantName:"<script>alert(1)</script>",gains:[{...input.gains[0],firstName:"<script>bad</script>",lastName:"<img src=x>",prizeLabel:"<img src=x onerror=alert(1)>"}]});
  assert.doesNotMatch(hostile.html,/<script|<img src=x/);assert.match(hostile.html,/&lt;img/);
  assert.throws(()=>renderMerchantGainNotification({...input,gains:[]}),/vide/);
  assert.throws(()=>renderMerchantGainNotification({...input,origin:"javascript:alert(1)"}));
});

test("noms lus dans la participation, snapshot privé stable et expurgé à l’effacement",async()=>{
  for(const frequency of ["instant","daily","weekly","monthly"]){
    const db=await database();
    try{
      await pref(db,frequency);await gain(db,"named","2026-10-05T12:00Z");
      await db.exec("update leads set first_name='Camille',last_name='Martin' where id='named'");
      const job=await claim(db,"2026-11-02T08:00Z");
      assert.equal(job.gains[0].firstName,"Camille");assert.equal(job.gains[0].lastName,"Martin");
      assert.deepEqual(Object.keys(job.gains[0]).sort(),["leadId","campaignId","campaignTitle","prizeLabel","wonAt","firstName","lastName"].sort());
      assert.match(renderMerchantGainNotification({...input,frequency,gains:job.gains}).html,/Camille Martin/);
      await db.exec("update leads set first_name='Changed',last_name='Changed' where id='named'");
      const retry=await claim(db,"2026-11-02T08:06Z");
      assert.deepEqual(retry.gains,job.gains);
      const payload={subject:"Camille",html:"<p>Camille Martin</p>",text:"Camille Martin",from:"Okado <test@example.test>"};
      await db.query("select prepare_merchant_gain_notification_payload($1,$2,$3,$4)",[retry.id,retry.lease_token,JSON.stringify(payload),"2026-11-02T08:07Z"]);
      await db.exec("delete from leads where id='named'");
      const redacted=(await db.query("select status,gains,recipient,email_payload from merchant_gain_notification_jobs where id=$1",[job.id])).rows[0];
      assert.deepEqual(redacted,{status:"cancelled",gains:[],recipient:null,email_payload:null});
    }finally{await db.close();}
  }
});

test("anciens snapshots et noms manquants ou partiels, sans identité inventée",()=>{
  for(const frequency of ["instant","daily"]){
    for(const names of [{firstName:undefined,lastName:undefined},{firstName:null,lastName:null},{firstName:" ",lastName:" "}]){
      const email=renderMerchantGainNotification({...input,frequency,gains:[{...input.gains[0],...names}]});
      assert.match(email.html,/Nom non renseigné/);assert.match(email.text,/Nom non renseigné/);
      assert.doesNotMatch(email.html,/undefined|null|Camille/);
    }
  }
  assert.match(renderMerchantGainNotification({...input,frequency:"instant",gains:[{...input.gains[0],firstName:" Camille ",lastName:null}]}).text,/Camille a remporté/);
});

test("objets datés : journée réelle, semaine, changement de mois/année et parties",()=>{
  assert.equal(renderMerchantGainNotification({...input,frequency:"instant"}).subject,"Nouveau gain — Institut Démo");
  assert.equal(renderMerchantGainNotification(input).subject,"Les gains du 6 octobre 2026 — Institut Démo");
  for(const [periodStart,periodEnd,expected] of [
    ["2026-10-04T22:00Z","2026-10-11T22:00Z","Les gains du 5 au 11 octobre 2026 — Institut Démo"],
    ["2026-09-27T22:00Z","2026-10-04T22:00Z","Les gains du 28 septembre au 4 octobre 2026 — Institut Démo"],
    ["2026-12-27T23:00Z","2027-01-03T23:00Z","Les gains du 28 décembre 2026 au 3 janvier 2027 — Institut Démo"],
  ])assert.equal(renderMerchantGainNotification({...input,frequency:"weekly",periodStart,periodEnd}).subject,expected);
  assert.equal(renderMerchantGainNotification({...input,frequency:"monthly",periodStart:"2026-09-30T22:00Z",periodEnd:"2026-10-31T23:00Z",part:2,parts:3}).subject,"Les gains d’octobre 2026 — Institut Démo — partie 2/3");
});

test("notifications professionnelles : aucun pictogramme cadeau dans l’objet, le titre ou le texte",()=>{
  for(const frequency of ["instant","daily","weekly","monthly"]){
    const email=renderMerchantGainNotification({...input,frequency});
    for(const content of [email.subject,email.html,email.text]){
      assert.doesNotMatch(content,/🎁/);
    }
    if(frequency==="instant"){
      assert.match(email.html,/<h1[^>]*>Un nouveau gain<\/h1>/);
      assert.match(email.text,/\n\nUn nouveau gain\n\n/);
    }
  }
});
