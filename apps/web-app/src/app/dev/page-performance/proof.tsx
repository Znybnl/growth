"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MerchantShell } from "@/components/merchant/merchant-shell";
import { EMPTY_MERCHANT_ALERTS, type MerchantAlerts } from "@/lib/merchant-alerts";
import { DashboardOperationalAlerts } from "@/components/merchant/dashboard-operational-alerts";
import { useMerchantAlerts } from "@/components/merchant/merchant-alerts-provider";

function Probe() {
  const alerts = useMerchantAlerts();
  return <output data-testid="alerts">{alerts ? alerts.emailCount : "loading"}</output>;
}

// Synthetic data only. This route is unavailable in production.
export function PerformanceProof({ children, initialAlerts, delayInitialAlerts }: {
  children?: ReactNode;
  initialAlerts?: Promise<MerchantAlerts | null>;
  delayInitialAlerts?: boolean;
}) {
  const [site, setSite] = useState("demo");
  const [mounted, setMounted] = useState(false);
  const [deferred] = useState(() => {
    let resolve!: (value: MerchantAlerts) => void;
    const promise = new Promise<MerchantAlerts>((done) => { resolve = done; });
    return { promise, resolve };
  });
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const snapshot = delayInitialAlerts ? deferred.promise : initialAlerts;
  const merchant = {id:site,companyName:"Commerce de démonstration",logoText:"Démo",
    onboardingCompleted:true,createdAt:"2026-10-01T12:00Z"};
  return <MerchantShell merchant={merchant} initialAlerts={site === "demo" ? snapshot : undefined}
    user={{id:"performance-proof",merchantId:"demo",firstName:"Camille",lastName:"Démo",
      email:"camille@example.test",password:"",createdAt:merchant.createdAt}}
    locations={[{merchant,role:"owner"}]} activeLocationId={site} isSaasAdmin={false}>
    {children ?? <>
    <h1>Vérification des alertes partagées</h1>
    <Probe />
    <DashboardOperationalAlerts />
    <button disabled={!mounted} onClick={()=>window.dispatchEvent(new Event("merchant-alerts-refresh"))}>Actualiser les alertes</button>
    <button onClick={()=>setSite(site==="demo"?"other":"demo")}>Changer de site</button>
    {delayInitialAlerts ? (
      <button disabled={!mounted} onClick={() => deferred.resolve({ ...EMPTY_MERCHANT_ALERTS, emailCount: 9 })}>
        Livrer les alertes initiales
      </button>
    ) : null}
    </>}
  </MerchantShell>;
}
