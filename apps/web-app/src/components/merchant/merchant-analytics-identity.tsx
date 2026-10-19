"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ANALYTICS_CONSENT_EVENT } from "@/lib/analytics-consent";
import { identifyMerchantForAnalytics } from "@/lib/client-product-analytics";

/** Mount before screen components so their first product events use this identity. */
export function MerchantAnalyticsIdentity({ accountMerchantId, userId, activeMerchantId, email }: {
  accountMerchantId: string; userId: string; activeMerchantId: string; email: string;
}) {
  const pathname = usePathname();
  useEffect(() => {
    const identify = () => identifyMerchantForAnalytics(accountMerchantId, userId, activeMerchantId, email);
    const identifyWhenVisible = () => { if (document.visibilityState === "visible") identify(); };
    identify();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, identify);
    window.addEventListener("focus", identify);
    document.addEventListener("visibilitychange", identifyWhenVisible);
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, identify);
      window.removeEventListener("focus", identify);
      document.removeEventListener("visibilitychange", identifyWhenVisible);
    };
  }, [accountMerchantId, userId, activeMerchantId, email, pathname]);
  return null;
}
