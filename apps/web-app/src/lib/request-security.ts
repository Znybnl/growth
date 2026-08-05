function extractOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isLocalhost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function areEquivalentDevelopmentOrigins(left: string | null, right: string) {
  if (!left || process.env.NODE_ENV === "production") {
    return false;
  }

  try {
    const leftUrl = new URL(left);
    const rightUrl = new URL(right);

    return (
      leftUrl.protocol === rightUrl.protocol &&
      leftUrl.port === rightUrl.port &&
      isLocalhost(leftUrl.hostname) &&
      isLocalhost(rightUrl.hostname)
    );
  } catch {
    return false;
  }
}

export function assertTrustedMutationRequest(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");
  const origin = extractOrigin(originHeader);
  const refererOrigin = extractOrigin(refererHeader);

  if (origin && origin === requestOrigin) {
    return;
  }

  if (refererOrigin && refererOrigin === requestOrigin) {
    return;
  }

  if (
    areEquivalentDevelopmentOrigins(origin, requestOrigin) ||
    areEquivalentDevelopmentOrigins(refererOrigin, requestOrigin)
  ) {
    return;
  }

  if (!origin && !refererOrigin && process.env.NODE_ENV !== "production") {
    return;
  }

  throw new Error("Origine de requête non autorisée.");
}

export function getRequestSecurityErrorStatus(error: unknown) {
  if (error instanceof Error && error.message === "Origine de requête non autorisée.") {
    return 403;
  }

  return 400;
}
