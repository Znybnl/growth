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

async function checkPublicAccessIsBlocked(table, columns = "id", strict = false) {
  const { data, error } = await supabasePublic.from(table).select(columns).limit(1);
  if (strict && error?.code !== "42501") {
    throw new Error(`Lecture anonyme non refusée explicitement sur ${table}`);
  }
  if (!error && (data?.length ?? 0) > 0) {
    throw new Error(`RLS publique absente ou trop permissive sur ${table}`);
  }
  checks.push({ type: "rls", name: table, ok: true, access: error ? "denied" : "empty" });
}

for (const [table, columns] of [
  ["affiliate_accounts", "id,workspace_id,canonical_account_id,status,commission_rate_bps,commission_duration_months"],
  ["affiliate_referrals", "id,affiliate_workspace_id,referred_workspace_id,first_subscription_paid_at,commission_eligible_until"],
  ["merchants", "id,restaurant_email,redemption_pin_hash,appointment_url,google_place_name,google_place_address,google_place_rating,google_place_review_count"],
  ["campaigns", "id,merchant_id"],
  ["leads", "id,campaign_id,redemption_code"],
  ["prizes", "id,campaign_id,remaining_quantity"],
  ["campaign_events", "id,campaign_id,event_type"],
  ["draw_sessions", "id,campaign_id,status,marketing_click_context"],
  ["google_click_warning_acceptances", "id,merchant_id,actor_user_id,accepted_at,warning_version,warning_text,campaign_id"],
  ["campaign_participation_marketing", "campaign_id,participation_id,marketing_action_clicked,marketing_action_kind"],
  ["campaign_participations", "campaign_id,participation_id,created_at"],
  ["campaign_effective_redemptions", "lead_id,campaign_id,redeemed_at"],
  ["campaign_actions", "id,campaign_id,position"],
  ["reward_email_deliveries", "id,lead_id,status,support_handled_at,support_handled_by,support_handled_event_at,support_handled_status,support_is_handled"],
  ["merchant_gain_notification_preferences", "user_id,merchant_id,frequency,updated_at"],
  ["merchant_gain_notification_events", "user_id,merchant_id,lead_id,job_id,won_at"],
  ["merchant_gain_notification_jobs", "id,status,lease_token,gains,email_payload,recipient"],
  ["reward_reminder_settings", "workspace_id,enabled,days,version,updated_at"],
  ["reward_reminder_jobs", "id,lead_id,status,email_payload,provider_id"],
  ["reward_reminder_runner", "singleton,token,lease_until"],
  ["public_rate_limits", "key,count,reset_at"],
  ["daily_participation_locks", "campaign_id,date_key,fingerprint_hash"],
  ["cashier_redemption_audits", "id,merchant_id,lead_id"],
  ["archived_leads", "id,campaign_id,merchant_id,original_created_at,purge_after"],
  ["archived_campaign_events", "id,campaign_id,event_type,original_created_at,purge_after"],
  ["archived_cashier_redemption_audits", "id,merchant_id,lead_id,original_created_at,purge_after"],
]) {
  await checkTable(table, columns);
}

for (const table of ["merchants", "campaigns", "leads", "reward_email_deliveries"]) {
  await checkPublicAccessIsBlocked(table);
}
for (const [table, columns] of [
  ["merchant_gain_notification_preferences", "user_id"],
  ["merchant_gain_notification_events", "lead_id"],
  ["merchant_gain_notification_jobs", "id"],
  ["reward_reminder_settings", "workspace_id"],
  ["reward_reminder_jobs", "id"],
  ["reward_reminder_runner", "singleton"],
  ["campaign_participations", "campaign_id"],
  ["google_click_warning_acceptances", "id"],
  ["campaign_participation_marketing", "campaign_id"],
  ["campaign_effective_redemptions", "lead_id"],
  ["archived_leads", "id"],
  ["archived_campaign_events", "id"],
  ["archived_cashier_redemption_audits", "id"],
]) {
  await checkPublicAccessIsBlocked(table, columns, true);
}
// Read-only permission probe: never call a claim/enqueue RPC on real data here.
const affiliateProbe = { p_merchant_id: "schema-probe-no-merchant", p_invoice_id: "schema-probe-no-invoice",
  p_paid_at: "2030-01-01T00:00:00Z", p_amount_cents: 0, p_currency: "eur", p_subscription_id: null };
