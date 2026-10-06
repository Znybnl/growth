// Read-only: no merchant identifiers, player data or credentials are logged.
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import original from "../src/lib/beauty-catalog-legacy.fixture.json" with { type: "json" };
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configuration Supabase serveur requise.");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const [merchants, suggestions] = await Promise.all([
  db.from("merchants").select("industry_subsector").eq("industry", "Beauté"),
  db.from("prize_suggestions").select("*").eq("industry", "Beauté"),
]);
if (merchants.error || suggestions.error) throw new Error("Audit indisponible ; aucune modification effectuée.");
const untouched = suggestions.data.filter(s => original.some(o =>
  s.id === o.id && s.industry_subsector == null && s.label === o.label
  && s.description === o.description && Number(s.probability) === o.probability
  && Number(s.estimated_unit_cost) === o.estimatedUnitCost && s.icon === o.icon
  && s.sort_order === o.sortOrder && s.is_active === true));
console.log(JSON.stringify({
  beautySuggestions: suggestions.data.length,
  untouchedStandard: untouched.length,
  preservedOtherOrCustomized: suggestions.data.length - untouched.length,
  legacyUsage: ["Institut & soins", "Ongles & cils"].map(category => ({
    category,
    establishments: merchants.data.filter(m => m.industry_subsector === category).length,
    suggestions: suggestions.data.filter(s => s.industry_subsector === category).length,
  })),
}, null, 2));
