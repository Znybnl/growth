import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { issueMarketingClickToken, verifyMarketingClickToken, issueParticipationToken, publicPlayerToken } from './participation-token.ts';
import { requiresGoogleClick } from './google-click-policy.ts';

const source = name => readFileSync(new URL('../../../../supabase/migrations/' + name, import.meta.url), 'utf8');
async function database() {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; set time zone 'UTC';");
  const initial = source('20260611_init_full_project.sql');
  for (const name of ['merchants','campaigns','campaign_actions','prizes','leads','campaign_events']) {
    await db.exec(initial.match(new RegExp('create table if not exists public\\.' + name + ' \\([\\s\\S]*?\\n\\);'))[0]);
  }
  await db.exec("alter table campaigns add column campaign_local_settings jsonb default '{}';");
  const sessions = source('20260619_public_draw_sessions.sql');
  await db.exec(sessions.slice(0,sessions.indexOf('create or replace function')));
  await db.exec(source('20260805_scratch_participation_on_first_touch.sql'));
  await db.exec(source('20261013120000_participation_metrics_496.sql'));
  await db.exec(source('20261023170000_google_click_participations_638.sql'));
  await db.exec(`insert into merchants(id,company_name,logo_text) values('m','Fictif','Logo'),('other','Autre','Logo');
    insert into campaigns(id,merchant_id,title,goal_type,cta_label,success_metric,accent_ink,accent_paper,accent_signal,game_type)
    values('wheel','m','Roue','review_prompt','Jouer','Participation','#000','#fff','#123','wheel'),
    ('scratch','m','Ticket','review_prompt','Jouer','Participation','#000','#fff','#123','scratch'),
    ('foreign','other','Autre','review_prompt','Jouer','Participation','#000','#fff','#123','wheel');
    insert into campaign_actions(id,campaign_id,position,kind,label,url) values
    ('google','wheel',0,'google','Avis','https://example.test'),('instagram','scratch',0,'instagram','Suivre','https://example.test');`);
  return db;
}
const receipt='00000000-0000-4000-8000-000000000001';
const settings=id=>JSON.stringify({googleClickRequired:true,googleClickAcceptanceId:id});
async function accept(db,merchant='m',id=receipt) {
  await db.query("insert into google_click_warning_acceptances(id,merchant_id,actor_user_id,warning_version,warning_text) values($1,$2,'user','2026-10-23-v1','Texte accepté')",[id,merchant]);
}
async function click(db,id='click',campaign='wheel',action='google',kind='google') {
  await db.query("insert into campaign_events(id,campaign_id,event_type,metadata) values($1,$2,$3,$4::jsonb)",
    [id,campaign,kind==='google'?'review_clicked':'social_clicked',JSON.stringify({actionId:action,actionKind:kind})]);
}

test('preuve de clic : signature, périmètre, expiration et séparation preview/participation', () => {
  const token=issueMarketingClickToken('wheel','click','google');
  assert.deepEqual(verifyMarketingClickToken(token,'wheel'),{eventId:'click',actionId:'google'});
  assert.equal(verifyMarketingClickToken(token,'foreign'),null);
  assert.equal(verifyMarketingClickToken(token+'.extra','wheel'),null);
  assert.equal(verifyMarketingClickToken(token.slice(0,-2)+'aa','wheel'),null);
  assert.equal(verifyMarketingClickToken(issueParticipationToken('wheel','click',new Date(Date.now()+10000).toISOString()),'wheel'),null);
  const now=Date.now; try { Date.now=()=>now()+31*60*1000; assert.equal(verifyMarketingClickToken(token,'wheel'),null); } finally { Date.now=now; }
  assert.equal(publicPlayerToken(new Request('https://example.test',{headers:{cookie:'okado_player_wheel=player; other=x'}}),'wheel'),'player');
  assert.equal(requiresGoogleClick(true,'google'),true);
  for(const kind of ['instagram','custom',undefined]) assert.equal(requiresGoogleClick(true,kind),false);
  assert.equal(requiresGoogleClick(false,'google'),false);
});