// Amount zero returns before reading or writing any real attribution/invoice.
await checkRpc("record_affiliate_paid_invoice_677", affiliateProbe);
const affiliatePublic = await supabasePublic.rpc("record_affiliate_paid_invoice_677", affiliateProbe);
if (affiliatePublic.error?.code !== "42501") throw new Error("La RPC de commission doit être privée.");
for (const table of ["affiliate_accounts", "affiliate_referrals", "affiliate_commissions", "affiliate_payouts"]) {
  await checkPublicAccessIsBlocked(table);
}
await checkRpc("get_merchant_participation_activity", {p_merchant_id:"schema-probe-no-merchant"});
await checkRpc("get_merchant_participation_counts", {p_merchant_id:"schema-probe-no-merchant"});
await checkRpc("get_campaign_metric_counts", {p_campaign_ids:["schema-probe-no-campaign"]});
await checkRpc("get_merchant_metric_details", {p_merchant_id:"schema-probe-no-merchant"});
await checkRpc("get_platform_operational_metrics", {});
for (const [name,args] of [
  ["get_campaign_metric_counts", {p_campaign_ids:["schema-probe-no-campaign"]}],
  ["get_merchant_metric_details", {p_merchant_id:"schema-probe-no-merchant"}],
  ["get_platform_operational_metrics", {}],
  ["record_marketing_click", {p_campaign_id:"schema-probe-no-campaign",p_event_id:"probe",p_event_type:"social_clicked",p_action_id:"probe",p_session_id:"probe"}],
  ["create_draw_session_with_marketing", {p_campaign_id:"schema-probe-no-campaign",p_session_id:"probe",p_click_event_id:null,p_proposed_action_id:null}],
]) {
  const {error}=await supabasePublic.rpc(name,args);
  if(error?.code!=="42501")throw new Error(`La RPC ${name} doit être privée.`);
}
const participationProbe = await supabase.rpc("record_draw_session_participation", {
  p_campaign_id:"schema-probe-no-campaign",p_session_id:"schema-probe-no-session",
});
if (participationProbe.error || participationProbe.data !== false) {
  throw new Error("La RPC de participation doit refuser une session inexistante.");
}
const reminderArgs = { p_user: "schema-probe-no-user", p_workspace: "schema-probe-no-workspace" };
for (const client of [supabase, supabasePublic]) {
  const { error } = await client.rpc("get_reward_reminder_settings", reminderArgs);
  if (error?.code !== "42501") throw new Error("La RPC de relance doit refuser l’utilisateur non autorisé.");
}
await checkRpc("reward_reminder_due", { p_expiry: "2030-10-19T12:00:00Z", p_days: 7, p_zone: "Europe/Paris" });
const reminderVersion = await supabase.rpc("reward_reminder_schedule_version", {});
if (reminderVersion.error || reminderVersion.data !== "vercel-daily-v1") {
  throw new Error("La migration de relance quotidienne Vercel est nécessaire.");
}
for (const section of ["emails", "webhooks", "claims", "logs"]) {
  await checkRpc("get_support_monitoring", { p_section: section, p_merchant: "schema-probe-no-site" });
}
const { error: monitoringPublicError } = await supabasePublic.rpc("get_support_monitoring", { p_section: "locations" });
if (monitoringPublicError?.code !== "42501") throw new Error("La RPC de Supervision n’est pas privée.");
checks.push({ type: "rls", name: "get_support_monitoring", ok: true, access: "denied" });
const permissionArgs = { p_user: "schema-probe-no-user", p_merchant: "schema-probe-no-site" };
await checkRpc("can_receive_merchant_gain_notification", permissionArgs);
const { error: gainRpcPublicError } = await supabasePublic.rpc("can_receive_merchant_gain_notification", permissionArgs);
if (gainRpcPublicError?.code !== "42501") throw new Error("La RPC de notification n’est pas privée.");
checks.push({ type: "rls", name: "gain_notification_rpc", ok: true, access: "denied" });

// Unknown actor is rejected before reading/updating a delivery: non-mutating probe.
const supportArgs = {
  p_delivery_id: "00000000-0000-0000-0000-000000000000",
  p_actor_user_id: "schema-probe-no-user",
  p_expected_event_at: null, p_expected_status: "failed",
};
const { error: supportProbeError } = await supabase.rpc("handle_support_email_incident", supportArgs);
if (supportProbeError?.code !== "42501" || supportProbeError.message !== "Unknown actor") {
  throw new Error("La RPC de traitement des incidents n’est pas disponible ou son garde-fou acteur est absent.");
}
const { error: supportPublicError } = await supabasePublic.rpc("handle_support_email_incident", supportArgs);
if (supportPublicError?.code !== "42501" || supportPublicError.message === "Unknown actor") {
  throw new Error("La RPC de traitement des incidents n’est pas privée.");
}
checks.push({ type: "rpc", name: "handle_support_email_incident", ok: true, access: "service_role_only" });

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
  ["20261011220000_support_monitoring_491.sql", ["get_support_monitoring", "security definer", "revoke all"]],
  ["20261011_support_email_incidents_487.sql", ["support_is_handled", "handle_support_email_incident", "revoke all"]],
  ["20261006_merchant_gain_notifications_473.sql", ["merchant_gain_notification_preferences", "prepare_merchant_gain_notification_payload", "enable row level security"]],
  ["20260710_security_p0_hardening.sql", ["enable row level security", "consume_public_rate_limit", "claim_daily_participation_lock"]],
  ["20260718_cashier_redemption.sql", ["cashier_redemption_audits", "redeem_cashier_lead_prize"]],
  ["20260720_fix_cashier_rpc_status_scope.sql", ["redeem_cashier_lead_prize", "p_merchant_id"]],
  ["20260723_redemption_pin.sql", ["redemption_pin_hash"]],
  ["20260830_google_place_metadata.sql", ["google_place_name", "google_place_address", "google_place_rating", "google_place_review_count"]],
  ["20260831_personal_data_lifecycle.sql", ["archived_leads", "archived_campaign_events", "archived_cashier_redemption_audits", "purge_personal_data"]],
  ["20260929_reward_email_merchant_defaults.sql", ["restaurant_email", "{{merchantName}}", "à partir de demain"]],
  ["20260924_add_merchant_appointment_url.sql", ["appointment_url"]],
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
