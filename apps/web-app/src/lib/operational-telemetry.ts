import { after } from "next/server";
import { waitUntil } from "@vercel/functions";
import { trace } from "@opentelemetry/api";
import { emitServerMeasurement, flushServerTelemetry, isServerTelemetryEnabled } from "@/lib/server-log-export";
import { operationalDeployment, sanitizeOperationalRecord, type OperationalRecord } from "@/lib/operational-telemetry-schema";

export function isOperationalTelemetryEnabled() {
  return process.env.OKADO_OPERATIONAL_LOGS_ENABLED !== "false" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    (process.env.NODE_ENV === "production" || process.env.OKADO_OPERATIONAL_LOGS_ENABLED === "true");
}

/** No cookie, user, session, request body or analytics SDK dependency. */
export function emitOperationalRecord(record: OperationalRecord) {
  if (!isOperationalTelemetryEnabled()) return;
  // Build-time prerenders and background work must not become page/API usage.
  if (record.event === "server_stage_completed" &&
      trace.getActiveSpan()?.spanContext().traceState?.get("okado") !== "request") return;
  let safeRecord: OperationalRecord | undefined;
  try { safeRecord = sanitizeOperationalRecord(record); } catch { return; }
  if (!safeRecord) return;
  try {
    console.info(JSON.stringify({ ...safeRecord, ...operationalDeployment(), channel: "operational" }));
  } catch { /* A broken log destination must not break the response. */ }
  try {
    emitServerMeasurement(safeRecord);
    if (!isServerTelemetryEnabled()) return;
    // Prefer Next's lifecycle. SDK callbacks may run outside its request store.
    try { after(() => flushServerTelemetry()); }
    catch { waitUntil(flushServerTelemetry()); }
  } catch { /* Export is best effort; no retry of the business operation. */ }
}
