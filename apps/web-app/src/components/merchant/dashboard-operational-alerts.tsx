"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

type MerchantAlerts = {
  emailCount: number;
  emailCampaignId: string | null;
  lowStockCount: number;
  exhaustedStockCount: number;
  stockCampaignId: string | null;
};

const EMPTY_ALERTS: MerchantAlerts = {
  emailCount: 0,
  emailCampaignId: null,
  lowStockCount: 0,
  exhaustedStockCount: 0,
  stockCampaignId: null,
};

export function DashboardOperationalAlerts() {
  const [alerts, setAlerts] = useState<MerchantAlerts | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAlerts() {
      try {
        const response = await fetch("/api/merchant/email-alerts");
        if (!response.ok) return;

        const payload = (await response.json()) as Partial<MerchantAlerts>;
        if (!cancelled) {
          setAlerts({ ...EMPTY_ALERTS, ...payload });
        }
      } catch {
        // Alerts remain non-blocking for the dashboard.
      }
    }

    void loadAlerts();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!alerts || (!alerts.lowStockCount && !alerts.exhaustedStockCount)) {
    return null;
  }

  const stockLabel = alerts.exhaustedStockCount
    ? `${alerts.exhaustedStockCount} lot${alerts.exhaustedStockCount > 1 ? "s" : ""} épuisé${alerts.exhaustedStockCount > 1 ? "s" : ""}`
    : `Stock faible sur ${alerts.lowStockCount} lot${alerts.lowStockCount > 1 ? "s" : ""}`;

  return (
    <section aria-label="Alerte stock">
      <Link
        href={
          alerts.stockCampaignId
            ? `/data?campaign=${encodeURIComponent(alerts.stockCampaignId)}`
            : "/data"
        }
        prefetch={false}
        className="okado-card group block border-[#fed7aa] bg-[#fffaf2] p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-product-card)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="okado-label text-[#a15c00]">Stock à surveiller</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#9a3412]">
              {stockLabel}
            </p>
            <p className="mt-2 text-sm text-[#9a3412]">Consultez les dotations pour ajuster le stock.</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f59e0b]/15 text-[#a15c00]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </section>
  );
}
