import assert from "node:assert/strict";
import test from "node:test";
import { parseMeasurement, summarizeMeasurements } from "./report-draw-preparation.mjs";

const row = (mode, status, totalMs, stages = {}) => parseMeasurement(JSON.stringify({
  event: "okado.draw_preparation", schemaVersion: 1, mode, status, totalMs, stages,
  email: "not-exported@example.test", sessionId: "not-exported",
}));

test("separates real/preview, success/refusal/failure and nearest-rank percentiles", () => {
  const real = Array.from({ length: 20 }, (_, i) => row("production", 201, (i + 1) * 10, { campaignLookup: i }));
  const result = summarizeMeasurements([...real, row("production", 429, 2), row("production", 503, 900), row("preview", 201, 5000)]);
  assert.deepEqual(result.production.successfulResponses, { samples: 20, p50Ms: 100, p95Ms: 190 });
  assert.equal(result.production.requests, 22);
  assert.equal(result.production.refusals, 1);
  assert.equal(result.production.serverErrorRate, 1 / 22);
  assert.equal(result.preview.successfulResponses.p95Ms, 5000);
  assert.equal(result.production.successfulStages.campaignLookup.samples, 20);
  assert.equal(result.production.successfulStages.analytics.p50Ms, null);
});

test("empty data stays unavailable, not zero ms or zero errors", () => {
  const result = summarizeMeasurements([]);
  assert.equal(result.production.requests, 0);
  assert.equal(result.production.serverErrorRate, null);
  assert.equal(result.production.successfulResponses.p95Ms, null);
});

test("Vercel envelope, malformed/legacy logs and private fields", () => {
  const raw = row("preview", 201, 0, { parse: 0, sessionCreation: 2, token: "private" });
  assert.deepEqual(parseMeasurement(JSON.stringify({ message: JSON.stringify({ ...raw, event: "okado.draw_preparation", schemaVersion: 1 }) })), raw);
  assert.equal(parseMeasurement("not json"), null);
  assert.equal(parseMeasurement(JSON.stringify({ event: "draw_started", totalMs: 10 })), null);
  assert.equal(parseMeasurement(JSON.stringify({ event: "okado.draw_preparation", schemaVersion: 1, mode: "production", status: 201, totalMs: -1 })), null);
  assert.doesNotMatch(JSON.stringify(raw), /not-exported|private|token|email|sessionId/);
});
