import { APPLICATION_ANALYTICS_PAGES } from "@/lib/analytics-routes";
import { OPERATIONAL_API_ROUTES } from "@/lib/operational-api-routes";

const families = [...OPERATIONAL_API_ROUTES, ...APPLICATION_ANALYTICS_PAGES];
const exactFamilies = new Set<string>(families);
const patterns = families.map(route => ({ route,
  pattern: new RegExp("^" + route.split("/").map(part => part.startsWith("[")
    ? "[^/?#]+" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("/") + "$"),
}));
const methods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
export const OPERATIONAL_STAGES = ["auth.validate", "auth.context", "auth.workspace",
  "data.overview", "data.activity", "data.prizes", "data.recent-contacts", "data.results",
  "data.account-pins", "data.alerts", "page.home", "page.campaigns", "page.results", "page.account"] as const;
const outcomes = new Set(["success", "redirect", "client_error", "server_error", "unknown", "interrupted"]);

export function operationalDeployment() {
  const value = process.env.VERCEL_ENV || process.env.NODE_ENV;
  return {
    environment: ["production", "preview", "development", "test"].includes(value ?? "") ? value! : "unknown",
    version: /^[a-f0-9]{7,40}$/.test(process.env.VERCEL_GIT_COMMIT_SHA ?? "")
      ? process.env.VERCEL_GIT_COMMIT_SHA!.slice(0, 12) : "unknown",
    region: /^[a-z]{3}\d{1,2}$/.test(process.env.VERCEL_REGION ?? "") ? process.env.VERCEL_REGION! : "unknown",
  };
}

/** Never return the caller's input. Unknown and malicious paths collapse to one bucket. */
export function operationalRoute(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 4096) return "/unmatched";
  const path = value.split(/[?#]/, 1)[0].replace(/\/\([^/]*\)/g, "");
  if (path.startsWith("/_next/") || path.startsWith("/images/") ||
      ["/favicon.ico", "/icon.svg", "/robots.txt", "/sitemap.xml"].includes(path)) return undefined;
  if (["/_not-found", "/404", "/not-found"].includes(path)) return "/not-found";
  if (exactFamilies.has(path)) return path;
  return patterns.find(({ pattern }) => pattern.test(path))?.route ?? "/unmatched";
}

export function operationalMethod(value: unknown) {
  return typeof value === "string" && methods.has(value) ? value : "OTHER";
}

export function operationalDuration(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 3_600_000
    ? Math.round(value * 10) / 10 : undefined;
}

export type OperationalRecord = {
  event: "http_request_completed" | "server_error_detected" | "server_stage_completed";
  schemaVersion: 1;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  requestKind?: "api" | "rsc" | "document" | "unmatched";
  prefetch?: "yes" | "no" | "unknown";
  instanceFirstRequest?: boolean;
  stage?: string;
  outcome: "success" | "redirect" | "client_error" | "server_error" | "unknown" | "interrupted";
};

export function requestMeasurement(attributes: Record<string, unknown>, duration: unknown,
  instanceFirstRequest: boolean): OperationalRecord | undefined {
  if (typeof attributes["http.target"] === "string" && operationalRoute(attributes["http.target"]) === undefined) return;
  // http.target is read only to classify against the closed list; never exported.
  const route = operationalRoute(attributes["http.route"] ?? attributes["next.route"] ?? attributes["http.target"]);
  const durationMs = operationalDuration(duration);
  if (!route || durationMs === undefined) return undefined;
  const code = attributes["http.response.status_code"] ?? attributes["http.status_code"];
  const status = typeof code === "number" && Number.isInteger(code) && code >= 100 && code <= 599 ? code : undefined;
  const prefetch = attributes["next.prefetch"];
  return {
    event: "http_request_completed", schemaVersion: 1, route,
    method: operationalMethod(attributes["http.request.method"] ?? attributes["http.method"]),
    status, durationMs, instanceFirstRequest,
    requestKind: route.startsWith("/api/") ? "api" : route === "/unmatched" ? "unmatched"
      : attributes["next.rsc"] === true ? "rsc" : "document",
    prefetch: prefetch === true ? "yes" : prefetch === false ? "no" : "unknown",
    outcome: status === undefined ? "unknown" : status >= 500 ? "server_error"
      : status >= 400 ? "client_error" : status >= 300 ? "redirect" : "success",
  };
}

/** Runtime allowlist is also applied at the sink, not only at typed call sites. */
export function sanitizeOperationalRecord(input: OperationalRecord): OperationalRecord | undefined {
  const durationMs = operationalDuration(input.durationMs);
  const outcome = outcomes.has(input.outcome) ? input.outcome : "unknown";
  if (input.event === "server_stage_completed") {
    if (!(OPERATIONAL_STAGES as readonly string[]).includes(input.stage ?? "") || durationMs === undefined) return;
    return { event: input.event, schemaVersion: 1, stage: input.stage, durationMs, outcome };
  }
  if (input.event === "http_request_completed") return requestMeasurement({
    "http.route": input.route, "http.method": input.method, "http.status_code": input.status,
    "next.rsc": input.requestKind === "rsc", "next.prefetch": input.prefetch === "yes" ? true
      : input.prefetch === "no" ? false : undefined,
  }, durationMs, input.instanceFirstRequest === true);
  if (input.event === "server_error_detected") {
    const route = operationalRoute(input.route);
    return route ? { event: input.event, schemaVersion: 1, route,
      method: operationalMethod(input.method), outcome: "server_error" } : undefined;
  }
}
