import assert from "node:assert/strict";
import { test } from "node:test";

import { getBrevoEventFailurePolicy } from "./brevo-event-retry-policy.ts";

test("Brevo rate limits and server errors retry with bounded backoff", () => {
  assert.deepEqual(getBrevoEventFailurePolicy(429, 1), {
    status: "retry", nextAttemptAt: 6 * 60 * 60 * 1000, errorCode: "brevo_http_429",
  });
  assert.equal(getBrevoEventFailurePolicy(503, 2).nextAttemptAt, 12 * 60 * 60 * 1000);
  assert.equal(getBrevoEventFailurePolicy(500, 4).nextAttemptAt, 48 * 60 * 60 * 1000);
});

test("permanent responses and exhausted retries require review", () => {
  assert.deepEqual(getBrevoEventFailurePolicy(401, 1), {
    status: "needs_review", nextAttemptAt: null, errorCode: "brevo_http_401",
  });
  assert.equal(getBrevoEventFailurePolicy(429, 5).status, "needs_review");
  assert.equal(getBrevoEventFailurePolicy(429, 5).nextAttemptAt, null);
});

test("ambiguous network outcomes never retry automatically", () => {
  assert.deepEqual(getBrevoEventFailurePolicy(null, 1), {
    status: "needs_review", nextAttemptAt: null, errorCode: "network_outcome_ambiguous",
  });
});
