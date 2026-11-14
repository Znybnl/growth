import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("les couleurs visibles des roues Tropical existantes sont préservées et le retour arrière respecte les choix ultérieurs", async () => {
  const db = new PGlite();
  const sql = (name) => readFileSync(new URL(`../../../supabase/${name}`, import.meta.url), "utf8");
  try {
    await db.exec(`create role anon; create role authenticated;
      create table public.campaigns (id text primary key, game_type text, heading_text_color text not null, campaign_local_settings jsonb);
      insert into public.campaigns values
      ('legacy', 'wheel', '#ffffff', '{"gamePageTemplateId":"travel-tropical","logoTextColor":"#05424d"}'),
      ('changed', 'wheel', '#123456', '{"gamePageTemplateId":"travel-tropical","logoTextColor":"#005360"}'),
      ('other', 'wheel', '#ffffff', '{"gamePageTemplateId":"travel-elegant","logoTextColor":"#05424d"}'),
      ('scratch', 'scratch', '#ffffff', '{"gamePageTemplateId":"travel-scratch-tropical","logoTextColor":"#05424d"}'),
      ('missing', 'wheel', '#ffffff', '{"gamePageTemplateId":"travel-tropical"}');`);
    const migration = sql("migrations/20261114130000_preserve_tropical_title_color_786.sql");
    await db.exec(migration); await db.exec(migration);
    const values = async () => (await db.query("select id, heading_text_color from public.campaigns order by id")).rows;
    assert.deepEqual(await values(), [
      {id:"changed",heading_text_color:"#005360"}, {id:"legacy",heading_text_color:"#05424d"},
      {id:"missing",heading_text_color:"#ffffff"}, {id:"other",heading_text_color:"#ffffff"},
      {id:"scratch",heading_text_color:"#ffffff"},
    ]);
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from public.tropical_title_color_786_backup"), /permission denied/);
    await db.exec("reset role; update public.campaigns set heading_text_color='#123456' where id='changed';");
    await db.exec(migration);
    assert.equal((await values()).find((row) => row.id === "changed").heading_text_color, "#123456");
    await db.exec("update public.campaigns set heading_text_color='#abcdef' where id='changed';");
    await db.exec(sql("rollback/20261114130000_preserve_tropical_title_color_786.sql"));
    const after = await values();
    assert.equal(after.find((row) => row.id === "changed").heading_text_color, "#abcdef");
    assert.equal(after.find((row) => row.id === "legacy").heading_text_color, "#ffffff");
  } finally { await db.close(); }
});
