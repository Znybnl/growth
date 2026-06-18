type SupportLogLevel = "info" | "warn" | "error";

type SupportLogPayload = Record<string, unknown> | undefined;

function sanitizePayload(payload: SupportLogPayload) {
  if (!payload) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

export function logSupportEvent(
  level: SupportLogLevel,
  event: string,
  payload?: SupportLogPayload,
) {
  const prefix = `[SUPPORT][${event}]`;
  const cleanedPayload = sanitizePayload(payload);

  switch (level) {
    case "info":
      console.info(prefix, cleanedPayload ?? {});
      break;
    case "warn":
      console.warn(prefix, cleanedPayload ?? {});
      break;
    default:
      console.error(prefix, cleanedPayload ?? {});
      break;
  }
}

