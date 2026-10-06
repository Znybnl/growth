import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import catalog from "./beauty-catalog-466.fixture.json" with { type: "json" };

// Mock only external database/session boundaries, never the implementation.
const src = new URL("../", import.meta.url);
const mocks = {
  "@/lib/supabase": "export const isSupabaseConfigured = () => true; export const getSupabaseAdmin = () => globalThis.__catalogTest.db;",
  "@/lib/auth": "export const getAuthenticatedSession = async () => globalThis.__catalogTest.session;",
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/server") return next("next/server.js", context);
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    if (specifier.startsWith("@/")) return next(new URL(`${specifier.slice(2)}.ts`, src).href, context);
    return next(specifier, context);
  },
});
const options = await import("./merchant-options.ts");
const fields = await import("./prize-suggestion-fields.ts");
const repository = await import("./prize-suggestion-repository.ts");
const route = await import("../app/api/prize-suggestions/route.ts");
const { NextRequest } = await import("next/server.js");
const migrations = new URL("../../../../supabase/migrations/", import.meta.url);
const migration = readFileSync(new URL("20261006_beauty_catalog_466.sql", migrations), "utf8");
const rollback = readFileSync(new URL("../rollback/20261006_beauty_catalog_466.sql", migrations), "utf8");
const cleanup = readFileSync(new URL("20261006_beauty_subsector_cleanup_466.sql", migrations), "utf8");
const cleanupRollback = readFileSync(new URL("../rollback/20261006_beauty_subsector_cleanup_466.sql", migrations), "utf8");
const sql = name => readFileSync(new URL(name, migrations), "utf8");
const row = item => ({
  id: item.id, industry: item.industry, industry_subsector: item.industrySubsector,
  label: item.label, description: item.description, probability: item.probability,
  estimated_unit_cost: item.estimatedUnitCost, icon: item.icon, sort_order: item.sortOrder,
  is_active: true, created_at: "2026-10-06", updated_at: "2026-10-06",
});
let state;
beforeEach(() => {
  state = globalThis.__catalogTest = { rows: catalog.map(row), reads: [], session: { merchant: { industry: "Beauté" } } };
  state.db = { from(table) {
    assert.equal(table, "prize_suggestions");
    const filters = [];
    const q = {
      select() { return q; }, in(key, values) { filters.push(r => values.includes(r[key])); return q; },
      eq(key, value) { filters.push(r => r[key] === value); return q; },
      is(key, value) { filters.push(r => (r[key] ?? null) === value); return q; }, order() { return q; },
      then(resolve, reject) {
        state.reads.push(table);
        return Promise.resolve({ data: state.rows.filter(r => filters.every(f => f(r))), error: state.error }).then(resolve, reject);
      },
    };
    return q;
  }};
});

test("six catégories exactes ; anciennes catégories uniquement lorsqu'utilisées", () => {
  assert.deepEqual(options.BEAUTY_SUBSECTOR_OPTIONS, [...new Set(catalog.map(c => c.industrySubsector))]);
  assert.equal(options.beautySubsectorOptions().length, 6);
  assert.equal(options.beautySubsectorOptions("Institut & soins").length, 7);
  assert.equal(options.beautySubsectorOptions("Ongles & cils").at(-1), "Ongles & cils");
  assert.equal(options.normalizeBeautySubsector("Massage & spa"), "Massage & Spa");
  assert.equal(options.isBeautySubsector("Inconnue"), false);
});

test("les 61 lignes conservent probabilité, coût et condition ; achat seulement lorsque requis", () => {
  assert.equal(catalog.length, 61);
  assert.equal(new Set(catalog.map(c => c.id)).size, 61);
  assert.deepEqual(options.BEAUTY_SUBSECTOR_OPTIONS.map(c => catalog.filter(s => s.industrySubsector === c).length), [7,10,12,11,10,11]);
  // Expected mandatory-purchase counts reviewed against the owner's 61 conditions.
  assert.deepEqual(options.BEAUTY_SUBSECTOR_OPTIONS.map(c =>
    catalog.filter(s => s.industrySubsector === c && fields.suggestionRequiresPurchase(s.description)).length), [2,3,6,4,4,6]);
  for (const suggestion of catalog) {
    const before = structuredClone(suggestion);
    const result = fields.prizeFieldsFromSuggestion(suggestion);
    assert.equal(result.label, suggestion.label);
    assert.equal(result.probability, suggestion.probability);
    assert.equal(result.estimatedUnitCost, suggestion.estimatedUnitCost);
    assert.equal(result.usageConditions, suggestion.description);
    assert.equal(result.totalQuantity, null);
    assert.deepEqual(suggestion, before);
  }
  assert.equal(fields.suggestionRequiresPurchase("Valable avec une prestation payante."), true);
  assert.equal(fields.suggestionRequiresPurchase("Valable sur une pose à tarif normal."), false);
  assert.equal(fields.suggestionRequiresPurchase("Valable sans obligation d’achat."), false);
  assert.equal(fields.prizeFieldsFromSuggestion({ ...catalog[0], industry: "Restauration" }).usageConditions, "");
});

