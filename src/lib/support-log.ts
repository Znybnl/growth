import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";

type SupportLogLevel = "info" | "warn" | "error";

type SupportLogPayload = Record<string, unknown> | undefined;
type SupportLogEntry = {
  id: string;
  createdAt: string;
  level: SupportLogLevel;
  event: string;
  payload?: Record<string, unknown>;
};

const MAX_MEMORY_LOGS = 200;

declare global {
  var __okadoSupportLogs: SupportLogEntry[] | undefined;
}

function getMemoryLogs() {
  globalThis.__okadoSupportLogs ??= [];
  return globalThis.__okadoSupportLogs;
}

function sanitizePayload(payload: SupportLogPayload) {
  if (!payload) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

function firstString(payload: Record<string, unknown> | undefined, keys: string[]) {
  if (!payload) return null;

  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function buildSummary(payload: Record<string, unknown> | undefined) {
  if (!payload) return null;

  const usefulParts = [
    firstString(payload, ["error", "message", "status"]),
    firstString(payload, ["campaignId"]),
    firstString(payload, ["leadId"]),
    firstString(payload, ["email", "recipientEmail"]),
  ].filter(Boolean);

  return usefulParts.length ? usefulParts.join(" · ").slice(0, 500) : null;
}

function persistSupportLog(entry: SupportLogEntry) {
  if (!isSupabaseConfigured()) return;

  const payload = entry.payload;
  const merchantId = firstString(payload, ["merchantId"]);

  if (!merchantId) return;

  void (async () => {
    try {
      const { error } = await getSupabaseAdmin()
        .from("business_logs")
        .insert({
          level: entry.level,
          event: entry.event,
          merchant_id: merchantId,
          campaign_id: firstString(payload, ["campaignId"]),
          lead_id: firstString(payload, ["leadId"]),
          email: firstString(payload, ["email", "recipientEmail", "leadEmail"]),
          redemption_code: firstString(payload, ["redemptionCode"]),
          summary: buildSummary(payload),
          payload: payload ?? {},
          created_at: entry.createdAt,
        });

      if (error && !error.message.includes("business_logs")) {
        console.warn("[SUPPORT][business-log-persist-failed]", { error: error.message });
      }
    } catch (error) {
      console.warn("[SUPPORT][business-log-persist-failed]", {
        error: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  })();
}

export function logSupportEvent(
  level: SupportLogLevel,
  event: string,
  payload?: SupportLogPayload,
) {
  const prefix = `[SUPPORT][${event}]`;
  const cleanedPayload = sanitizePayload(payload);
  const entry: SupportLogEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    level,
    event,
    payload: cleanedPayload,
  };
  const memoryLogs = getMemoryLogs();
  memoryLogs.unshift(entry);
  memoryLogs.splice(MAX_MEMORY_LOGS);
  persistSupportLog(entry);

  switch (level) {
    case "info":
      console.info(prefix, cleanedPayload ?? {});
      break;
    case "warn":
      console.warn(prefix, cleanedPayload ?? {});
      break;
    default:
      console.error(prefix, cleanedPayload ?? {});
      break;
  }
}

export function getMemorySupportLogs() {
  return getMemoryLogs();
}
