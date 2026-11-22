export const BREVO_EVENT_MAX_ATTEMPTS = 5;

const RETRY_DELAYS_MS = [6, 12, 24, 48].map((hours) => hours * 60 * 60 * 1000);

export function getBrevoEventFailurePolicy(status: number | null, attempts: number) {
  const retryableResponse = status === 429 || (status !== null && status >= 500 && status <= 599);
  if (!retryableResponse || attempts >= BREVO_EVENT_MAX_ATTEMPTS) {
    return {
      status: "needs_review" as const,
      nextAttemptAt: null,
      errorCode: status === null ? "network_outcome_ambiguous" : `brevo_http_${status}`,
    };
  }

  const delayMs = RETRY_DELAYS_MS[Math.min(Math.max(attempts - 1, 0), RETRY_DELAYS_MS.length - 1)];
  return {
    status: "retry" as const,
    nextAttemptAt: delayMs,
    errorCode: `brevo_http_${status}`,
  };
}