for (const [category, count] of options.BEAUTY_SUBSECTOR_OPTIONS.map((c, i) => [c, [7,10,12,11,10,11][i]])) {
  test(`bibliothèque ${category} : ${count} lignes sans normalisation`, async () => {
    const actual = await repository.getPrizeSuggestions("Beauté", false, category);
    assert.equal(actual.length, count);
    assert.ok(actual.every(s => s.industrySubsector === category));
    assert.deepEqual(actual.map(s => [s.id, s.label, s.probability, s.estimatedUnitCost, s.description]).sort(),
      catalog.filter(s => s.industrySubsector === category).map(s => [s.id, s.label, s.probability, s.estimatedUnitCost, s.description]).sort());
  });
}

test("repli général sans sous-secteur ou pour ancienne catégorie ; suggestions personnalisées conservées", async () => {
  state.rows.push({ ...row(catalog[0]), id: "custom", industry_subsector: null });
  assert.equal((await repository.getPrizeSuggestions("Beauté")).length, 8);
  assert.equal((await repository.getPrizeSuggestions("Beauté", false, "Institut & soins")).length, 8);
  state.rows.push({ ...row(catalog[0]), id: "legacy-custom", industry_subsector: "Ongles & cils" });
  const legacy = await repository.getPrizeSuggestions("Beauté", false, "Ongles & cils");
  assert.equal(legacy.length, 9);
  assert.ok(legacy.some(s => s.id === "legacy-custom"));
  state.rows = state.rows.filter(s => s.industry_subsector !== "Coiffure");
  assert.equal((await repository.getPrizeSuggestions("Beauté", false, "Coiffure")).length, 8);
});

test("Massage & spa reste lisible et les autres secteurs ne changent pas", async () => {
  state.rows.push({ ...row(catalog[0]), id: "old-spa", industry_subsector: "Massage & spa" });
  assert.equal((await repository.getPrizeSuggestions("Beauté", false, "Massage & spa")).length, 11);
  state.rows.push({ ...row(catalog[0]), id: "restaurant", industry: "Restauration", industry_subsector: null });
  const restaurant = await repository.getPrizeSuggestions("Restaurant");
  assert.deepEqual(restaurant.map(s => s.id), ["restaurant"]);
  await assert.rejects(repository.getPrizeSuggestions("Restauration", false, "Coiffure"), /sous-secteur/);
});

test("l'API exige la session, garde le contexte et n'est pas mise en cache", async () => {
  state.session = null;
  assert.equal((await route.GET(new NextRequest("https://example.test/api/prize-suggestions"))).status, 401);
  assert.deepEqual(state.reads, []);
  state.session = { merchant: { industry: "Beauté", industrySubsector: "Ongles" } };
  const response = await route.GET(new NextRequest("https://example.test/api/prize-suggestions"));
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal((await response.json()).suggestions.length, 12);
  state.error = { message: "database failure" };
  assert.equal((await route.GET(new NextRequest("https://example.test/api/prize-suggestions"))).status, 500);
});

test("les deux éditeurs utilisent le mapping et le chargement cloisonné sans transformer les lots existants", () => {
  for (const name of ["campaign-wizard", "campaign-editor"]) {
    const source = readFileSync(new URL(`../components/merchant/${name}.tsx`, import.meta.url), "utf8");
    assert.match(source, /\.\.\.prizeFieldsFromSuggestion\(suggestion\)/);
    assert.match(source, /usePrizeSuggestions\(merchant\)/);
    assert.equal((source.match(/prizeFieldsFromSuggestion\(suggestion\)/g) ?? []).length, 1);
  }
  assert.doesNotMatch(migration, /\b(?:update|delete from|insert into)\s+public\.(?:campaigns|prizes|leads|draw_sessions)\b/i);
});

