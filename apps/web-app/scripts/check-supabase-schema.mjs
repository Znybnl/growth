import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (!match) continue;
    values[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

const repoRoot = path.resolve(process.cwd(), "../..");
const fileEnv = readEnvFile(path.join(process.cwd(), ".env.local"));
const env = { ...fileEnv, ...process.env };
const supabaseUrl = env.OKADO_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.OKADO_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (env.OKADO_ALLOW_INSECURE_LOCAL_TLS === "true") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.warn("Attention : vérification TLS désactivée uniquement pour ce contrôle local.");
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont nécessaires.");
  process.exit(1);
}
if (!anonKey) {
  console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY est nécessaire pour le contrôle RLS public.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const supabasePublic = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const checks = [];

async function checkTable(table, columns) {
  const { error } = await supabase.from(table).select(columns).limit(0);
  if (error) throw new Error(`Table ${table}: ${error.message}`);
  checks.push({ type: "table", name: table, ok: true });
}

async function checkRpc(name, args) {
  const { error } = await supabase.rpc(name, args);
  if (error) throw new Error(`RPC ${name}: ${error.message}`);
  checks.push({ type: "rpc", name, ok: true });
}

async function checkPublicAccessIsBlocked(table) {
  const { data, error } = await supabasePublic.from(table).select("id").limit(1);
  if (!error && (data?.length ?? 0) > 0) {
    throw new Error(`RLS publique absente ou trop permissive sur ${table}`);
  }
  checks.push({ type: "rls", name: table, ok: true, access: error ? "denied" : "empty" });
}

for (const [table, columns] of [
  ["merchants", "id,redemption_pin_hash"],
  ["campaigns", "id,merchant_id"],
  ["leads", "id,campaign_id,redemption_code"],
  ["prizes", "id,campaign_id,remaining_quantity"],
  ["campaign_events", "id,campaign_id,event_type"],
  ["draw_sessions", "id,campaign_id,status"],
  ["campaign_actions", "id,campaign_id,position"],
  ["reward_email_deliveries", "id,lead_id,status"],
  ["public_rate_limits", "key,count,reset_at"],
  ["daily_participation_locks", "campaign_id,date_key,fingerprint_hash"],
  ["cashier_redemption_audits", "id,merchant_id,lead_id"],
]) {
  await checkTable(table, columns);
}

for (const table of ["merchants", "campaigns", "leads", "reward_email_deliveries"]) {
  await checkPublicAccessIsBlocked(table);
}

const { data: campaign, error: campaignError } = await supabase
  .from("campaigns")
  .select("id")
  .limit(1)
  .maybeSingle();
if (campaignError) throw campaignError;

const rateKey = `schema-check-${Date.now()}`;
await checkRpc("consume_public_rate_limit", {
  p_key: rateKey,
  p_limit: 2,
  p_window_seconds: 60,
});

const fingerprint = `schema-check-${Date.now()}`;
if (campaign?.id) {
  await checkRpc("claim_daily_participation_lock", {
    p_campaign_id: campaign.id,
    p_fingerprint_hash: fingerprint,
  });
  await checkRpc("release_daily_participation_lock", {
    p_campaign_id: campaign.id,
    p_fingerprint_hash: fingerprint,
  });
}

const migrationChecks = [
  ["20260710_security_p0_hardening.sql", ["enable row level security", "consume_public_rate_limit", "claim_daily_participation_lock"]],
  ["20260718_cashier_redemption.sql", ["cashier_redemption_audits", "redeem_cashier_lead_prize"]],
  ["20260720_fix_cashier_rpc_status_scope.sql", ["redeem_cashier_lead_prize", "p_merchant_id"]],
  ["20260723_redemption_pin.sql", ["redemption_pin_hash"]],
];
for (const [file, needles] of migrationChecks) {
  const filePath = path.join(repoRoot, "supabase", "migrations", file);
  const text = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  if (!text || needles.some((needle) => !text.toLowerCase().includes(needle.toLowerCase()))) {
    throw new Error(`Migration locale incomplète ou absente: ${file}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  target: new URL(supabaseUrl).hostname,
  checks,
  note: "Les tables et RPC répondent avec la service role, et les lectures anonymes sont refusées. L’état exact des policies doit aussi être confirmé dans SQL Editor ou via supabase db lint sur la base cible.",
}, null, 2));
