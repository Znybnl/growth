"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { EMPTY_MERCHANT_ALERTS, type MerchantAlerts } from "@/lib/merchant-alerts";

const AlertsContext = createContext<MerchantAlerts | null>(null);

// One provider per mounted user/site shell. No browser storage or global user cache.
export function MerchantAlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<MerchantAlerts | null>(null);
  useEffect(() => {
    let cancelled = false;
    let pending = false;
    let refreshPending = false;
    let controller: AbortController | undefined;
    async function load(invalidated = false) {
      if (cancelled) return;
      if (pending) {
        refreshPending ||= invalidated;
        return;
      }
      pending = true;
      controller = new AbortController();
      try {
        const response = await fetch("/api/merchant/email-alerts", {
          signal: controller.signal, cache: "no-store",
        });
        if (!response.ok) return;
        const payload = await response.json() as Partial<MerchantAlerts>;
        if (!cancelled) setAlerts({ ...EMPTY_MERCHANT_ALERTS, ...payload });
      } catch {
        // Keep navigation usable on an alert failure.
      } finally {
        pending = false;
        if (refreshPending && !cancelled) {
          refreshPending = false;
          void load();
        }
      }
    }
    const timeout = window.setTimeout(() => { void load(); }, 700);
    const refresh = () => {
      window.clearTimeout(timeout);
      void load(true);
    };
    window.addEventListener("merchant-alerts-refresh", refresh);
    window.addEventListener("campaigns-updated", refresh);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller?.abort();
      window.removeEventListener("merchant-alerts-refresh", refresh);
      window.removeEventListener("campaigns-updated", refresh);
    };
  }, []);
  return <AlertsContext.Provider value={alerts}>{children}</AlertsContext.Provider>;
}

export function useMerchantAlerts() {
  return useContext(AlertsContext);
}