test('acceptation privée : refus absent/étranger, association unique et nouvelle confirmation à la réactivation', async () => {
  const db=await database(); try {
    await assert.rejects(()=>db.query('update campaigns set campaign_local_settings=$1 where id=\'wheel\'',[settings(receipt)]),/Acceptez/);
    await accept(db);
    await assert.rejects(()=>db.query('update campaigns set campaign_local_settings=$1 where id=\'foreign\'',[settings(receipt)]),/Acceptez/);
    await db.query('update campaigns set campaign_local_settings=$1 where id=\'wheel\'',[settings(receipt)]);
    assert.equal((await db.query('select campaign_id from google_click_warning_acceptances')).rows[0].campaign_id,'wheel');
    await assert.rejects(()=>db.query('update campaigns set campaign_local_settings=$1 where id=\'scratch\'',[settings(receipt)]),/Acceptez/);
    await db.exec("update campaigns set campaign_local_settings=jsonb_set(campaign_local_settings,'{googleClickRequired}','false') where id='wheel'");
    await assert.rejects(()=>db.query('update campaigns set campaign_local_settings=$1 where id=\'wheel\'',[settings(receipt)]),/nouveau/);
    for(const role of ['anon','authenticated']) {
      await db.exec('set role '+role);
      await assert.rejects(()=>db.query('select * from google_click_warning_acceptances'),/permission denied/);
      await assert.rejects(()=>db.query('select * from campaign_participation_marketing'),/permission denied/);
      await assert.rejects(()=>db.query("select * from create_draw_session_with_marketing('wheel','x')"),/permission denied/);
      await db.exec('reset role');
    }
  } finally { await db.close(); }
});

test('roue/ticket : type serveur attaché à chaque participation anonyme, refus des clics expirés, étrangers ou réutilisés', async () => {
  const db=await database(); try {
    await db.query("select * from create_draw_session_with_marketing('wheel','no-click')");
    assert.equal((await db.query("select marketing_action_clicked from campaign_participation_marketing")).rows[0].marketing_action_clicked,false);
    await accept(db); await db.query("update campaigns set campaign_local_settings=$1 where id='wheel'",[settings(receipt)]);
    await assert.rejects(()=>db.query("select * from create_draw_session_with_marketing('wheel','blocked',null,'google')"),/Cliquez/);
    assert.equal((await db.query("select count(*) n from draw_sessions where id='blocked'")).rows[0].n,0);
    await click(db);
    await db.query("select * from create_draw_session_with_marketing('wheel','with-click','click','google')");
    const row=(await db.query("select * from campaign_participation_marketing where participation_id='session:with-click'")).rows[0];
    assert.equal(row.marketing_action_clicked,true); assert.equal(row.marketing_action_kind,'google');
    assert.equal((await db.query('select count(*) n from leads')).rows[0].n,0,'la perte anonyme est attribuée sans contact');
    await db.exec("insert into prizes(id,campaign_id,label,total_quantity,remaining_quantity,probability,estimated_unit_cost) values('prize','wheel','Lot',2,2,100,1)");
    await click(db,'stock');
    await db.query("select * from create_draw_session_with_marketing('wheel','stock-session','stock','google')");
    await assert.rejects(()=>db.query("select * from create_draw_session_with_marketing('wheel','stock-duplicate','stock','google')"),/unique|duplicate/);
    assert.equal((await db.query("select remaining_quantity from prizes where id='prize'")).rows[0].remaining_quantity,1,'le refus est atomique avec la réservation de stock');
    await assert.rejects(()=>db.query("select * from create_draw_session_with_marketing('wheel','reused','click','google')"),/unique|duplicate/);
    await assert.rejects(()=>db.query("select * from create_draw_session_with_marketing('scratch','foreign','click','instagram')"),/Clic/);
    await click(db,'social','scratch','instagram','instagram');
    await db.query("select * from create_draw_session_with_marketing('scratch','ticket','social','instagram')");
    assert.equal((await db.query("select count(*) n from campaign_participation_marketing where campaign_id='scratch'")).rows[0].n,0);
    await db.query("select record_draw_session_participation('scratch','ticket')");
    await db.query("select record_draw_session_participation('scratch','ticket')");
    const ticket=(await db.query("select * from campaign_participation_marketing where campaign_id='scratch'")).rows;
    assert.equal(ticket.length,1); assert.equal(ticket[0].marketing_action_kind,'instagram');
    await db.exec("delete from draw_sessions where id='ticket'");
    assert.equal((await db.query("select marketing_action_kind from campaign_participation_marketing where campaign_id='scratch'")).rows[0].marketing_action_kind,'instagram');
    await click(db,'old'); await db.exec("update campaign_events set created_at=now()-interval '31 minutes' where id='old'");
    await assert.rejects(()=>db.query("select * from create_draw_session_with_marketing('wheel','old-session','old','google')"),/Clic/);
  } finally { await db.close(); }
});

test('rollback : ancienne RPC disponible, journal et snapshots conservés',async()=>{
  const db=await database(); try {
    await accept(db); await click(db);
    await db.query("select * from create_draw_session_with_marketing('wheel','before-rollback','click','google')");
    await db.exec(readFileSync(new URL('../../../../supabase/rollback/20261023170000_google_click_participations_638.sql',import.meta.url),'utf8'));
    assert.equal((await db.query('select count(*) n from google_click_warning_acceptances')).rows[0].n,1);
    assert.equal((await db.query("select metadata->>'marketingActionKind' kind from campaign_events where event_type='game_played'")).rows[0].kind,'google');
    assert.equal((await db.query("select * from create_draw_session('wheel','after-rollback')")).rows.length,1);
  } finally { await db.close(); }
});
