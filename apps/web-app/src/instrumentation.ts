import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

const serviceName = process.env.POSTHOG_OTEL_LOGS_SERVICE_NAME || "okado-web";
const telemetryEnabled =
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
  return new URL("/i/v1/logs", host).toString();
}

function createLoggerProvider() {
  if (!telemetryEnabled) {
    return new LoggerProvider({
      resource: resourceFromAttributes({
        "service.name": serviceName,
        "service.version": serviceVersion,
        "deployment.environment": deploymentEnvironment,
      }),
    });
  }

  const exporter = new OTLPLogExporter({
    url: getPostHogLogsUrl(),
    headers: {
      Authorization: `Bearer ${process.env.POSTHOG_OTEL_LOGS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  return new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": serviceName,
      "service.version": serviceVersion,
      "deployment.environment": deploymentEnvironment,
    }),
    processors: [new BatchLogRecordProcessor({ exporter })],
  });
}

export const loggerProvider = createLoggerProvider();
const logger = loggerProvider.getLogger(serviceName);

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    logs.setGlobalLoggerProvider(loggerProvider);
  }
}

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
}

export function isServerTelemetryEnabled() {
  return telemetryEnabled;
}

export async function flushServerTelemetry() {
  if (!telemetryEnabled) return;

  try {
    await loggerProvider.forceFlush();
  } catch {
    // Telemetry must never make a business-critical response fail.
  }
}
