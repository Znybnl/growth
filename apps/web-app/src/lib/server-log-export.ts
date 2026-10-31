import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider, type LogRecordExporter } from "@opentelemetry/sdk-logs";
import { ROOT_CONTEXT } from "@opentelemetry/api";
import type { OperationalRecord } from "@/lib/operational-telemetry-schema";
import { operationalDeployment } from "@/lib/operational-telemetry-schema";

const serviceName = process.env.POSTHOG_OTEL_LOGS_SERVICE_NAME || "okado-web";
let telemetryEnabled =
  process.env.POSTHOG_OTEL_LOGS_ENABLED === "true" &&
  Boolean(process.env.POSTHOG_OTEL_LOGS_TOKEN);
const serviceVersion =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.npm_package_version ||
  "development";
const deploymentEnvironment =
  process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

function getPostHogLogsUrl() {
  const host = process.env.POSTHOG_OTEL_LOGS_HOST || "https://eu.i.posthog.com";
  const url = new URL("/i/v1/logs", host);
  const eu = url.protocol === "https:" && url.hostname === "eu.i.posthog.com";
  const localCollector = url.protocol === "http:" && url.hostname === "127.0.0.1";
  if (url.username || url.password || (!eu && !localCollector)) throw new Error("Invalid telemetry destination");
  return url.toString();
}

function createLoggerProvider() {
  let url: string | undefined;
  if (telemetryEnabled) {
    try { url = getPostHogLogsUrl(); } catch { telemetryEnabled = false; }
  }
  if (!telemetryEnabled) {
    return new LoggerProvider({
      resource: resourceFromAttributes({
        "service.name": serviceName,
        "service.version": serviceVersion,
        "deployment.environment": deploymentEnvironment,
      }),
    });
  }

  const transport = new OTLPLogExporter({
    url: url!,
    timeoutMillis: 1500,
    headers: {
      Authorization: `Bearer ${process.env.POSTHOG_OTEL_LOGS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  const exporter: LogRecordExporter = {
    export(records, callback) {
      transport.export(records, result => {
        // OpenTelemetry's SUCCESS result is 0. Never echo the transport error.
        if (result.code !== 0) warnExportFailure();
        callback(result);
      });
    },
    forceFlush: () => transport.forceFlush(),
    shutdown: () => transport.shutdown(),
  };

  return new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": serviceName,
      "service.version": serviceVersion,
      "deployment.environment": deploymentEnvironment,
    }),
    processors: [new BatchLogRecordProcessor({ exporter, maxQueueSize: 1024,
      maxExportBatchSize: 128, exportTimeoutMillis: 2000 })],
  });
}

const providerState = globalThis as typeof globalThis & { __okadoServerLogProvider?: LoggerProvider };
export const loggerProvider = providerState.__okadoServerLogProvider ??= createLoggerProvider();
const logger = loggerProvider.getLogger(serviceName);
const flushGlobals = globalThis as typeof globalThis & {
  __okadoLogFlush?: { emitted: number; pending?: Promise<void> };
};
const flushState = flushGlobals.__okadoLogFlush ??= { emitted: 0 };

export function registerServerLogs() { logs.setGlobalLoggerProvider(loggerProvider); }

export type ServerTelemetryAttributes = Record<
  string,
  string | number | boolean | undefined
>;

function classifyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("campaign_actions_pkey")) {
    return "campaign_actions_duplicate";
  }
  if (normalized.includes("duplicate key")) {
    return "duplicate_key";
  }
  if (normalized.includes("authentification")) {
    return "authentication_required";
  }
  return "unclassified";
}

function redactMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return message
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\bBearer\s+[^\s]+/gi, "Bearer [redacted]")
    .replace(/\bph[cx]_[A-Za-z0-9]+\b/g, "[redacted-token]")
    .slice(0, 240);
}

export function emitServerError(
  event: string,
  error: unknown,
  attributes: ServerTelemetryAttributes = {},
) {
  if (!telemetryEnabled) return;

  logger.emit({
    severityNumber: SeverityNumber.ERROR,
    severityText: "ERROR",
    body: event,
    attributes: {
      event_name: event,
      error_code: classifyError(error),
      error_type: error instanceof Error ? error.name : "UnknownError",
      error_message: redactMessage(error),
      ...attributes,
    },
  });
  flushState.emitted++;
}

export function isServerTelemetryEnabled() {
  return telemetryEnabled;
}

/** Operational measurements never inherit trace/span IDs or arbitrary attributes. */
export function emitServerMeasurement(record: OperationalRecord) {
  if (!telemetryEnabled) return;
  logger.emit({
    context: ROOT_CONTEXT,
    severityNumber: record.outcome === "server_error" ? SeverityNumber.ERROR : SeverityNumber.INFO,
    severityText: record.outcome === "server_error" ? "ERROR" : "INFO",
    body: record.event,
    attributes: Object.fromEntries(Object.entries({ ...record, ...operationalDeployment(), channel: "operational",
      event_name: record.event }).filter(([, value]) => value !== undefined)),
  });
  flushState.emitted++;
}

export async function flushServerTelemetry() {
  if (!telemetryEnabled) return;
  // Every concurrent request awaits the same drain. The SDK alone returns
  // early on concurrent forceFlush calls and may leave new records buffered.
  if (flushState.pending) return flushState.pending;
  flushState.pending = (async () => {
    const deadline = Date.now() + 2000;
    try {
      do {
        const before = flushState.emitted;
        await loggerProvider.forceFlush({ timeoutMillis: Math.max(1, deadline - Date.now()) });
        if (before === flushState.emitted) return;
      } while (Date.now() < deadline);
      warnExportFailure();
    } catch { warnExportFailure(); }
  })().finally(() => { flushState.pending = undefined; });
  return flushState.pending;
}

function warnExportFailure() {
  const state = globalThis as typeof globalThis & { __okadoExportWarningAt?: number };
  if (Date.now() - (state.__okadoExportWarningAt ?? 0) <= 60_000) return;
  state.__okadoExportWarningAt = Date.now();
  try { console.warn(JSON.stringify({ event: "server_telemetry_export_failed" })); } catch { /* Best effort. */ }
}
