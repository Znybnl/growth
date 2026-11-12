"use client";

import { useState, type CSSProperties } from "react";
import { BetaReplayBoundary } from "@/components/merchant/beta-replay-boundary";
import { stopBetaReplayForSignOut } from "@/lib/beta-replay-client";
import { MerchantAnalyticsIdentity } from "@/components/merchant/merchant-analytics-identity";
import { captureClientProductEvent } from "@/lib/client-product-analytics";
import { MerchantShell } from "@/components/merchant/merchant-shell";
import { MetricCard, PageHeader } from "@/components/ui/workspace";
import type { Merchant } from "@/lib/types";

const merchant: Merchant = { id: "merchant-fixture", companyName: "private-company-secret", logoText: "private-logo-secret", createdAt: "2026-10-30T00:00:00Z" };

export function BetaReplayProof() {
  const [subject, setSubject] = useState("merchant-fixture:user-fixture");
  const [mounted, setMounted] = useState(false);
  const [clicks, setClicks] = useState(0);
  return <MerchantShell merchant={merchant}
    user={{ id: "user-fixture", merchantId: merchant.id, role: "owner", firstName: "private-first-secret", lastName: "private-last-secret", email: "beta-fixture@example.test", password: "", createdAt: merchant.createdAt }}
    locations={[{ merchant, role: "owner" }]} activeLocationId={merchant.id} isSaasAdmin={false}>
    <section className="space-y-5">
    <PageHeader eyebrow="Vue d'ensemble" title="Pilotez vos campagnes" description="Suivez vos campagnes en direct, comparez les mécaniques qui performent et lancez rapidement une nouvelle campagne." />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Campagnes actives" value="12" />
      <MetricCard label="Participations" value="345" />
      <MetricCard label="Lots consommés" value="10" />
      <MetricCard label="Taux de consommation" value="25 %" />
    </section>
    <h1>Toutes vos campagnes</h1>
    {mounted && <BetaReplayBoundary subject={subject} />}
    {mounted && <MerchantAnalyticsIdentity accountMerchantId={subject.split(":")[0]} userId={subject.split(":")[1]} activeMerchantId={subject.split(":")[0]} email="beta-fixture@example.test" />}
    <button onClick={() => {
      window.history.replaceState(null, "", "/campaigns/new/guided?email=private-query@example.test#private-hash");
      setMounted(true);
    }}>Ouvrir la session fictive</button>
    <button onClick={() => setClicks(clicks + 1)}>Ajouter</button>
    <button onClick={() => captureClientProductEvent("campaign_preview_opened")}>Événement ordinaire fictif</button>
    <button onClick={() => {
      console.warn("private-console-secret");
      void fetch("/api/dev/replay-private-fixture", { method: "POST", body: "private-network-secret" });
    }}>Simuler une requête privée</button>
    <button onClick={() => setSubject("merchant-other:user-other")}>Changer de compte fictif</button>
    <button onClick={stopBetaReplayForSignOut}>Déconnexion fictive</button>
    <button onClick={() => { window.history.replaceState(null, "", "/campaign/public-id"); setMounted(false); }}>Page de jeu fictive</button>
    <p>Interactions : {clicks}</p><p>client-secret@example.test</p>
    <input aria-label="Saisie sensible" defaultValue="private-input@example.test" />
    <input aria-label="PIN" type="password" defaultValue="9876-private-pin" />
    <a href="https://example.test/private-destination?token=private-token" title="private-title">Lien privé</a>
    <div data-replay-private>private-private-container</div>
    <div style={{ "--private-label": "private-css-secret", width: 12 } as CSSProperties}>Texte privé</div>
    {/* The image itself must never be sent to the replay collector. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/private-logo.png?token=private-image-token" alt="private-image-description" />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/images/scratch-templates/beauty-noir-or.webp" alt="Illustration" />
  </section></MerchantShell>;
}
