import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { buildPrizeCompositions, copyPrizeComposition, prizeCompositionRecipe, restaurantCompositionVariants } from "./prize-compositions.ts";
import { INDUSTRY_OPTIONS, BEAUTY_SUBSECTOR_OPTIONS, RESTAURANT_TYPE_OPTIONS } from "./merchant-options.ts";
import beauty from "./beauty-catalog-466.fixture.json" with { type: "json" };
import additions from "./prize-catalog-623.fixture.json" with { type: "json" };
import recipes from "./prize-composition-recipes.json" with { type: "json" };
const catalog = [...beauty, ...additions].map(item => ({ ...item, isActive: true }));
const contexts = [
 ...INDUSTRY_OPTIONS.filter(industry => industry !== "Beauté").map(industry => ({ industry })),
 ...BEAUTY_SUBSECTOR_OPTIONS.map(industrySubsector => ({ industry: "Beauté", industrySubsector })),
 ...RESTAURANT_TYPE_OPTIONS.map(restaurantType => ({ industry: "Restauration", restaurantType })),
];
for (const context of contexts) test(`recettes complètes et cloisonnées : ${JSON.stringify(context)}`, () => {
 const before=JSON.stringify(catalog), result=buildPrizeCompositions(catalog,context), recipe=prizeCompositionRecipe(context);
 assert.deepEqual(result.map(p=>p.winningProbability),[40,70,100]);
 assert.deepEqual(result.map(p=>p.prizes.length),[2,3,3]);
 assert.deepEqual(result.map(p=>p.prizes.map(s=>s.probability)),[[25,15],[35,25,10],[50,30,20]]);
 for(const p of result) {
  assert.equal(p.averageCost,p.prizes.reduce((sum,s)=>sum+s.estimatedUnitCost*s.probability/100,0));
  assert.equal(p.winningProbability+p.losingProbability,100);
  assert.ok(p.prizes.every(s=>s.industry===recipe.industry&&(s.industry!=="Beauté"||s.industrySubsector===recipe.subsector)));
  assert.equal(new Set(p.prizes.map(s=>s.id)).size,p.prizes.length);
  assert.equal(p.prizes.filter(s=>/^-\d+%/.test(s.label)).length,1);
 }
 assert.equal(JSON.stringify(catalog),before);
 assert.notDeepEqual(result[1].prizes.map(s=>s.id),result[2].prizes.map(s=>s.id));
});
test("tous les secteurs/types connus, aliases et anciens Beauty",()=>{
 assert.equal(recipes.length,12);
 assert.deepEqual(Object.keys(restaurantCompositionVariants).sort(),[...RESTAURANT_TYPE_OPTIONS].sort());
 for(const industrySubsector of [undefined,"Institut & soins","Ongles & cils","Massage & spa"])
  assert.equal(buildPrizeCompositions(catalog,{industry:"Beauté",industrySubsector}).length,3);
 assert.deepEqual(buildPrizeCompositions(catalog,{industry:"Inconnu"}),[]);
 assert.deepEqual(buildPrizeCompositions(catalog,{industry:"Beauté",industrySubsector:"Inconnu"}),[]);
});
test("catalogue absent, incomplet ou désactivé : aucun lot de secours inventé",()=>{
 const ctx={industry:"Beauté"};
 assert.deepEqual(buildPrizeCompositions([],ctx),[]);
 assert.deepEqual(buildPrizeCompositions(catalog.filter(s=>s.id!=="ps-beauty-466-general-7"),ctx).map(p=>p.id),["budget"]);
 for(const bad of [{isActive:false},{estimatedUnitCost:NaN},{probability:101},{label:"PERDU !"}])
  assert.deepEqual(buildPrizeCompositions(catalog.map(s=>s.id==="ps-beauty-466-general-5"?{...s,...bad}:s),ctx),[]);
});
test("copies indépendantes, conditions et achat transmis pour tous les secteurs",()=>{
 for(const context of contexts) {
  const profile=buildPrizeCompositions(catalog,context)[1], one=copyPrizeComposition(profile,"wizard"), two=copyPrizeComposition(profile,"wizard");
  assert.equal(new Set([...one,...two].map(s=>s.id)).size,6);
  one.forEach((s,i)=>{
   assert.equal(s.usageConditions,profile.prizes[i].description);
   assert.equal(s.totalQuantity,null);assert.equal(s.remainingQuantity,null);
   assert.equal(s.purchaseRequired,i===1 || (context.industry==="Restauration" && i===2));
  });
  one[0].label="Modifié";assert.notEqual(two[0].label,"Modifié");
 }
});
test("migration additive/idempotente, RLS et rollback sans mutation des jeux",async()=>{
 const db=new PGlite(), sql=name=>readFileSync(new URL("../../../../supabase/"+name,import.meta.url),"utf8");
 try{
  await db.exec("create role anon;create role authenticated;");
  await db.exec(sql("migrations/20260715_prize_suggestions.sql"));
  await db.exec("alter table public.prize_suggestions add column industry_subsector text;create table public.prizes(id text primary key,payload jsonb);insert into public.prizes values ('existing','{\"stock\":8}');insert into public.prize_suggestions(id,industry,label,probability) values ('custom','Sport','Personnalisé',12);");
  const before=(await db.query("select * from public.prize_suggestions order by id")).rows;
  const migration=sql("migrations/20261023090000_sector_prize_compositions_623.sql");
  await db.exec(migration);await db.exec(migration);
  const added=(await db.query("select * from public.prize_suggestions where id like 'ps-623-%'")).rows;
  assert.equal(added.length,35);
  for(const item of additions){
   const row=added.find(s=>s.id===item.id);
   assert.equal(row.label,item.label);assert.equal(row.description,item.description);
   assert.equal(Number(row.estimated_unit_cost),item.estimatedUnitCost);assert.ok(item.description.length<=280);
  }
  assert.deepEqual((await db.query("select * from public.prize_suggestions where id not like 'ps-623-%' order by id")).rows,before);
  assert.deepEqual((await db.query("select payload from public.prizes")).rows,[{payload:{stock:8}}]);
  await db.exec("set role anon;");await assert.rejects(db.query("select * from public.prize_catalog_623_inserted"),/permission denied/);
  await db.exec("reset role;update public.prize_suggestions set label='Personnalisé après migration' where id='ps-623-auto-extra';");
  await db.exec(migration);
  const rollback=sql("rollback/20261023090000_sector_prize_compositions_623.sql");
  await db.exec(rollback);await db.exec(rollback);
  assert.deepEqual((await db.query("select id from public.prize_suggestions where id like 'ps-623-%'")).rows,[{id:"ps-623-auto-extra"}]);
  assert.deepEqual((await db.query("select * from public.prize_suggestions where id not like 'ps-623-%' order by id")).rows,before);
  await db.exec(migration);await db.exec(rollback);
  assert.deepEqual((await db.query("select id from public.prize_suggestions where id like 'ps-623-%'")).rows,[{id:"ps-623-auto-extra"}]);
 }finally{await db.close();}
});
