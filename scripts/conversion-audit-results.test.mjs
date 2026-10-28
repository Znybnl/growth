import assert from "node:assert/strict";
import { test } from "node:test";
import { completedResults, summarizeEventCounts, summarizeFunnel, validateAcquisitionDefinition } from "./conversion-audit-results.mjs";

const events = ["marketing_cta_clicked", "signup_started", "signup_completed", "onboarding_completed", "campaign_published"];
test("completed empty response is valid; pending or failed is not a zero", () => {
  assert.deepEqual(completedResults({ results: [] }), []);
  assert.deepEqual(completedResults({ results: [], query_status: { complete: true } }), []);
  for (const response of [{}, { results: [], query_status: { complete: false } },
    { results: [], error: "failed" }, { results: [], query_status: {} }]) assert.throws(() => completedResults(response));
});
test("event totals use the fixed taxonomy, reject missing data and redact arbitrary labels", () => {
  assert.deepEqual(summarizeEventCounts(["signup_completed"], [{ count: 2, label: "private@example.test" }]), [{ event: "signup_completed", count: 2 }]);
  for (const rows of [[], [{ count: -1 }], [{ count: null }]]) assert.throws(() => summarizeEventCounts(["signup_completed"], rows));
});
const query = () => ({ kind: "FunnelsQuery", series: events.map(event => ({ event })),
  funnelsFilter: { funnelOrderType: "ordered", funnelWindowInterval: 30, funnelWindowIntervalUnit: "day", exclusions: [] } });
function validQuery() {
  const value = query();
  value.series[0].properties = [{ key: "cta", type: "event", operator: "exact", value: "start_trial" }];
  return value;
}
test("native result projects counts only, never people or arbitrary properties", () => {
  const result = summarizeFunnel(validQuery().series, [3, 2, 1, 1, 1].map(count => ({ count, people: ["private-id"], email: "private@example.test" })));
  assert.equal(result.entrants, 3);
  assert.equal(result.completed, 1);
  assert.ok(Math.abs(result.observedConversionPercent - 100 / 3) < 1e-10);
  assert.equal(result.finalConversionPercent, null);
  assert.doesNotMatch(JSON.stringify(result), /private|people|email/);
});
test("no entrant is N/D, not zero percent", () => {
  assert.equal(summarizeFunnel(validQuery().series, events.map(() => ({ count: 0 }))).observedConversionPercent, null);
  assert.equal(summarizeFunnel(validQuery().series, []).observedConversionPercent, null);
});
test("a provisional zero does not become a final conversion verdict", () => {
  const result = summarizeFunnel(validQuery().series, [3, 0, 0, 0, 0].map(count => ({ count })));
  assert.equal(result.observedConversionPercent, 0);
  assert.equal(result.finalConversionPercent, null);
});
test("pending, missing, negative or inconsistent counts cannot produce a valid summary", () => {
  for (const rows of [undefined, [{ count: 2 }], [1, 2, 0, 0, 0], [-1, 0, 0, 0, 0], [3, 1, null, 0, 0]]) {
    assert.throws(() => summarizeFunnel(validQuery().series, rows?.map(row => typeof row === "object" ? row : ({ count: row }))));
  }
});
test("acquisition definition pins real trial CTA, order, events, window and aggregation", () => {
  assert.doesNotThrow(() => validateAcquisitionDefinition(validQuery()));
  assert.throws(() => validateAcquisitionDefinition(query()));
  for (const mutate of [q => q.series[0].properties[0].value = "explore_product",
    q => q.funnelsFilter.funnelWindowInterval = 7, q => q.funnelsFilter.funnelOrderType = "unordered",
    q => q.series.pop(), q => q.funnelsFilter.exclusions.push({}), q => q.aggregation_group_type_index = 0,
    q => q.series[1].optionalInFunnel = true]) {
    const value = validQuery(); mutate(value);
    assert.throws(() => validateAcquisitionDefinition(value));
  }
});
