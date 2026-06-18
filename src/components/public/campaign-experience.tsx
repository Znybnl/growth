"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { ScratchGame } from "@/components/public/scratch-game";
import { WheelOfFortune } from "@/components/public/wheel-of-fortune";
import { actionKindCta, formatDateTime } from "@/lib/format";
import { DrawResult, PublicCampaign } from "@/lib/types";

type CampaignExperienceProps = {
  campaignId: string;
  initialCampaign: PublicCampaign;
};

type FlowStep = "welcome" | "collect" | "action" | "game" | "result";

type WheelSegment = {
  id: string;
  label: string;
  tone: "win" | "lose";
};

const buttonSizeMap = {
  sm: "px-4 py-3 text-sm",
  md: "px-5 py-4 text-base",
  lg: "px-6 py-5 text-lg",
};

function buildWheelSegments(campaign: PublicCampaign) {
  const winners = campaign.prizes.map((prize) => ({
    id: prize.id,
    label: prize.label.toUpperCase().slice(0, 18),
    tone: "win" as const,
  }));
  const losers = Array.from({ length: Math.max(3, winners.length) }, (_, index) => ({
    id: `lose-${index}`,
    label: index % 2 === 0 ? "PERDU" : "BONUS",
    tone: "lose" as const,
  }));
  const segments: WheelSegment[] = [];
  const maxLength = Math.max(winners.length, losers.length);

  for (let index = 0; index < maxLength; index += 1) {
    if (losers[index]) {
      segments.push(losers[index]);
    }

    if (winners[index]) {
      segments.push(winners[index]);
    }
  }

  return segments;
}

