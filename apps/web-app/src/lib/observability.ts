import { createHash } from "node:crypto";

export {
  emitServerError,
  flushServerTelemetry,
  isServerTelemetryEnabled,
} from "@/instrumentation";
export type { ServerTelemetryAttributes } from "@/instrumentation";

export function hashTelemetryIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
