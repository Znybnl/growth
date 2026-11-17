"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { BetaReplayBoundary } from "@/components/merchant/beta-replay-boundary";
import { stopBetaReplayForSignOut } from "@/lib/beta-replay-client";
import { MerchantAnalyticsIdentity } from "@/components/merchant/merchant-analytics-identity";
import { captureClientProductEvent } from "@/lib/client-product-analytics";
import { MerchantShell } from "@/components/merchant/merchant-shell";
import { MetricCard, PageHeader } from "@/components/ui/workspace";
import type { Merchant } from "@/lib/types";
import { DraftPreviewViewport } from "@/components/merchant/draft-preview-viewport";
import { RewardEmailPreviewFrame } from "@/components/merchant/reward-email-preview-frame";
import { CampaignPreviewDialog } from "@/components/merchant/campaign-preview-dialog";

const merchant: Merchant = { id: "merchant-fixture", companyName: "private-company-secret", logoText: "private-logo-secret", createdAt: "2026-10-30T00:00:00Z" };

export function BetaReplayProof() {
  const [subject, setSubject] = useState("merchant-fixture:user-fixture");
  const [mounted, setMounted] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [gamePreviewOpen, setGamePreviewOpen] = useState(false);
  useEffect(() => {
    for (const canvas of document.querySelectorAll<HTMLCanvasElement>("canvas")) {
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.fillStyle = canvas.closest("[data-replay-visible]") ? "#123456" : "#abcdef";
      context.fillRect(clicks, 0, 1, 1);
    }
  }, [clicks, mounted]);
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
    <button onClick={() => setGamePreviewOpen(true)}>Ouvrir aperçu jeu fictif</button>
    {gamePreviewOpen && <CampaignPreviewDialog open campaignId="replay-fixture" onClose={() => setGamePreviewOpen(false)} />}
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
    <div data-replay-visible><p>Sous-titre visible de campagne fictive.</p><p>Contact privé : contact-fixture@example.test</p><p>Téléphone : +33 6 12 34 56 78</p><svg viewBox="0 0 20 20"><path d="M 1 2 L 18 19" stroke="#123456" /></svg><canvas className="replay-safe-canvas" width={20} height={20} aria-label="Illustration du ticket prévisualisé" /><span data-replay-private>Nom du participant fictif</span></div>
    <canvas className="replay-blocked-canvas" width={20} height={20} aria-label="Canvas privé hors prévisualisation" />
    <iframe data-replay-preview title="Prévisualisation fictive" sandbox="allow-same-origin" srcDoc={'<!doctype html><html><body><h1 style="color:#abcdef">Description libre affichée dans l’aperçu du jeu.</h1><p>Contact : iframe-private-person@example.test</p><input type="password" value="iframe-password-secret" /></body></html>'} />
    <iframe title="Données client fictives" sandbox="allow-same-origin" srcDoc={'<!doctype html><html><body><p>client-frame-secret@example.test</p><p>Le type de jeu.</p></body></html>'} />
    {mounted && <><DraftPreviewViewport><p>Description du lot visible dans la prévisualisation.</p><p>Contact : draft-private-person@example.test</p></DraftPreviewViewport>
    <RewardEmailPreviewFrame html={'<p>Votre invitation vous attend dans cette prévisualisation.</p><p>Contact : email-private-person@example.test</p>'} /></>}
    <a href="https://example.test/private-destination?token=private-token" title="private-title">Lien privé</a>
    <div data-replay-private>private-private-container</div>
    <div style={{ "--private-label": "private-css-secret", width: 12 } as CSSProperties}>Texte privé</div>
    {/* The image itself must never be sent to the replay collector. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/private-logo.png?token=private-image-token" alt="private-image-description" />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/images/scratch-templates/beauty-noir-or.webp" alt="Illustration" />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/_next/image?url=%2Fimages%2Fscratch-templates%2Fbeauty-noir-or.webp&w=640&q=75" alt="Illustration optimisée" />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/_next/image?url=%2Fuploads%2Fprivate-optimized-client.png&w=640&q=75" alt="Client privé" />
  </section></MerchantShell>;
}
