import { getSupabaseAdmin } from "@/lib/supabase";
import { isSaasAdminEmail } from "@/lib/admin";

export const SUPPORT_SECTIONS = ["emails", "webhooks", "claims", "logs"] as const;
export type SupportSection = typeof SUPPORT_SECTIONS[number];
export type SupportParams = Record<string, string | string[] | undefined>;
export type SupportFilters = {
  q: string; merchant: string; from: string; to: string; status: string;
  section: "all" | SupportSection; incidents: "all" | "active" | "handled";
  pages: Record<SupportSection, number>; error?: string;
};
export type SupportRecord = {
  id: string; kind: "reward" | "notification" | "webhook" | "claim" | "log";
  at: string; status: string; title?: string; merchant?: string; participant?: string;
  recipient?: string; detail?: string; eventAt?: string; handled?: boolean;
  handledAt?: string; canHandle?: boolean; code?: string; availableAt?: string;
  expiresAt?: string; retryAt?: string; attempts?: number; periodStart?: string;
  periodEnd?: string; part?: number; parts?: number; providerId?: string;
  campaignId?: string; leadId?: string;
};
export type SupportStats = {
  incidents?: number; queued?: number; jobsWaiting?: number; jobsRetry?: number;
  jobsReview?: number; eventsWaiting?: number; oldestEvent?: string | null;
  latestWebhook?: string | null;
  errorLogs?: number;
  lastRun?: { at: string; status: string; event: string; detail?: string } | null;
};
export type SupportSlice = { rows: SupportRecord[]; total: number | null; page: number;
  available: boolean; stats: SupportStats };
export type SupportMonitoring = {
  sections: Record<SupportSection, SupportSlice>;
  locations: { id: string; name: string }[]; locationsAvailable: boolean; updatedAt: string;
};

const first = (value: string | string[] | undefined) => typeof value === "string" ? value : value?.[0] ?? "";
const dateValid = (value: string) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);

export function parseSupportFilters(params: SupportParams): SupportFilters {
  const from = first(params.from), to = first(params.to);
  const section = first(params.section), incidents = first(params.incidents);
  const pages = Object.fromEntries(SUPPORT_SECTIONS.map(key => {
    const raw = first(params[key + "Page"]);
    return [key, /^\d+$/.test(raw) ? Math.max(1, Math.min(1_000_000, Number(raw))) : 1];
  })) as Record<SupportSection, number>;
  return {
    q: first(params.q).trim().slice(0, 200), merchant: first(params.merchant).slice(0, 200),
    from, to, status: first(params.status).slice(0, 100) || "all",
    section: SUPPORT_SECTIONS.includes(section as SupportSection) ? section as SupportSection : "all",
    incidents: incidents === "active" || incidents === "handled" ? incidents : "all", pages,
    ...(!dateValid(from) || !dateValid(to) || (from && to && from > to)
      ? { error: "Vérifiez la période : dates valides, début antérieur ou égal à la fin." } : {}),
  };
}

export function supportHref(filters: SupportFilters, change: Record<string, string | number> = {}, base = "/support") {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({
    q: filters.q, merchant: filters.merchant, from: filters.from, to: filters.to,
    status: filters.status, section: filters.section, incidents: filters.incidents,
    ...Object.fromEntries(SUPPORT_SECTIONS.map(key => [key + "Page", filters.pages[key]])), ...change,
  })) {
    if (value !== "" && value !== "all" && !(key.endsWith("Page") && String(value) === "1")) params.set(key, String(value));
  }
  return base + (params.size ? "?" + params.toString() : "");
}

export function unavailableSlice(): SupportSlice {
  return { rows: [], total: null, page: 1, available: false, stats: {} };
}

// Defence in depth: this service-role read is never callable on behalf of a merchant.
export async function getSupportMonitoring(adminEmail: string | undefined, filters: SupportFilters): Promise<SupportMonitoring> {
  if (!isSaasAdminEmail(adminEmail)) throw new Error("Accès administrateur requis.");
  const empty = (): SupportMonitoring => ({
    sections: Object.fromEntries(SUPPORT_SECTIONS.map(key => [key, unavailableSlice()])) as SupportMonitoring["sections"],
    locations: [], locationsAvailable: false, updatedAt: new Date().toISOString(),
  });
  const result = empty();
  if (filters.error) return result;
  try {
    const db = getSupabaseAdmin();
    await Promise.all([
      (async () => {
        try {
          const { data, error } = await db.rpc("get_support_monitoring", { p_section: "locations" });
          if (!error && Array.isArray(data)) { result.locations = data; result.locationsAvailable = true; }
        } catch { /* Preserve explicit unavailable state, without logging private DB errors. */ }
      })(),
      ...SUPPORT_SECTIONS.map(async key => {
        try {
          const { data, error } = await db.rpc("get_support_monitoring", {
            p_section: key, p_merchant: filters.merchant || null, p_query: filters.q,
            p_from: filters.from ? filters.from + "T00:00:00Z" : null,
            p_until: filters.to ? new Date(Date.parse(filters.to) + 86_400_000).toISOString() : null,
            p_status: filters.status, p_incidents: filters.incidents,
            p_page: filters.pages[key], p_size: 25,
          });
          if (!error && data && Array.isArray(data.rows) && Number.isSafeInteger(data.total) &&
            data.total >= 0 && Number.isSafeInteger(data.page) && data.page >= 1) {
            result.sections[key] = { rows: data.rows, total: data.total, page: data.page,
              available: true, stats: data.stats ?? {} };
          }
        } catch { /* A partial source failure must not hide the other sources. */ }
      }),
    ]);
  } catch { /* Missing configuration is not a healthy, empty production backend. */ }
  result.updatedAt = new Date().toISOString();
  return result;
}
