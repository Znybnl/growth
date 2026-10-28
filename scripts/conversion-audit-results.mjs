// Explicit aggregate DTO: never serialize native people/IDs/properties.
export function completedResults(response) {
  if (!Array.isArray(response?.results) || response.error ||
      (response.query_status != null && response.query_status.complete !== true)) {
    throw new Error("Query incomplete: never interpret pending or failed results as zero");
  }
  return response.results;
}

export function summarizeEventCounts(events, rows) {
  if (!Array.isArray(rows) || rows.length !== events.length) throw new Error("Incomplete event totals");
  return events.map((event, index) => {
    const count = rows[index]?.count;
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid event total");
    return { event, count };
  });
}

export function summarizeFunnel(series, results) {
  // PostHog's completed no-entrant funnel can return [] (not missing results).
  if (Array.isArray(results) && results.length === 0) results = series.map(() => ({ count: 0 }));
  if (!Array.isArray(results) || results.length !== series.length || !series.length) {
    throw new Error("Incomplete funnel result");
  }
  const steps = series.map((step, index) => {
    const count = results[index]?.count;
    if (!Number.isSafeInteger(count) || count < 0 ||
        (index > 0 && count > results[index - 1].count)) throw new Error("Invalid funnel counts");
    return { event: step.event, count };
  });
  const entrants = steps[0].count;
  return { steps, entrants, completed: steps.at(-1).count,
    observedConversionPercent: entrants ? steps.at(-1).count / entrants * 100 : null,
    finalConversionPercent: null,
    maturity: "Not established by this aggregate; do not interpret recent entrants as final drop-off" };
}

export function validateAcquisitionDefinition(query) {
  const expected = ["marketing_cta_clicked", "signup_started", "signup_completed", "onboarding_completed", "campaign_published"];
  if (query?.kind !== "FunnelsQuery" || query.series?.map(step => step.event).join() !== expected.join() ||
      !query.series[0].properties?.some(p => p.key === "cta" && p.type === "event" && p.operator === "exact" && p.value === "start_trial") ||
      query.funnelsFilter?.funnelOrderType !== "ordered" || query.funnelsFilter.funnelWindowInterval !== 30 ||
      query.funnelsFilter.funnelWindowIntervalUnit !== "day" || query.funnelsFilter.exclusions?.length ||
      query.series.some(step => step.optionalInFunnel === true) ||
      query.aggregation_group_type_index != null) throw new Error("Acquisition definition changed: review before interpreting results");
}
