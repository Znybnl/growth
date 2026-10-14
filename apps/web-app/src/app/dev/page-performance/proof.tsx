"use client";

import { useState } from "react";
import { MerchantShell } from "@/components/merchant/merchant-shell";
import { DashboardOperationalAlerts } from "@/components/merchant/dashboard-operational-alerts";
import { useMerchantAlerts } from "@/components/merchant/merchant-alerts-provider";

function Probe() {
  const alerts = useMerchantAlerts();
  return <output data-testid="alerts">{alerts ? alerts.emailCount : "loading"}</output>;
}

// Synthetic data only. This route is unavailable in production.
export function PerformanceProof() {
  const [site, setSite] = useState("demo");
  const merchant = {id:site,companyName:"Commerce de démonstration",logoText:"Démo",
    onboardingCompleted:true,createdAt:"2026-10-01T12:00Z"};
  return <MerchantShell merchant={merchant}
    user={{id:"performance-proof",merchantId:"demo",firstName:"Camille",lastName:"Démo",
      email:"camille@example.test",password:"",createdAt:merchant.createdAt}}
    locations={[{merchant,role:"owner"}]} activeLocationId={site} isSaasAdmin={false}>
    <h1>Vérification des alertes partagées</h1>
    <Probe />
    <DashboardOperationalAlerts />
    <button onClick={()=>window.dispatchEvent(new Event("merchant-alerts-refresh"))}>Actualiser les alertes</button>
    <button onClick={()=>setSite(site==="demo"?"other":"demo")}>Changer de site</button>
  </MerchantShell>;
}
