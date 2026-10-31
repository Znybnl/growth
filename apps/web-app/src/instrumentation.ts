import type { Instrumentation } from "next";
import { registerServerLogs } from "@/lib/server-log-export";

// Preserve the existing operational error API used by campaign setup.
export { emitServerError, flushServerTelemetry, isServerTelemetryEnabled } from "@/lib/server-log-export";
export type { ServerTelemetryAttributes } from "@/lib/server-log-export";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  registerServerLogs();
  const { registerOperationalTracing } = await import("@/lib/operational-tracing");
  registerOperationalTracing();
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  try {
    const digest = typeof error === "object" && error !== null && "digest" in error ? error.digest : undefined;
    if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT;") ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;"))) return;
    const { operationalRoute, operationalMethod } = await import("@/lib/operational-telemetry-schema");
    const { emitOperationalRecord } = await import("@/lib/operational-telemetry");
    const contextRoute = operationalRoute(context.routePath);
    const route = contextRoute === "/unmatched" ? operationalRoute(request.path) : contextRoute;
    if (!route) return;
    emitOperationalRecord({ event: "server_error_detected", schemaVersion: 1,
      route, method: operationalMethod(request.method), outcome: "server_error" });
  } catch { /* Never leak the error, request, headers, digest or context. */ }
};
