// Labels are static: never pass paths, identifiers, payloads or error messages.
export type PerformanceStage =
  | "auth.validate" | "auth.context" | "auth.workspace"
  | "data.overview" | "data.activity" | "data.prizes"
  | "data.recent-contacts" | "data.results" | "data.account-pins"
  | "data.alerts" | "page.home" | "page.campaigns" | "page.results" | "page.account";

export async function measureServerStage<T>(stage: PerformanceStage, work: () => Promise<T>): Promise<T> {
  const start = performance.now();
  let success = false;
  try {
    const result = await work();
    success = true;
    return result;
  } finally {
    // Vercel correlates these structured lines with the invoking HTTP request.
    // No additional provider, persisted metric or user-specific cache is involved.
    if (process.env.OKADO_PERFORMANCE_LOGS !== "false" &&
        (process.env.NODE_ENV === "production" || process.env.OKADO_PERFORMANCE_LOGS === "true")) {
      try {
        console.info(JSON.stringify({ event: "okado.performance", stage,
          durationMs: Math.round((performance.now() - start) * 10) / 10, success }));
      } catch { /* Diagnostics must not change the result of a business request. */ }
    }
  }
}
