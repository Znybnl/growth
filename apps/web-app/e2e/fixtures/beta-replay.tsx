"use client";

import { useState, type CSSProperties } from "react";
import { BetaReplayBoundary } from "@/components/merchant/beta-replay-boundary";
import { stopBetaReplayForSignOut } from "@/lib/beta-replay-client";
import { MerchantAnalyticsIdentity } from "@/components/merchant/merchant-analytics-identity";
import { captureClientProductEvent } from "@/lib/client-product-analytics";

export function BetaReplayProof() {
  const [subject, setSubject] = useState("merchant-fixture:user-fixture");
  const [mounted, setMounted] = useState(false);
  const [clicks, setClicks] = useState(0);
  return <main className="p-8">
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
  </main>;
}
