import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const read = name => readFileSync(new URL(`../../../../supabase/migrations/${name}`, import.meta.url), "utf8");
const migration = read("20261023120000_guaranteed_draw_probabilities_629.sql");
const rollback = readFileSync(new URL("../../../../supabase/rollback/20261023120000_guaranteed_draw_probabilities_629.sql", import.meta.url), "utf8");
async function database() {
  const db = new PGlite();
  await db.exec("set time zone 'UTC'; create role anon; create role authenticated; create role service_role bypassrls;");
  const initial = read("20260611_init_full_project.sql");
  for (const name of ["merchants", "campaigns", "prizes", "leads", "campaign_events"]) {
    await db.exec(initial.match(new RegExp(`create table if not exists public\\.${name} \\([\\s\\S]*?\\n\\);`))[0]);
  }
  const sessions = read("20260619_public_draw_sessions.sql");
  await db.exec(sessions.slice(0, sessions.indexOf("create or replace function")));
  await db.exec(read("20260805_scratch_participation_on_first_touch.sql"));
  await db.exec(read("20260618_fix_secure_draw_campaign_id_ambiguity.sql"));
  await db.exec(`grant all on all tables in schema public to service_role;
    alter table campaigns enable row level security; alter table prizes enable row level security;
    alter table draw_sessions enable row level security; alter table leads enable row level security;
    insert into merchants(id,company_name,logo_text) values('merchant','Fictif','Fictif');
    insert into campaigns(id,merchant_id,title,goal_type,cta_label,success_metric,accent_ink,accent_paper,accent_signal,game_type,is_winning_every_time)
    values('game','merchant','Fictif','social_follow','Jouer','Participation','#000','#fff','#123','wheel',true),
    ('normal','merchant','Fictif','social_follow','Jouer','Participation','#000','#fff','#123','wheel',false);`);
  await db.exec(migration);
  return db;
}
const add = (db, id, probability, stock = null, campaign = "game") => db.query(
  "insert into prizes(id,campaign_id,label,probability,total_quantity,remaining_quantity) values($1,$2,$1,$3,$4,$4)", [id,campaign,probability,stock]);
const session = (db, id, campaign = "game") => db.query("select * from create_draw_session($1,$2)", [campaign,id]);
const legacy = (db,id) => db.query("select * from draw_campaign_prize_and_create_lead('game',$1,'Fictif','player@example.test',false)", [id]);
const counts = async db => (await db.query("select (select count(*) from draw_sessions) sessions, (select count(*) from leads) leads, (select count(*) from campaign_events) events")).rows[0];