async function rehearsal() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create table public.merchants(id text primary key, industry text, industry_subsector text);
    create table public.prizes(id text primary key, payload jsonb);
    insert into public.prizes values ('existing', '{"label":"Lot existant","probability":50,"purchaseRequired":false,"usageConditions":"Conserver","stock":8}');
  `);
  await db.exec(sql("20260715_prize_suggestions.sql"));
  await db.exec(sql("20260715_beauty_prize_suggestions.sql"));
  await db.exec(sql("20260924_beauty_subsectors.sql"));
  return db;
}

test("nettoyage : retire les trois valeurs inutilisées, sans modification de données/RLS, idempotent et réversible", async () => {
  const db = await rehearsal();
  try {
    await db.exec(migration);
    await db.exec("insert into public.merchants values ('current','Beauté','Regard — cils & sourcils')");
    const snapshots = async () => ({
      merchants: await db.query("select * from public.merchants order by id"),
      suggestions: await db.query("select * from public.prize_suggestions order by id"),
      prizes: await db.query("select * from public.prizes order by id"),
      policies: await db.query("select * from pg_policies order by tablename, policyname"),
      rls: await db.query("select relname, relrowsecurity from pg_class where relname in ('merchants','prize_suggestions','beauty_catalog_466_backup') order by relname"),
    });
    const before = await snapshots();
    await db.exec(cleanup);
    await db.exec(cleanup);
    assert.deepEqual(await snapshots(), before);
    for (const legacy of ["Institut & soins", "Ongles & cils", "Massage & spa"]) {
      await assert.rejects(db.query("insert into public.merchants values ('obsolete','Beauté',$1)", [legacy]), /constraint/);
      await assert.rejects(db.query("update public.prize_suggestions set industry_subsector=$1 where id='ps-beauty-466-general-1'", [legacy]), /constraint/);
    }
    for (const current of options.BEAUTY_SUBSECTOR_OPTIONS) {
      await db.query("update public.merchants set industry_subsector=$1 where id='current'", [current]);
    }
    await assert.rejects(db.exec("insert into public.merchants values ('bad','Restauration','Ongles')"), /constraint/);
    const beforeRollback = await snapshots();
    await db.exec(cleanupRollback);
    await db.exec(cleanupRollback);
    assert.deepEqual(await snapshots(), beforeRollback);
    for (const legacy of ["Institut & soins", "Ongles & cils", "Massage & spa"]) {
      await db.query("update public.merchants set industry_subsector=$1 where id='current'", [legacy]);
    }
    await db.exec("update public.merchants set industry_subsector='Regard — cils & sourcils' where id='current'");
    await db.exec(cleanup);
    await assert.rejects(db.exec("update public.merchants set industry_subsector='Massage & spa' where id='current'"), /constraint/);
  } finally { await db.close(); }
});

for (const legacy of ["Institut & soins", "Ongles & cils", "Massage & spa"]) {
  for (const source of ["merchant", "inactive-custom-suggestion"]) {
    test(`nettoyage : conserve ${legacy} référencé par ${source}, sans réaffectation`, async () => {
      const db = await rehearsal();
      try {
        if (source === "merchant") {
          await db.query("insert into public.merchants values ('legacy','Beauté',$1)", [legacy]);
        } else {
          await db.query("insert into public.prize_suggestions(id,industry,industry_subsector,label,description,probability,is_active) values ('custom','Beauté',$1,'Personnalisé','Conserver',17,false)", [legacy]);
        }
        await db.exec(migration);
        const before = await db.query("select * from public.prize_suggestions order by id");
        const merchants = await db.query("select * from public.merchants order by id");
        await db.exec(cleanup);
        await db.exec(cleanup);
        assert.deepEqual(await db.query("select * from public.prize_suggestions order by id"), before);
        assert.deepEqual(await db.query("select * from public.merchants order by id"), merchants);
        const constraints = (await db.query("select pg_get_constraintdef(oid) definition from pg_constraint where conname in ('merchants_beauty_subsector_check','prize_suggestions_beauty_subsector_check')")).rows;
        assert.equal(constraints.length, 2);
        assert.ok(constraints.every(c => c.definition.includes(legacy)));
        for (const unused of ["Institut & soins", "Ongles & cils", "Massage & spa"].filter(c => c !== legacy)) {
          assert.ok(constraints.every(c => !c.definition.includes(unused)));
        }
      } finally { await db.close(); }
    });
  }
}

test("retour arrière : restaure le catalogue initial, conserve les personnalisations et les profils", async () => {
  const db = await rehearsal();
  try {
    const original = await db.query("select * from public.prize_suggestions order by id");
    const prizes = await db.query("select * from public.prizes");
    await db.exec(migration);
    await db.exec(rollback);
    assert.deepEqual(await db.query("select * from public.prize_suggestions order by id"), original);
    await db.exec(migration);
    await db.exec("insert into public.merchants values ('new-profile','Beauté','Regard — cils & sourcils')");
    await db.exec("update public.prize_suggestions set description='Personnalisation à conserver' where id='ps-beauty-466-general-1'");
    const customized = await db.query("select * from public.prize_suggestions where id='ps-beauty-466-general-1'");
    const merchants = await db.query("select * from public.merchants");
    await db.exec(rollback);
    await db.exec(rollback);
    assert.deepEqual(await db.query("select * from public.prize_suggestions where id='ps-beauty-466-general-1'"), customized);
    assert.deepEqual(await db.query("select * from public.merchants"), merchants);
    assert.deepEqual(await db.query("select * from public.prizes"), prizes);
    assert.equal((await db.query("select count(*)::int n from public.prize_suggestions where industry='Beauté'")).rows[0].n, 8);
  } finally { await db.close(); }
});

test("migration PostgreSQL réelle : 61 lignes fidèles, anciennes entrées standard remplacées, RLS et lots inchangés", async () => {
  const db = await rehearsal();
  try {
    const prizes = await db.query("select * from public.prizes");
    const other = await db.query("select * from public.prize_suggestions where industry <> 'Beauté' order by id");
    await db.exec(migration);
    const actual = (await db.query("select * from public.prize_suggestions where industry = 'Beauté' order by id")).rows;
    assert.equal(actual.length, 61);
    for (const fixture of catalog) {
      const r = actual.find(r => r.id === fixture.id);
      assert.equal(r.label, fixture.label); assert.equal(r.description, fixture.description);
      assert.equal(Number(r.probability), fixture.probability);
      assert.equal(Number(r.estimated_unit_cost), fixture.estimatedUnitCost);
      assert.equal(r.industry_subsector, fixture.industrySubsector);
    }
    assert.deepEqual(await db.query("select * from public.prizes"), prizes);
    assert.deepEqual(await db.query("select * from public.prize_suggestions where industry <> 'Beauté' order by id"), other);
    assert.equal((await db.query("select count(*)::int n from public.beauty_catalog_466_backup")).rows[0].n, 7);
    await assert.rejects(db.exec("insert into public.merchants values ('bad', 'Beauté', 'Institut & soins')"), /constraint/);
    await assert.rejects(db.exec("insert into public.merchants values ('bad', 'Beauté', 'Ongles & cils')"), /constraint/);
    await db.exec("grant select on public.prize_suggestions to anon; set role anon");
    assert.equal((await db.query("select count(*)::int n from public.prize_suggestions")).rows[0].n, 0);
    await assert.rejects(db.query("select * from public.beauty_catalog_466_backup"), /permission denied/);
    await db.exec("reset role");
    await db.exec(migration);
    assert.equal((await db.query("select count(*)::int n from public.prize_suggestions where industry='Beauté'")).rows[0].n, 61);
  } finally { await db.close(); }
});

test("migration : catégories utilisées et personnalisations préservées, réexécution sans écrasement", async () => {
  const db = await rehearsal();
  try {
    await db.exec(`
      insert into public.merchants values ('used', 'Beauté', 'Institut & soins');
      update public.prize_suggestions set description='Personnalisé' where id='ps-beauty-box';
      insert into public.prize_suggestions(id, industry, industry_subsector, label, description, probability)
      values ('custom-legacy', 'Beauté', 'Ongles & cils', 'Personnalisé', 'Préserver', 17);
    `);
    const before = await db.query("select * from public.prize_suggestions where id in ('custom-legacy','ps-beauty-box') order by id");
    const merchants = await db.query("select * from public.merchants");
    await db.exec(migration);
    assert.deepEqual(await db.query("select * from public.prize_suggestions where id in ('custom-legacy','ps-beauty-box') order by id"), before);
    assert.deepEqual(await db.query("select * from public.merchants"), merchants);
    await db.exec("insert into public.merchants values ('also-used', 'Beauté', 'Ongles & cils')");
    await db.exec("update public.prize_suggestions set description='Modification admin après migration', probability=33 where id='ps-beauty-466-general-1'");
    const customized = await db.query("select * from public.prize_suggestions where id='ps-beauty-466-general-1'");
    await db.exec(migration);
    assert.deepEqual(await db.query("select * from public.prize_suggestions where id='ps-beauty-466-general-1'"), customized);
    assert.deepEqual(await db.query("select * from public.prize_suggestions where id in ('custom-legacy','ps-beauty-box') order by id"), before);
  } finally { await db.close(); }
});
