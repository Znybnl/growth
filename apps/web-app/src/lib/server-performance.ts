import { emitOperationalRecord } from "@/lib/operational-telemetry";
// Labels are static: never pass paths, identifiers, payloads or error messages.
export type PerformanceStage =
  | "auth.validate" | "auth.context" | "auth.workspace"
  | "data.overview" | "data.activity" | "data.prizes"
  | "data.recent-contacts" | "data.results" | "data.account-pins"
  | "data.alerts" | "page.home" | "page.campaigns" | "page.results" | "page.account";

export async function measureServerStage<T>(stage: PerformanceStage, work: () => Promise<T>): Promise<T> {
  const start = performance.now();
  let success = false;
  let outcome: "success" | "redirect" | "interrupted" | "server_error" = "server_error";
  try {
    const result = await work();
    success = true;
    outcome = "success";
    return result;
  } catch (error) {
    const digest = typeof error === "object" && error !== null && "digest" in error ? error.digest : undefined;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT;")) outcome = "redirect";
    else if (typeof digest === "string" && digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;")) outcome = "interrupted";
    throw error;
  } finally {
    // Vercel correlates these structured lines with the invoking HTTP request.
    // No additional provider, persisted metric or user-specific cache is involved.
    if (process.env.OKADO_PERFORMANCE_LOGS !== "false" &&
        (process.env.NODE_ENV === "production" || process.env.OKADO_PERFORMANCE_LOGS === "true")) {
      try {
        const durationMs = Math.round((performance.now() - start) * 10) / 10;
        console.info(JSON.stringify({ event: "okado.performance", stage, durationMs, success }));
        emitOperationalRecord({ event: "server_stage_completed", schemaVersion: 1,
          stage, durationMs, outcome });
      } catch { /* Diagnostics must not change the result of a business request. */ }
    }
  }
}
