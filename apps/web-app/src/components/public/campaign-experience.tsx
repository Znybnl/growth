"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { ImmersiveWheel } from "@/components/public/immersive-wheel";
import { ScratchGame } from "@/components/public/scratch-game";
import { WheelOfFortune } from "@/components/public/wheel-of-fortune";
import { buildWheelVisualSegments } from "@/lib/wheel-segments";
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

type ExperienceStage =
  | "idle"
  | "intro"
  | "ready"
  | "collect"
  | "success"
  | "lost"
  | "blocked";

function withHexAlpha(color: string | undefined, alpha: string) {
  const normalized = color?.trim();

  if (!normalized) {
    return `#5b27d9${alpha}`;
  }

  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const [, r, g, b] = normalized;
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return `${normalized}${alpha}`;
  }

  return normalized;
}

function buildWheelSegments(campaign: PublicCampaign) {
  return buildWheelVisualSegments(campaign.prizes);
}

function getRestaurantPopTextLines(text: string) {
  const rawLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Keep French punctuation with the preceding word so it cannot become a lone line.
  const lines = rawLines.reduce<string[]>((normalizedLines, line) => {
    if (/^[!?.,;:]+$/.test(line) && normalizedLines.length > 0) {
      const previousLineIndex = normalizedLines.length - 1;
      normalizedLines[previousLineIndex] = `${normalizedLines[previousLineIndex]}\u00a0${line}`;
      return normalizedLines;
    }

    normalizedLines.push(line);
    return normalizedLines;
  }, []);

  if (lines.length !== 1) {
    return lines;
  }

  const words = lines[0].split(/\s+/).filter(Boolean);

  if (words.length < 3) {
    return lines;
  }

  const joinIndex = words.findIndex((word) => /^(pour|et|puis|avec)$/i.test(word));

  if (joinIndex > 0 && joinIndex < words.length - 1) {
    const secondLine = words.slice(joinIndex).join(" ").replace(/\s+([!?.,;:])/g, "\u00a0$1");
    return [words.slice(0, joinIndex).join(" "), secondLine];
  }

  const lastWord = words.at(-1)?.replace(/\s+([!?.,;:])/g, "\u00a0$1") ?? "";
  return [words.slice(0, -1).join(" "), lastWord];
}