export function CampaignExperience({
  campaignId,
  initialCampaign,
}: CampaignExperienceProps) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [step, setStep] = useState<FlowStep>("welcome");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [didLogFormStart, setDidLogFormStart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sellerTapCount, setSellerTapCount] = useState(0);

  const segments = useMemo(() => buildWheelSegments(campaign), [campaign]);
  const winner = Boolean(drawResult?.prize);
  const scratchLabel = drawResult?.prize?.label ?? "Perdu :(";
  const winningSegmentId =
    drawResult?.prize?.id ?? segments.find((segment) => segment.tone === "lose")?.id ?? "lose-0";
  const currentAction = campaign.actions[0];
  const previewButtonClass = buttonSizeMap[campaign.presentation.button.size];
  const redemptionCode = drawResult?.lead.redemptionCode;
  const qrPath = redemptionCode
    ? `/api/public/redeem/${encodeURIComponent(redemptionCode)}/qr`
    : "";
  const publicOrigin = typeof window === "undefined" ? "" : window.location.origin;
  const redeemUrl =
    redemptionCode && publicOrigin
      ? `${publicOrigin}/redeem/${encodeURIComponent(redemptionCode)}`
      : "";
  const logoWidthPx = Math.round(
    Math.max(72, Math.min(260, campaign.presentation.logo.sizePercent * 1.6)),
  );
  const blockSpacingPx = campaign.presentation.layout.blockSpacingPx;
  const logoTextSpacingPx = Math.max(0, campaign.presentation.logo.marginBottomPx);
  const gameSpacingPx = Math.max(18, blockSpacingPx - 6);
  const panelSpacingPx = Math.max(24, blockSpacingPx + 6);
  const logoAlignmentClass =
    campaign.presentation.logo.align === "left"
      ? "justify-start"
      : campaign.presentation.logo.align === "right"
        ? "justify-end"
        : "justify-center";
  const headingAlignmentClass =
    campaign.presentation.heading.align === "left"
      ? "text-left"
      : campaign.presentation.heading.align === "right"
        ? "text-right"
        : "text-center";
  const headingFontClass =
    campaign.presentation.heading.fontFamily === "serif"
      ? "font-serif"
      : campaign.presentation.heading.fontFamily === "sans"
        ? "font-sans"
        : "font-display";
  const actionEventType =
    campaign.goalType === "review_prompt"
      ? "review_clicked"
      : campaign.goalType === "social_follow"
        ? "social_clicked"
        : null;

  useEffect(() => {
    async function loadCampaign() {
      const response = await fetch(`/api/public/campaign/${campaignId}`);

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { campaign: PublicCampaign };
      setCampaign(payload.campaign);
    }

    void loadCampaign();
  }, [campaignId]);

  async function trackEvent(eventType: string, leadId?: string) {
    await fetch("/api/public/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        leadId,
        eventType,
      }),
    });
  }

  function openCollectStep() {
    if (!didLogFormStart) {
      setDidLogFormStart(true);
      void trackEvent("form_started");
    }

    setStep("collect");
  }

  async function submitLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/public/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          firstName,
          email,
          marketingConsent: consent,
        }),
      });

      if (!response.ok) {
        throw new Error("Impossible de valider la participation.");
      }

      const payload = (await response.json()) as DrawResult;
      setSellerTapCount(0);
      setDrawResult(payload);
      setCampaign(payload.campaign);
      setStep(payload.campaign.actions[0] ? "action" : "game");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Une erreur est survenue.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function continueAfterAction() {
    if (!drawResult) {
      return;
    }

    setStep("game");
  }

  function revealSellerShortcut() {
    setSellerTapCount((current) => Math.min(current + 1, 5));
  }

  const sellerShortcutVisible = sellerTapCount >= 5;

  return (
    <div
      className="min-h-screen overflow-hidden"
      style={{
        backgroundColor: campaign.presentation.background.color,
        backgroundImage:
          campaign.presentation.background.mode === "image" &&
          campaign.presentation.background.imageUrl
            ? `linear-gradient(rgba(5,10,21,0.42), rgba(5,10,21,0.7)), url("${campaign.presentation.background.imageUrl}")`
            : `radial-gradient(circle at 50% 0%, ${campaign.accent.signal}44, transparent 26%), linear-gradient(180deg, ${campaign.presentation.background.color}, #090c14 72%)`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col px-4 pb-14 pt-10 text-white">
        {campaign.logoMode === "image" && campaign.logoUrl ? (
          <div className={`flex ${logoAlignmentClass}`}>
            <div style={{ marginBottom: `${logoTextSpacingPx}px` }}>
              <BrandMark
                logoText={campaign.merchantLogoText}
                logoUrl={campaign.logoUrl}
                size="lg"
                variant="transparent"
                imageWidthPx={logoWidthPx}
              />
            </div>
          </div>
        ) : null}

        {campaign.logoMode === "text" ? (
          <div className={`flex ${logoAlignmentClass}`}>
            <div style={{ marginBottom: `${logoTextSpacingPx}px` }}>
              <BrandMark
                logoText={campaign.logoText ?? campaign.merchantName}
                size="lg"
                variant="transparent"
                imageWidthPx={logoWidthPx}
              />
            </div>
          </div>
        ) : null}

        <div
          className="rounded-[34px] border border-white/10 bg-white/7 px-5 py-7 backdrop-blur"
          style={{ marginTop: `${blockSpacingPx}px` }}
        >
          <div className={headingAlignmentClass}>
            <h1
              className={`${headingFontClass} font-semibold leading-[0.95]`}
              style={{
                color: campaign.presentation.heading.textColor,
                fontSize: `${campaign.presentation.heading.fontSizePx}px`,
              }}
            >
              {campaign.subtitle}
            </h1>
          </div>

          <div style={{ marginTop: `${gameSpacingPx}px` }}>
            {campaign.gameType === "wheel" ? (
              <WheelOfFortune
                key={`${campaign.id}-${drawResult?.lead.id ?? "welcome"}`}
                accent={campaign.accent}
                wheelStyle={campaign.presentation.wheel}
                segments={segments}
                winningSegmentId={winningSegmentId}
                canSpin={step === "game"}
                onSpinEnd={() => setStep("result")}
              />
            ) : (
              <ScratchGame
                key={`${campaign.id}-${drawResult?.lead.id ?? "welcome"}`}
                accent={campaign.accent}
                resultLabel={scratchLabel}
                enabled={step === "game"}
                onReveal={() => setStep("result")}
              />
            )}
          </div>

          {step === "welcome" ? (
            <div
              className="rounded-[28px] border border-white/10 bg-black/16 p-5 text-center"
              style={{ marginTop: `${panelSpacingPx}px` }}
            >
              <button
                type="button"
                onClick={openCollectStep}
                className={`w-full rounded-[22px] border font-semibold ${previewButtonClass}`}
                style={{
                  backgroundColor: campaign.presentation.button.backgroundColor,
                  color: campaign.presentation.button.textColor,
                  borderColor: campaign.presentation.button.borderColor,
                  fontSize: `${campaign.presentation.button.textSizePx}px`,
                  fontWeight: campaign.presentation.button.isBold ? 700 : 400,
                }}
              >
                {campaign.ctaLabel}
              </button>
            </div>
          ) : null}

          {step === "collect" ? (
            <form
              className="rounded-[30px] border border-white/10 bg-black/16 p-5"
              style={{ marginTop: `${panelSpacingPx}px` }}
              onSubmit={submitLead}
            >
              <p className="text-xs uppercase tracking-[0.24em] text-white/48">Participation</p>
              <div className="mt-4 space-y-4">
                <label className="block text-sm">
                  <span className="mb-2 block text-white/70">Prénom</span>
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                    className="w-full rounded-[22px] border border-white/12 bg-black/18 px-4 py-4 outline-none placeholder:text-white/35"
                    placeholder="Léa"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block text-white/70">E-mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="w-full rounded-[22px] border border-white/12 bg-black/18 px-4 py-4 outline-none placeholder:text-white/35"
                    placeholder="lea@exemple.fr"
                  />
                </label>
                <label className="flex items-start gap-3 rounded-[22px] border border-white/12 bg-black/14 p-4 text-sm leading-6 text-white/72">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    required
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    J&apos;accepte de recevoir les offres du commerce. Mes données sont utilisées
                    pour l&apos;animation et je peux me désinscrire à tout moment.
                  </span>
                </label>
              </div>

              {error ? (
                <div className="mt-4 rounded-[20px] border border-[#ff8f70]/30 bg-[#ff8f70]/12 px-4 py-3 text-sm text-white">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`mt-5 w-full rounded-[22px] border font-semibold disabled:opacity-60 ${previewButtonClass}`}
                style={{
                  backgroundColor: campaign.presentation.button.backgroundColor,
                  color: campaign.presentation.button.textColor,
                  borderColor: campaign.presentation.button.borderColor,
                  fontSize: `${campaign.presentation.button.textSizePx}px`,
                  fontWeight: campaign.presentation.button.isBold ? 700 : 400,
                }}
              >
                {isSubmitting ? "Préparation..." : "Continuer"}
              </button>
            </form>
          ) : null}

          {step === "action" && drawResult && currentAction ? (
            <div
              className="rounded-[30px] border border-white/10 bg-black/16 p-5"
              style={{ marginTop: `${panelSpacingPx}px` }}
            >
              <p className="text-xs uppercase tracking-[0.24em] text-white/48">
                Action marketing
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                {actionKindCta(currentAction.kind)}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/72">
                Ouvrez le lien dans un nouvel onglet, puis revenez ici pour poursuivre votre
                participation.
              </p>
              <div className="mt-5 space-y-3">
                <a
                  href={currentAction.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    actionEventType ? void trackEvent(actionEventType, drawResult.lead.id) : undefined
                  }
                  className={`block w-full rounded-[22px] border text-center font-semibold ${previewButtonClass}`}
                style={{
                  backgroundColor: campaign.presentation.button.backgroundColor,
                  color: campaign.presentation.button.textColor,
                  borderColor: campaign.presentation.button.borderColor,
                  fontSize: `${campaign.presentation.button.textSizePx}px`,
                  fontWeight: campaign.presentation.button.isBold ? 700 : 400,
                }}
              >
                  {actionKindCta(currentAction.kind)}
                </a>
                <button
                  type="button"
                  onClick={continueAfterAction}
                  className="w-full rounded-[22px] border border-[#111827] bg-[#111827] px-5 py-4 text-sm font-semibold text-white"
                >
                  J&apos;ai terminé, je continue
                </button>
              </div>
            </div>
          ) : null}

          {step === "game" ? (
            <div
              className="rounded-[30px] border border-white/10 bg-black/16 p-5 text-center"
              style={{ marginTop: `${panelSpacingPx}px` }}
            >
              <p className="text-xs uppercase tracking-[0.24em] text-white/48">Prêt à jouer</p>
              <h2 className="mt-3 text-2xl font-semibold">
                {campaign.gameType === "wheel" ? "Faites tourner la roue" : "Grattez votre ticket"}
              </h2>
            </div>
          ) : null}

          {step === "result" && drawResult ? (
            <div
              className="rounded-[30px] border border-white/10 bg-black/16 p-5"
              style={{ marginTop: `${panelSpacingPx}px` }}
            >
              <p className="text-xs uppercase tracking-[0.24em] text-white/48">
                {winner ? "Lot gagné" : "Perdu :("}
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                {winner ? drawResult.prize?.label : "Perdu :("}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/72">
                {winner
                  ? "Montrez cet écran au comptoir pour finaliser la remise du lot."
                  : "Merci pour votre participation. Revenez vite pour une prochaine animation."}
              </p>

              {winner ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] bg-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/46">Code</p>
                    <button
                      type="button"
                      onClick={revealSellerShortcut}
                      className="mt-2 text-left text-2xl font-semibold"
                    >
                      {drawResult.lead.redemptionCode}
                    </button>
                  </div>
                  <div className="rounded-[22px] bg-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/46">Statut</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {drawResult.lead.status === "redeemed" ? "Retir\u00e9" : "\u00c0 retirer"}
                    </p>
                  </div>
                </div>
              ) : null}

              {winner && redemptionCode ? (
                <div className="mt-5 rounded-[26px] border border-white/10 bg-white p-4 text-[#111827]">
                  <div className="grid items-center gap-4 sm:grid-cols-[150px_1fr]">
                    <Image
                      src={qrPath}
                      alt={`QR code de retrait ${redemptionCode}`}
                      width={150}
                      height={150}
                      unoptimized
                      className="mx-auto h-[150px] w-[150px] rounded-[18px]"
                    />
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[#6b7280]">
                        QR code de retrait
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                        Enregistrez ce QR code. Un email récapitulatif avec le code de retrait est
                        également envoyé automatiquement au gagnant si la messagerie est configurée.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={qrPath}
                          download={`qr-lot-${redemptionCode}.svg`}
                          className="rounded-[16px] bg-[#111827] px-4 py-3 text-sm font-semibold text-white"
                        >
                          Enregistrer
                        </a>
                        {sellerShortcutVisible && redeemUrl ? (
                          <a
                            href={redeemUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-[16px] border border-[#d7e0ed] px-4 py-3 text-sm font-semibold text-[#111827]"
                          >
                            Accès vendeur
                          </a>
                        ) : null}
                      </div>
                      {!sellerShortcutVisible ? (
                        <p className="mt-3 text-xs leading-5 text-[#6b7280]">
                          Appuyez 5 fois sur le code de retrait pour révéler l&apos;accès vendeur
                          de secours.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {winner && campaign.rewardRules.purchaseRequired ? (
                <div className="mt-4 rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 text-sm text-white/78">
                  {"Retrait du lot soumis \u00e0 une condition d'achat."}
                </div>
              ) : null}

              {winner && campaign.rewardRules.availabilityDurationDays === 0 ? (
                <div className="mt-4 rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 text-sm text-white/78">
                  {"Disponible d\u00e8s maintenant au comptoir."}
                </div>
              ) : null}

              {winner &&
              campaign.rewardRules.availabilityDurationDays > 0 &&
              drawResult.lead.rewardAvailableAt ? (
                <div className="mt-4 rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 text-sm text-white/78">
                  {"Disponible \u00e0 partir du"} {formatDateTime(drawResult.lead.rewardAvailableAt)}
                </div>
              ) : null}

              {winner && drawResult.lead.rewardExpiresAt ? (
                <div className="mt-4 rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 text-sm text-white/78">
                  Valable jusqu&apos;au {formatDateTime(drawResult.lead.rewardExpiresAt)}
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-[20px] border border-[#ff8f70]/30 bg-[#ff8f70]/12 px-4 py-3 text-sm text-white">
                  {error}
                </div>
              ) : null}

              {winner ? (
                <div className="mt-5 rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 text-center text-sm leading-6 text-white/78">
                  {"Le retrait sera valid\u00e9 une seule fois par le restaurant au moment du scan."}
                </div>
              ) : null}
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}
