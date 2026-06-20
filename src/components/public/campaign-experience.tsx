"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { ScratchGame } from "@/components/public/scratch-game";
import { WheelOfFortune } from "@/components/public/wheel-of-fortune";
import {
  CreateDrawSessionResult,
  DrawResult,
  DrawSession,
  FinalizeDrawSessionRequest,
  PublicCampaign,
} from "@/lib/types";

type CampaignExperienceProps = {
  campaignId: string;
  initialCampaign: PublicCampaign;
};

type WheelSegment = {
  id: string;
  label: string;
  tone: "win" | "lose";
};

type ExperienceStage =
  | "idle"
  | "intro"
  | "ready"
  | "collect"
  | "success"
  | "lost";

function buildWheelSegments(campaign: PublicCampaign) {
  const winners = campaign.prizes.map((prize) => ({
    id: prize.id,
    label: prize.label.toUpperCase(),
    tone: "win" as const,
  }));
  const minimumSegmentCount = 10;
  const loserCount = Math.max(
    minimumSegmentCount - winners.length,
    winners.length,
    minimumSegmentCount,
  );
  const losers = Array.from({ length: loserCount }, (_, index) => ({
    id: `lose-${index}`,
    label: index % 2 === 0 ? "PERDU" : "DOMMAGE",
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

  return segments.length ? segments : losers;
}

function actionLabel(kind?: PublicCampaign["actions"][number]["kind"]) {
  switch (kind) {
    case "google":
      return "Écrire un avis";
    case "instagram":
      return "Voir Instagram";
    case "facebook":
      return "Voir Facebook";
    case "tiktok":
      return "Voir TikTok";
    case "tripadvisor":
      return "Voir Tripadvisor";
    case "crm":
      return "Découvrir l’offre";
    default:
      return "Ouvrir le lien";
  }
}

function actionIcon(kind?: PublicCampaign["actions"][number]["kind"]) {
  switch (kind) {
    case "google":
      return "G";
    case "instagram":
      return "◎";
    case "facebook":
      return "f";
    case "tiktok":
      return "♪";
    case "tripadvisor":
      return "★";
    case "crm":
      return "@";
    default:
      return "→";
  }
}

function formatDate(value?: string) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function PublicModal({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#0f1220]/52 px-4 pb-4 pt-10 backdrop-blur-[6px] sm:items-center sm:p-6">
      <div className="w-full max-w-[390px] rounded-[34px] bg-white p-6 text-[#111827] shadow-[0_34px_90px_rgba(18,24,39,0.24)]">
        {children}
      </div>
    </div>
  );
}

export function CampaignExperience({
  campaignId,
  initialCampaign,
}: CampaignExperienceProps) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [stage, setStage] = useState<ExperienceStage>("idle");
  const [drawSession, setDrawSession] = useState<DrawSession | null>(null);
  const [previewResult, setPreviewResult] = useState<CreateDrawSessionResult | null>(null);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionVisited, setActionVisited] = useState(false);

  const segments = useMemo(() => buildWheelSegments(campaign), [campaign]);
  const winningSegmentId =
    previewResult?.prize?.id ??
    drawResult?.prize?.id ??
    segments.find((segment) => segment.tone === "lose")?.id ??
    "lose-0";
  const currentAction = campaign.actions[0];
  const scratchLabel = previewResult?.prize?.label ?? "Perdu :(";
  const redemptionCode = drawResult?.lead.redemptionCode;
  const qrPath = redemptionCode
    ? `/api/public/redeem/${encodeURIComponent(redemptionCode)}/qr`
    : "";
  const availableDate = formatDate(drawResult?.lead.rewardAvailableAt);
  const expiryDate = formatDate(drawResult?.lead.rewardExpiresAt);
  const blockSpacingPx = campaign.presentation.layout.blockSpacingPx;
  const logoWidthPx = Math.round(
    Math.max(72, Math.min(260, campaign.presentation.logo.sizePercent * 1.6)),
  );
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

  async function prepareSession() {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/public/draw/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Impossible de préparer la partie.");
      }

      const payload = (await response.json()) as CreateDrawSessionResult;
      setPreviewResult(payload);
      setDrawSession(payload.session);
      setCampaign(payload.campaign);
      setStage("ready");
    } catch (sessionError) {
      setError(
        sessionError instanceof Error ? sessionError.message : "Une erreur est survenue.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function openActionAndTrack() {
    setActionVisited(false);
    setError(null);
    setStage("intro");
  }

  async function handleSpinStart() {
    if (drawSession || isLoading) {
      return;
    }

    await prepareSession();
  }

  async function submitWinnerForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!drawSession) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const payload: FinalizeDrawSessionRequest = {
        sessionId: drawSession.id,
        firstName,
        email,
        marketingConsent: false,
      };
      const response = await fetch("/api/public/draw/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Impossible d’enregistrer vos coordonnées.");
      }

      const result = (await response.json()) as DrawResult;
      setDrawResult(result);
      setCampaign(result.campaign);
      setStage("success");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Une erreur est survenue.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGameReveal() {
    if (previewResult?.prize) {
      setStage("collect");
      await trackEvent("form_started");
      return;
    }

    setStage("lost");
  }

  const backgroundStyle =
    campaign.presentation.background.mode === "image" &&
    campaign.presentation.background.imageUrl
      ? `linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.18)), url("${campaign.presentation.background.imageUrl}")`
      : `radial-gradient(circle at 50% 8%, ${campaign.accent.signal}33, transparent 32%), linear-gradient(180deg, transparent, rgba(255,255,255,0.08))`;

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundColor: campaign.presentation.background.color,
        backgroundImage: backgroundStyle,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="relative mx-auto flex min-h-screen max-w-[460px] flex-col px-4 pb-12 pt-8 sm:px-6">
        {(campaign.logoMode === "image" && campaign.logoUrl) ||
        campaign.logoMode === "text" ? (
          <div className={`flex ${logoAlignmentClass}`}>
            <div style={{ marginBottom: `${campaign.presentation.logo.marginBottomPx}px` }}>
              <BrandMark
                logoText={campaign.logoText ?? campaign.merchantLogoText}
                logoUrl={campaign.logoMode === "image" ? campaign.logoUrl : undefined}
                size="lg"
                variant="transparent"
                imageWidthPx={logoWidthPx}
              />
            </div>
          </div>
        ) : null}

        <div className={headingAlignmentClass}>
          <h1
            className={`${headingFontClass} font-semibold leading-[0.96] text-[#151826]`}
            style={{
              color: campaign.presentation.heading.textColor,
              fontSize: `${campaign.presentation.heading.fontSizePx}px`,
            }}
          >
            {campaign.subtitle}
          </h1>
        </div>

        <div style={{ marginTop: `${Math.max(6, Math.round(blockSpacingPx * 0.2))}px` }}>
          {campaign.gameType === "wheel" ? (
            <WheelOfFortune
              key={`${campaign.id}-${drawSession?.id ?? "idle"}`}
              accent={campaign.accent}
              wheelStyle={campaign.presentation.wheel}
              segments={segments}
              winningSegmentId={winningSegmentId}
              canSpin={stage === "ready"}
              buttonEnabled={stage === "idle" || stage === "ready"}
              buttonLabel="JOUER"
              onButtonClick={() => void openActionAndTrack()}
              onSpinEnd={() => void handleGameReveal()}
            />
          ) : (
            <ScratchGame
              key={`${campaign.id}-${drawSession?.id ?? "idle"}`}
              accent={campaign.accent}
              resultLabel={scratchLabel}
              enabled={stage === "ready"}
              onReveal={() => void handleGameReveal()}
            />
          )}
        </div>

        <div className="mt-8 space-y-4">
          {stage === "idle" && campaign.gameType !== "wheel" ? (
            <button
              type="button"
              onClick={openActionAndTrack}
              className="w-full rounded-[24px] border px-6 py-4 text-lg font-semibold shadow-[0_22px_34px_rgba(17,24,39,0.08)]"
              style={{
                backgroundColor: campaign.presentation.button.backgroundColor,
                color: campaign.presentation.button.textColor,
                borderColor: campaign.presentation.button.borderColor,
                fontSize: `${campaign.presentation.button.textSizePx}px`,
              }}
            >
              Jouer
            </button>
          ) : null}

          {stage === "ready" && campaign.gameType !== "wheel" ? (
            <div className="rounded-[28px] border border-white/70 bg-white/72 px-5 py-4 text-center text-sm text-[#62697a] shadow-[0_18px_40px_rgba(17,24,39,0.06)] backdrop-blur">
              Grattez le ticket pour révéler immédiatement votre résultat.
            </div>
          ) : null}

          {stage === "lost" ? (
            <div className="rounded-[32px] border border-white/80 bg-white/84 p-6 text-center shadow-[0_24px_48px_rgba(17,24,39,0.08)] backdrop-blur">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f3f4f8] text-3xl">
                :(
              </div>
              <h2 className="mt-5 text-3xl font-semibold text-[#141826]">Perdu :(</h2>
              <p className="mt-3 text-base leading-7 text-[#61687a]">
                Merci pour votre participation. Revenez bientôt pour une nouvelle chance.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <PublicModal open={stage === "intro"}>
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#f7f7fb] text-4xl font-semibold text-[#1a2f76] shadow-[0_20px_45px_rgba(17,24,39,0.10)]">
          {actionIcon(currentAction?.kind)}
        </div>
        <h2 className="mt-6 text-center text-[2rem] font-semibold leading-[1.05] text-[#121826]">
          {currentAction ? "Avant de jouer" : "Prêt à jouer ?"}
        </h2>
        <p className="mt-4 text-center text-lg leading-8 text-[#5f6678]">
          {currentAction?.kind === "google"
            ? `Partagez votre expérience dans l’enseigne puis revenez ici pour ${
                campaign.gameType === "wheel" ? "lancer la roue" : "gratter le ticket"
              }.`
            : currentAction
              ? "Découvrez le lien du commerce dans un nouvel onglet, puis revenez ici pour jouer."
              : "Touchez Jouer pour préparer votre partie et découvrir votre résultat."}
        </p>
        <div className="mt-6 space-y-3">
          {currentAction ? (
            <a
              href={currentAction.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                if (currentAction.kind === "google") {
                  setActionVisited(true);
                  void trackEvent("review_clicked");
                  return;
                }

                setActionVisited(true);
                void trackEvent("social_clicked");
              }}
              className="block w-full rounded-[20px] border border-[#f3b229] bg-[#f3b229] px-5 py-4 text-center text-lg font-semibold text-[#111827] shadow-[0_12px_22px_rgba(243,178,41,0.28)]"
            >
              {actionLabel(currentAction.kind)}
            </a>
          ) : null}
          {!currentAction || actionVisited ? (
            <button
              type="button"
              onClick={() => void handleSpinStart()}
              disabled={isLoading}
              className="w-full rounded-[20px] bg-[#111827] px-5 py-4 text-lg font-semibold text-white shadow-[0_12px_24px_rgba(17,24,39,0.16)] disabled:opacity-60"
            >
              {isLoading ? "Préparation..." : "Jouer"}
            </button>
          ) : null}
        </div>
        {error ? (
          <div className="mt-4 rounded-[18px] bg-[#fff1f0] px-4 py-3 text-sm text-[#b42318]">
            {error}
          </div>
        ) : null}
      </PublicModal>

      <PublicModal open={stage === "collect"}>
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#f7f7fb] text-4xl shadow-[0_20px_45px_rgba(17,24,39,0.10)]">
          🎁
        </div>
        <h2 className="mt-6 text-center text-[2rem] font-semibold leading-[1.05] text-[#121826]">
          Félicitations ! Vous avez remporté {previewResult?.prize?.label}
        </h2>
        <div className="mt-5 rounded-[22px] bg-[#f6f7fb] px-5 py-4 text-base leading-7 text-[#475067]">
          Vos informations sont nécessaires pour valider et envoyer votre gain.
        </div>
        <form className="mt-5 space-y-4" onSubmit={submitWinnerForm}>
          <input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
            placeholder="Prénom"
            className="w-full rounded-[18px] border border-[#d8dce5] px-4 py-4 text-lg text-[#111827] outline-none placeholder:text-[#99a1b2]"
          />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="E-mail"
            className="w-full rounded-[18px] border border-[#d8dce5] px-4 py-4 text-lg text-[#111827] outline-none placeholder:text-[#99a1b2]"
          />

          {error ? (
            <div className="rounded-[18px] bg-[#fff1f0] px-4 py-3 text-sm text-[#b42318]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-[18px] bg-[#111827] px-5 py-4 text-lg font-semibold text-white disabled:opacity-60"
          >
            {isLoading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      </PublicModal>

      <PublicModal open={stage === "success" && Boolean(drawResult)}>
        <div className="text-center">
          <h2 className="text-[2rem] font-semibold leading-[1.05] text-[#121826]">
            Merci pour votre participation !
          </h2>
          <div className="mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#f7f7fb] text-5xl shadow-[0_20px_45px_rgba(17,24,39,0.10)]">
            ✉
          </div>
          <p className="mt-6 text-xl leading-8 text-[#1a2f76]">
            On vient de vous envoyer un e-mail pour récupérer votre cadeau.
          </p>
          <p className="mt-4 text-base leading-7 text-[#61687a]">
            Pas de mail en vue ? Jetez un œil dans vos spams ou dans l’onglet Promotions.
          </p>

          <div className="mt-6 rounded-[22px] bg-[#fff4cb] px-5 py-4 text-left text-[1rem] leading-7 text-[#4d3810]">
            {campaign.rewardRules.availabilityDurationDays === 0 ? (
              <p>Disponible dès maintenant au comptoir.</p>
            ) : (
              <p>
                Vous avez entre le {availableDate ?? "maintenant"} et le {expiryDate ?? "bientôt"}{" "}
                pour venir le récupérer.
              </p>
            )}
          </div>

          {campaign.rewardRules.purchaseRequired ? (
            <div className="mt-4 rounded-[22px] bg-[#f7f7fb] px-5 py-4 text-left text-sm leading-6 text-[#61687a]">
              Le retrait du lot est soumis à une condition d’achat.
            </div>
          ) : null}

          {redemptionCode ? (
            <div className="mt-5 rounded-[24px] border border-[#e5e7ef] bg-[#fafbff] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8b93a5]">Code de retrait</p>
              <p className="mt-2 text-2xl font-semibold text-[#121826]">{redemptionCode}</p>
              {qrPath ? (
                <div className="mt-4 flex items-center gap-4 rounded-[18px] bg-white p-3 text-left">
                  <Image
                    src={qrPath}
                    alt={`QR code ${redemptionCode}`}
                    width={92}
                    height={92}
                    unoptimized
                    className="h-[92px] w-[92px] rounded-[14px]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-6 text-[#61687a]">
                      Vous pouvez également enregistrer votre QR code immédiatement.
                    </p>
                    <a
                      href={qrPath}
                      download={`qr-lot-${redemptionCode}.svg`}
                      className="mt-3 inline-flex rounded-[16px] bg-[#111827] px-4 py-3 text-sm font-semibold text-white"
                    >
                      Enregistrer le QR code
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </PublicModal>
    </div>
  );
}