test("SQL réel : exclut 0 %, poids .25/.75 respectés sans plancher 1", async () => {
  const db = await database(); try {
    await add(db,"zero",0); await add(db,"small",.25); await add(db,"large",.75); await add(db,"empty",99,0);
    await db.exec("select setseed(0.31)");
    const { rows } = await db.query(`with draws as materialized (
      select select_guaranteed_campaign_prize('game') id from generate_series(1,10000)
    ) select id,count(*)::int n from draws group by id`);
    assert.deepEqual(rows.map(r=>r.id).sort(), ["large","small"]);
    const small = rows.find(r=>r.id === "small").n;
    assert.ok(small > 2300 && small < 2700, `25% attendus, obtenu ${small}/10000`);
    assert.equal((await db.query("select probability from prizes where id='small'")).rows[0].probability, "0.25");
    assert.deepEqual(await counts(db), {sessions:0,leads:0,events:0});
  } finally { await db.close(); }
});
test("session et ancien endpoint : seul lot positif gagnant, jamais de perte", async () => {
  const db = await database(); try {
    await add(db,"zero",0); await add(db,"positive",.05); await add(db,"empty",99,0);
    for (let i=0;i<10;i++) {
      assert.equal((await session(db,`s${i}`)).rows[0].prize_id,"positive");
      const result=(await legacy(db,`l${i}`)).rows[0];
      assert.equal(result.prize_id,"positive"); assert.equal(result.status,"claimed");
    }
    assert.equal((await db.query("select remaining_quantity from prizes where id='positive'")).rows[0].remaining_quantity,null);
  } finally { await db.close(); }
});
test("aucun stock éligible : refus atomique sur les deux RPC, puis réapprovisionnement", async () => {
  const db = await database(); try {
    await add(db,"zero",0); await add(db,"last",100,1);
    assert.equal((await session(db,"first")).rows[0].prize_id,"last");
    const before=await counts(db);
    await assert.rejects(()=>session(db,"denied"), /Aucun lot disponible/);
    await assert.rejects(()=>legacy(db,"denied-lead"), /Aucun lot disponible/);
    assert.deepEqual(await counts(db),before);
    assert.equal((await db.query("select remaining_quantity from prizes where id='last'")).rows[0].remaining_quantity,0);
    await db.exec("update prizes set remaining_quantity=1 where id='last'");
    assert.equal((await session(db,"restocked")).rows[0].prize_id,"last");
  } finally { await db.close(); }
});
test("réservation expirée restituée et dernier stock jamais attribué deux fois", async () => {
  const db = await database(); try {
    await add(db,"last",100,1);
    const results=await Promise.allSettled([session(db,"a"),session(db,"b")]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.filter(r=>r.status==='rejected').length,1);
    const first=results.find(r=>r.status==='fulfilled').value.rows[0].session_id;
    await db.query("update draw_sessions set expires_at=now()-interval '1 minute' where id=$1",[first]);
    assert.equal((await session(db,"after-expiry")).rows[0].prize_id,"last");
    assert.equal((await db.query("select status from draw_sessions where id=$1",[first])).rows[0].status,"expired");
    assert.equal((await db.query("select remaining_quantity from prizes where id='last'")).rows[0].remaining_quantity,0);
    // Preserve the existing session-before-campaign order used by finalization.
    assert.ok(migration.indexOf("for v_expired_session in") < migration.indexOf("from public.campaigns as campaigns"));
  } finally { await db.close(); }
});
test("mode normal et aucun lot : perte conservée ; 100% avec aucun lot : refus", async () => {
  const db = await database(); try {
    assert.equal((await session(db,"loss","normal")).rows[0].prize_id,null);
    await assert.rejects(()=>session(db,"no-prize"), /Aucun lot disponible/);
    await db.exec("update campaigns set game_type='scratch' where id='game'");
    await add(db,"p",100);
    assert.equal((await session(db,"scratch")).rows[0].prize_id,"p");
    assert.equal((await db.query("select count(*)::int n from campaign_events where campaign_id='game'")).rows[0].n,0);
  } finally { await db.close(); }
});
test("migration réexécutable, fonctions privées invoker/RLS et rollback sans perte de données", async () => {
  const db = await database(); try {
    await db.exec(migration); await add(db,"p",100,2);
    await db.exec(readFileSync(new URL("../../../../supabase/checks/guaranteed_draw_629.sql",import.meta.url),"utf8"));
    await db.exec("set role service_role");
    assert.equal((await session(db,"allowed")).rows[0].prize_id,"p");
    await db.exec("reset role");
    const signatures=["create_draw_session(text,text)","draw_campaign_prize_and_create_lead(text,text,text,text,boolean)","select_guaranteed_campaign_prize(text)"];
    for (const signature of signatures) {
      for (const role of ["anon","authenticated"]) assert.equal((await db.query("select has_function_privilege($1,$2,'execute') ok",[role,signature])).rows[0].ok,false);
      assert.equal((await db.query("select prosecdef from pg_proc where oid=$1::regprocedure",[signature])).rows[0].prosecdef,false);
    }
    await db.exec("set role anon");
    await assert.rejects(()=>session(db,"forbidden"), /permission denied/);
    await db.exec("reset role");
    const before=await counts(db);
    await db.exec(rollback);
    assert.deepEqual(await counts(db),before);
    for (const signature of signatures.slice(0,2)) {
      assert.equal((await db.query("select has_function_privilege('anon',$1,'execute') ok",[signature])).rows[0].ok,false);
    }
    assert.equal((await db.query("select remaining_quantity from prizes where id='p'")).rows[0].remaining_quantity,1);
    assert.equal((await db.query("select to_regprocedure('select_guaranteed_campaign_prize(text)') name")).rows[0].name,null);
    await db.exec(migration);
    assert.equal((await session(db,"reapplied")).rows[0].prize_id,"p");
  } finally { await db.close(); }
});