function buildRestaurantPopHeadingLines(text: string) {
  return getRestaurantPopTextLines(text)
    .map((line, lineIndex) => {
      const parts = line.split(/(\s+)/).map((part) => ({
        text: part,
        secondary: lineIndex === 1,
      }));

      return parts;
    });
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

function RulesModal({
  campaign,
  open,
  onClose,
}: {
  campaign: PublicCampaign;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  const prizeRows = campaign.prizes.map((prize) => ({
    ...prize,
    stockLabel:
      prize.remainingQuantity === null
        ? "Illimité"
        : `${Math.max(0, prize.remainingQuantity)} disponible${
            prize.remainingQuantity > 1 ? "s" : ""
          }`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f1220]/58 px-4 pb-4 pt-10 backdrop-blur-[6px] sm:items-center sm:p-6">
      <div className="flex max-h-[88vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[30px] bg-white text-[#111827] shadow-[0_34px_90px_rgba(18,24,39,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#edf0f6] px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[#8b93a5]">
              Conditions d&apos;utilisation
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight">
              CGU et règlement du jeu
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#dfe4ef] px-4 py-2 text-sm font-semibold text-[#111827]"
          >
            Fermer
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-5 text-sm leading-7 text-[#4b5567]">
          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Préambule et définitions
            </h3>
            <p className="mt-2">
              Le présent document régit les conditions de participation aux jeux-concours
              phygitaux ci-après « le Jeu », déployés en point de vente via la solution
              logicielle Okado.
            </p>
            <p className="mt-2">
              La Société Organisatrice, ci-après « le Marchand », est l&apos;établissement
              professionnel au sein duquel le Jeu est déployé. Elle définit les règles
              spécifiques, les dotations et assume l&apos;entière responsabilité légale de
              l&apos;organisation du Jeu.
            </p>
            <p className="mt-2">
              Le Prestataire Technique, ci-après « l&apos;Éditeur », est la société BRUNELLE
              PEROLS INVESTISSEMENT, éditrice de la solution SaaS Okado, agissant
              exclusivement en tant que fournisseur d&apos;infrastructure technique.
            </p>
            <p className="mt-2">
              Le Participant est toute personne physique, obligatoirement majeure,
              participant au Jeu via le scan d&apos;un QR Code en point de vente.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 1 - Objet et acceptation
            </h3>
            <p className="mt-2">
              La participation au Jeu implique l&apos;acceptation expresse, pleine et entière,
              sans réserve, du présent règlement par le Participant. Ce règlement régit les
              relations entre le Participant et la Société Organisatrice. L&apos;Éditeur de la
              solution Okado est un tiers à cette relation.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 2 - Mécanique du jeu et participation
            </h3>
            <p className="mt-2">
              La participation au Jeu s&apos;effectue exclusivement en scannant le QR Code mis
              à disposition au sein de l&apos;établissement de la Société Organisatrice. Selon
              le paramétrage défini sous la seule responsabilité de la Société
              Organisatrice, le Participant pourra être invité à consulter des liens
              externes, tels que la fiche Google Business Profile de l&apos;établissement.
            </p>
            <p className="mt-2">
              Il est expressément précisé que le dépôt d&apos;un avis en ligne est strictement
              facultatif. Il ne constitue en aucun cas une condition de participation, ni
              une obligation pour valider l&apos;obtention d&apos;un gain. L&apos;Éditeur décline toute
              responsabilité quant à l&apos;utilisation de cette fonctionnalité par la Société
              Organisatrice au regard des conditions d&apos;utilisation des plateformes tierces,
              notamment Google.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 3 - Désignation des gagnants et responsabilité des lots
            </h3>
            <p className="mt-2">
              L&apos;attribution des gains est gérée automatiquement dès la soumission du
              formulaire, via un algorithme de tirage au sort aléatoire tenant compte des
              probabilités et des stocks paramétrés par la Société Organisatrice.
            </p>
            <p className="mt-2">
              La Société Organisatrice est seule responsable de la fourniture, de la
              conformité et de la remise des lots. La responsabilité du Prestataire
              Technique ne saurait être engagée pour toute réclamation relative à une
              rupture de stock, un défaut du lot, un refus de remise par le personnel en
              magasin, ou tout litige lié à l&apos;exécution du Jeu.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 4 - Modalités de récupération des lots
            </h3>
            <p className="mt-2">
              En cas de gain, le Participant reçoit un e-mail de confirmation à l&apos;adresse
              renseignée lors de sa participation, contenant un QR Code unique et personnel.
              Le Participant doit présenter ce QR Code au personnel de la Société
              Organisatrice. La remise du lot n&apos;est définitive qu&apos;après validation de ce QR
              Code par le personnel habilité, par scan direct ou via la plateforme de gestion
              Okado.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 5 - Prévention de la fraude et litiges techniques
            </h3>
            <p className="mt-2">
              La participation est strictement nominative et limitée à une participation par
              jour et par établissement. La Société Organisatrice se réserve le droit
              d&apos;annuler la participation ou de refuser la remise d&apos;un lot à toute personne
              ayant tenté de frauder. En cas de dysfonctionnement technique temporaire de la
              plateforme Okado ou de l&apos;appareil du Participant empêchant la validation,
              aucune compensation ne pourra être exigée.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 6 - Protection des données personnelles
            </h3>
            <p className="mt-2">
              Dans le cadre du Jeu, des données à caractère personnel sont collectées. La
              Société Organisatrice agit en tant que Responsable de traitement. Le
              Prestataire Technique héberge ces données de manière sécurisée pour le compte
              exclusif de la Société Organisatrice.
            </p>
            <p className="mt-2">
              Conformément à la réglementation applicable, le Participant dispose d&apos;un droit
              d&apos;accès, de rectification, de portabilité et d&apos;effacement de ses données. Pour
              exercer ces droits, le Participant doit s&apos;adresser directement à la Société
              Organisatrice par le biais de ses coordonnées habituelles.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 7 - Limites de responsabilité technique
            </h3>
            <p className="mt-2">
              Le Prestataire Technique met en œuvre les moyens nécessaires au bon
              fonctionnement de l&apos;infrastructure du Jeu. Sa responsabilité ne saurait être
              engagée en cas de non-réception de l&apos;e-mail de confirmation de gain due à une
              erreur de saisie, à un filtrage anti-spam, à une défaillance du fournisseur de
              messagerie, à une interruption réseau, au dysfonctionnement du smartphone du
              Participant ou à un bogue technique temporaire.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 8 - Lots, stocks disponibles et probabilités de gain
            </h3>
            <p className="mt-2">
              Les gains sont attribués dans la limite des quantités de stock disponibles au
              moment de la participation. Lorsqu&apos;un lot n&apos;est plus disponible, il ne peut
              plus être attribué, même si sa probabilité de gain est indiquée ci-dessous.
            </p>
            <div className="mt-4 overflow-hidden rounded-[18px] border border-[#e5e9f2]">
              {prizeRows.length ? (
                prizeRows.map((prize) => (
                  <div
                    key={prize.id}
                    className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#eef1f7] px-4 py-3 last:border-b-0"
                  >
                    <div>
                      <p className="font-semibold text-[#111827]">{prize.label}</p>
                      <p className="text-xs text-[#7b8496]">Stock : {prize.stockLabel}</p>
                    </div>
                    <p className="text-right font-semibold text-[#111827]">
                      {prize.probability} %
                    </p>
                  </div>
                ))
              ) : (
                <p className="px-4 py-3 text-[#7b8496]">Aucun lot configuré.</p>
              )}
            </div>
          </section>
        </div>
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
  const [blockedMessage, setBlockedMessage] = useState(
    "Une seule participation est possible par jour. Revenez demain pour tenter votre chance à nouveau.",
  );
  const [drawSession, setDrawSession] = useState<DrawSession | null>(null);
  const [previewResult, setPreviewResult] = useState<CreateDrawSessionResult | null>(null);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionVisited, setActionVisited] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [autoSpinKey, setAutoSpinKey] = useState<string | null>(null);

  const segments = useMemo(() => buildWheelSegments(campaign), [campaign]);
  const winningSegmentId =
    previewResult?.prize?.id ??
    drawResult?.prize?.id ??
    segments.find((segment) => segment.tone === "lose")?.id ??
    "lose-0";
  const currentAction = campaign.actions[0];
  const scratchLabel = previewResult?.prize?.label ?? "Perdu :(";
  const redemptionCode = drawResult?.lead.redemptionCode;
  const previewUsageConditions = previewResult?.prize?.usageConditions?.trim();
  const resolvedUsageConditions =
    drawResult?.prize?.usageConditions?.trim() || previewUsageConditions || "";
  const qrPath = redemptionCode
    ? `/api/public/redeem/${encodeURIComponent(redemptionCode)}/qr`
    : "";
  const availableDate = formatDate(drawResult?.lead.rewardAvailableAt);
  const expiryDate = formatDate(drawResult?.lead.rewardExpiresAt);
  const blockSpacingPx = campaign.presentation.layout.blockSpacingPx;
  const pageTemplate = campaign.presentation.layout.templateId ?? "classic";
  const isRestaurantPopTemplate = pageTemplate === "restaurant-pop";
  const isCosmicTemplate = pageTemplate === "cosmic-orbit";
  const isSunburstTemplate = pageTemplate === "sunburst-festival";
  const isImmersiveTemplate = isCosmicTemplate || isSunburstTemplate;
  const primaryColor = campaign.presentation.wheel.loseColor ?? campaign.accent.signal;
  const secondaryColor = campaign.presentation.wheel.winColor ?? "#073b72";
  const headingTextColor =
    isCosmicTemplate && campaign.presentation.heading.textColor.toLowerCase() === "#1f2937"
      ? "#f8fbff"
      : campaign.presentation.heading.textColor;
  const logoWidthPx = Math.round(
    Math.max(56, Math.min(720, campaign.presentation.logo.sizePercent * 3)),
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
    campaign.presentation.heading.fontFamily === "anton"
      ? "font-anton"
      : campaign.presentation.heading.fontFamily === "serif" || campaign.presentation.heading.fontFamily === "cormorant"
        ? campaign.presentation.heading.fontFamily === "cormorant"
          ? "font-cormorant"
          : "font-serif"
        : campaign.presentation.heading.fontFamily === "fredoka"
          ? "font-fredoka"
          : campaign.presentation.heading.fontFamily === "inter" || campaign.presentation.heading.fontFamily === "sans"
            ? "font-inter"
            : campaign.presentation.heading.fontFamily === "bebas"
              ? "font-bebas"
              : "font-display";
  const showBottomState =
    (stage === "idle" && campaign.gameType !== "wheel") ||
    (stage === "ready" && campaign.gameType !== "wheel");

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

  async function prepareSession(nextStage: ExperienceStage = "ready") {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/public/draw/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          code?: string;
        } | null;
        if (payload?.code === "already_played_today") {
          setBlockedMessage(
            payload.error ?? "Vous avez déjà participé à cette animation. Réessayez plus tard.",
          );
          setStage("blocked");
          return;
        }
        throw new Error(payload?.error ?? "Impossible de préparer la partie.");
      }

      const payload = (await response.json()) as CreateDrawSessionResult;
      setPreviewResult(payload);
      setDrawSession(payload.session);
      setCampaign(payload.campaign);
      setStage(nextStage);
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
    if (drawSession) {
      setStage("intro");
      return;
    }

    await prepareSession("intro");
  }

  async function launchPreparedGame() {
    if (!drawSession) {
      await prepareSession("ready");
      setAutoSpinKey(`spin-${Date.now()}`);
      return;
    }

    setStage("ready");
    setAutoSpinKey(`spin-${drawSession.id}`);
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
        marketingConsent,
      };
      const response = await fetch("/api/public/draw/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as {
          error?: string;
          code?: string;
        } | null;
        if (failure?.code === "participation_cooldown") {
          setBlockedMessage(
            failure.error ?? "Vous avez déjà participé à cette animation. Revenez plus tard.",
          );
          setStage("blocked");
          return;
        }
        throw new Error(failure?.error ?? "Impossible d’enregistrer vos coordonnées.");
      }

      const result = (await response.json()) as DrawResult;
      if (actionVisited && currentAction?.kind === "google") {
        void trackEvent("review_confirmed", result.lead.id);
      }
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

    void trackEvent("game_lost");
    setStage("lost");
  }

  const backgroundStyle =
    campaign.presentation.background.mode === "image" &&
    campaign.presentation.background.imageUrl
      ? `linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.18)), url("${campaign.presentation.background.imageUrl}")`
      : isCosmicTemplate
        ? `radial-gradient(circle at 50% 112%, ${withHexAlpha(primaryColor, "52")} 0 24%, transparent 43%), radial-gradient(circle at 9% 12%, ${withHexAlpha(secondaryColor, "2b")} 0 14%, transparent 25%), linear-gradient(155deg, #07142e 0%, #0b1d42 55%, #071126 100%)`
        : isSunburstTemplate
          ? `radial-gradient(circle at 12% 10%, ${withHexAlpha(primaryColor, "33")} 0 12%, transparent 13%), radial-gradient(circle at 94% 18%, ${withHexAlpha(secondaryColor, "38")} 0 14%, transparent 15%), linear-gradient(180deg, #fffdf5 0%, #fff8e8 56%, #fff2ce 100%)`
        : isRestaurantPopTemplate
        ? `radial-gradient(circle at -10% -8%, ${withHexAlpha(primaryColor, "f2")} 0 18%, transparent 19%), radial-gradient(circle at 110% 0%, ${withHexAlpha(secondaryColor, "f2")} 0 13%, transparent 14%), radial-gradient(circle at 0% 80%, ${withHexAlpha(primaryColor, "20")} 0 20%, transparent 21%), radial-gradient(circle at 100% 78%, ${withHexAlpha(secondaryColor, "40")} 0 18%, transparent 19%), linear-gradient(180deg, #fff2dd 0%, #fffaf1 46%, #fff4e5 100%)`
        : `radial-gradient(circle at 50% 50%, ${withHexAlpha(primaryColor, "33")}, transparent 50%), linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.08))`;
  const restaurantPopHeadingLines = buildRestaurantPopHeadingLines(campaign.subtitle);

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
      {isRestaurantPopTemplate || isSunburstTemplate || isCosmicTemplate ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute right-0 top-[18%] h-28 w-16 opacity-35"
            style={{
              backgroundImage: `radial-gradient(circle, ${withHexAlpha(primaryColor, isCosmicTemplate ? "70" : "40")} 1.8px, transparent 2px)`,
              backgroundSize: "12px 12px",
            }}
          />
          <div
            className="absolute -bottom-10 -left-12 h-48 w-48 rounded-full opacity-80"
            style={{ background: withHexAlpha(primaryColor, isCosmicTemplate ? "2e" : "22") }}
          />
        </div>
      ) : null}
      <div className="relative mx-auto flex h-screen w-full flex-col overflow-hidden px-4 pb-0 pt-8 sm:px-6">
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
                textColor={headingTextColor}
              />
            </div>
          </div>
        ) : null}

        {campaign.logoMode === "none" ||
        (campaign.logoMode === "image" && !campaign.logoUrl) ? (
          <div aria-hidden="true" className="h-5" />
        ) : null}

        <div className={headingAlignmentClass}>
          <h1
            className={`${headingFontClass} whitespace-pre-line ${isRestaurantPopTemplate ? "tracking-[0.038em] drop-shadow-[0_5px_0_rgba(0,0,0,0.08)]" : ""} leading-[1] text-[#151826]`}
            style={{
              color: headingTextColor,
              fontSize: `${campaign.presentation.heading.fontSizePx}px`,
              fontWeight: campaign.presentation.heading.fontWeight ?? 600,
            }}
          >
            {isRestaurantPopTemplate
              ? restaurantPopHeadingLines.map((line, lineIndex) => (
                  <span key={`heading-line-${lineIndex}`} className="block">
                    {line.map((part, partIndex) => (
                      <span
                        key={`heading-line-${lineIndex}-${partIndex}`}
                        style={{
                          color: part.secondary
                            ? secondaryColor
                            : headingTextColor || primaryColor,
                        }}
                      >
                        {part.text}
                      </span>
                    ))}
                  </span>
                ))
              : campaign.subtitle}
          </h1>
        </div>

        {campaign.gameType === "wheel" ? (
          <div
            className="relative left-1/2 mt-[40px] min-h-0 w-screen -translate-x-1/2 flex-1 overflow-hidden sm:mt-20 lg:mt-8"
            style={{ minHeight: "min(52vh, 520px)" }}
          >
            <div className="absolute inset-0 overflow-hidden">
              {isImmersiveTemplate ? (
                <ImmersiveWheel
                  key={`${campaign.id}-${drawSession?.id ?? "idle"}`}
                  accent={campaign.accent}
                  wheelStyle={campaign.presentation.wheel}
                  template={pageTemplate}
                  buttonStyle={{
                    backgroundColor: primaryColor,
                    textColor: campaign.presentation.button.textColor,
                    borderColor: campaign.presentation.wheel.rimColor,
                  }}
                  segments={segments}
                  winningSegmentId={winningSegmentId}
                  canSpin={stage === "ready"}
                  buttonEnabled={stage === "idle" || stage === "ready"}
                  buttonLabel="JOUER"
                  framing="public"
                  onButtonClick={() => void openActionAndTrack()}
                  autoSpinKey={autoSpinKey}
                  onSpinEnd={() => void handleGameReveal()}
                />
              ) : (
                <WheelOfFortune
                  key={`${campaign.id}-${drawSession?.id ?? "idle"}`}
                  accent={campaign.accent}
                  wheelStyle={campaign.presentation.wheel}
                  pageTemplate={pageTemplate === "restaurant-pop" ? "restaurant-pop" : "classic"}
                  buttonStyle={{
                    backgroundColor: primaryColor,
                    textColor: campaign.presentation.button.textColor,
                    borderColor:
                      pageTemplate === "restaurant-pop"
                        ? secondaryColor
                        : campaign.presentation.wheel.rimColor,
                  }}
                  segments={segments}
                  winningSegmentId={winningSegmentId}
                  canSpin={stage === "ready"}
                  buttonEnabled={stage === "idle" || stage === "ready"}
                  buttonLabel="JOUER"
                  framing="public"
                  onButtonClick={() => void openActionAndTrack()}
                  autoSpinKey={autoSpinKey}
                  onSpinEnd={() => void handleGameReveal()}
                />
              )}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: `${Math.max(6, Math.round(blockSpacingPx * 0.2))}px` }}>
            <ScratchGame
              key={`${campaign.id}-${drawSession?.id ?? "idle"}`}
              accent={campaign.accent}
              resultLabel={scratchLabel}
              enabled={stage === "ready"}
              onReveal={() => void handleGameReveal()}
            />
          </div>
        )}

        {showBottomState ? <div className="mt-8 space-y-4">
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

          {false ? (
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
        </div> : null}
      </div>

      <button
        type="button"
        onClick={() => setRulesOpen(true)}
        className="fixed bottom-4 right-4 z-20 rounded-full border border-white/70 bg-white/82 px-4 py-2 text-sm font-semibold text-[#111827] shadow-[0_14px_34px_rgba(17,24,39,0.12)] backdrop-blur"
      >
        Règlement
      </button>

      <RulesModal campaign={campaign} open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <PublicModal open={stage === "lost"}>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f3f4f8] text-3xl font-semibold text-[#141826] shadow-[0_20px_45px_rgba(17,24,39,0.10)]">
          !
        </div>
        <h2 className="mt-6 text-center text-[2rem] font-semibold leading-[1.05] text-[#121826]">
          Perdu
        </h2>
        <p className="mt-4 text-center text-lg leading-8 text-[#5f6678]">
          Merci pour votre participation. Revenez bientôt pour une nouvelle chance.
        </p>
      </PublicModal>

      <PublicModal open={stage === "blocked"}>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f3f4f8] text-3xl font-semibold text-[#141826] shadow-[0_20px_45px_rgba(17,24,39,0.10)]">
          !
        </div>
        <h2 className="mt-6 text-center text-[2rem] font-semibold leading-[1.05] text-[#121826]">
          Participation déjà enregistrée
        </h2>
        <p className="mt-4 text-center text-lg leading-8 text-[#5f6678]">
          {blockedMessage}
        </p>
        <button
          type="button"
          onClick={() => setStage("idle")}
          className="mt-6 w-full rounded-[20px] bg-[#111827] px-5 py-4 text-lg font-semibold text-white shadow-[0_12px_24px_rgba(17,24,39,0.16)]"
        >
          Compris
        </button>
      </PublicModal>

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
              onClick={() => void launchPreparedGame()}
              disabled={isLoading}
              className="w-full rounded-[20px] bg-[#111827] px-5 py-4 text-xl font-semibold text-white shadow-[0_12px_24px_rgba(17,24,39,0.16)] disabled:opacity-60"
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
        {previewUsageConditions ? (
          <div className="mt-4 rounded-[22px] bg-[#fff8e8] px-5 py-4 text-left text-sm leading-7 text-[#6c5313]">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8a6a18]">
              Conditions d&apos;utilisation
            </p>
            <p className="mt-2 whitespace-pre-line">{previewUsageConditions}</p>
          </div>
        ) : null}
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
          <label className="flex cursor-pointer items-start gap-3 rounded-[18px] bg-[#f6f7fb] px-4 py-3 text-left text-sm leading-6 text-[#475067]">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(event) => setMarketingConsent(event.target.checked)}
              className="mt-1 h-4 w-4 accent-[#111827]"
            />
            <span>
              J&apos;accepte de recevoir des actualités et offres de la part de cet établissement.
              Cette option est facultative.
            </span>
          </label>

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
            Votre gain est enregistré. Nous vous envoyons un e-mail avec les informations de retrait.
          </p>
          <p className="mt-4 text-base leading-7 text-[#61687a]">
            Vous pouvez aussi conserver le QR code ci-dessous. Si l’e-mail tarde à arriver, regardez vos spams ou l’onglet Promotions.
          </p>

          <div className="mt-6 rounded-[22px] bg-[#fff4cb] px-5 py-4 text-left text-[1rem] leading-7 text-[#4d3810]">
            <p>
              Vous avez entre le {availableDate ?? "maintenant"} et le {expiryDate ?? "bientôt"}{" "}
              pour venir le récupérer.
            </p>
          </div>

          {campaign.rewardRules.purchaseRequired ? (
            <div className="mt-4 rounded-[22px] bg-[#f7f7fb] px-5 py-4 text-left text-sm leading-6 text-[#61687a]">
              Le retrait du lot est soumis à une condition d’achat.
            </div>
          ) : null}

          {resolvedUsageConditions ? (
            <div className="mt-4 rounded-[22px] bg-[#fff4cb] px-5 py-4 text-left text-[1rem] leading-7 text-[#4d3810]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8a6a18]">
                Conditions d&apos;utilisation
              </p>
              <p className="mt-2 whitespace-pre-line">{resolvedUsageConditions}</p>
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
                      className="mt-3 inline-flex rounded-[16px] bg-[#111827] px-4 py-3 text-sm font-semibold !text-white"
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
