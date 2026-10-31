import { context, trace, createTraceState } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { SamplingDecision, TracerProvider, type ReadableSpan, type Span, type SpanProcessor } from "@opentelemetry/sdk-trace";
import { emitOperationalRecord, isOperationalTelemetryEnabled } from "@/lib/operational-telemetry";
import { requestMeasurement } from "@/lib/operational-telemetry-schema";
import { isServerTelemetryEnabled } from "@/lib/server-log-export";

const REQUEST_SPAN = "BaseServer.handleRequest";

export class OperationalRequestProcessor implements SpanProcessor {
  private first = true;
  private firstRequests = new WeakSet<object>();
  private ended = new WeakSet<object>();
  onStart(span: Span) {
    if (span.attributes["next.span_type"] !== REQUEST_SPAN) return;
    if (this.first) { this.firstRequests.add(span); this.first = false; }
  }
  onEnd(span: ReadableSpan) {
    if (span.attributes["next.span_type"] !== REQUEST_SPAN || this.ended.has(span)) return;
    this.ended.add(span);
    try {
      const record = requestMeasurement(span.attributes, span.duration[0] * 1000 + span.duration[1] / 1e6,
        this.firstRequests.has(span));
      if (record) emitOperationalRecord(record);
    } catch { /* Never propagate telemetry failures into the HTTP handler. */ }
  }
  async forceFlush() { /* Only sanitized logs are exported, never trace spans. */ }
  async shutdown() { /* No owned timer, request state or trace exporter. */ }
}

export function registerOperationalTracing() {
  if (!isOperationalTelemetryEnabled()) return;
  const provider = new TracerProvider({
    sampler: {
      shouldSample(_context, _traceId, _name, _kind, attributes) {
        return attributes["next.span_type"] === REQUEST_SPAN
          ? { decision: SamplingDecision.RECORD_AND_SAMPLED, traceState: createTraceState("okado=request") }
          : { decision: SamplingDecision.NOT_RECORD };
      },
      toString() { return "OkadoHttpRequestsOnly"; },
    },
    spanLimits: { attributeCountLimit: 16, attributeValueLengthLimit: 4096, eventCountLimit: 0, linkCountLimit: 0 },
    spanProcessors: [new OperationalRequestProcessor()],
  });
  const registered = trace.setGlobalTracerProvider(provider);
  if (registered) context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
  try { console.info(JSON.stringify({ event: "operational_tracing_status", active: registered,
    exportConfigured: isServerTelemetryEnabled() })); }
  catch { /* Availability must not depend on diagnostics. */ }
}
