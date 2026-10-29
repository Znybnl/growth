"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { ANALYTICS_CONSENT_EVENT, hasAnalyticsConsent } from "@/lib/analytics-consent";
import { captureClientProductEvent } from "@/lib/client-product-analytics";
import type { ProductAnalyticsEvent, ProductAnalyticsProperties } from "@/lib/product-analytics-events";

/** Only the currently visible step is measured after consent, never its history. */
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function useProductStepTracking(event: ProductAnalyticsEvent, stepKey: string | undefined, properties: ProductAnalyticsProperties = {}) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const last = useRef<string | undefined>(undefined);
  const context = JSON.stringify(properties);
  useEffect(() => {
    if (!hydrated) return;
    const capture = () => {
      if (!hasAnalyticsConsent()) { last.current = undefined; return; }
      if (!stepKey) { last.current = undefined; return; }
      const key = `${event}:${stepKey}`;
      if (last.current === key) return;
      if (captureClientProductEvent(event, { ...JSON.parse(context), stepKey })) last.current = key;
    };
    capture();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, capture);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, capture);
  }, [context, event, hydrated, stepKey]);
}
