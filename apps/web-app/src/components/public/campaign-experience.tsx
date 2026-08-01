"use client";

import Image from "next/image";
import {
  ArrowRight,
  AtSign,
  Camera,
  Gift,
  Mail,
  Music2,
  Star,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { ImmersiveWheel } from "@/components/public/immersive-wheel";
import { ImmersiveScratchTicket } from "@/components/public/immersive-scratch-ticket";
import { ScratchGame } from "@/components/public/scratch-game";
import { WheelOfFortune } from "@/components/public/wheel-of-fortune";
import { fluidType } from "@/lib/responsive";
import {
  campaignLogoTextSizePx,
  clampCampaignLogoSizePercent,
  DEFAULT_SCRATCH_SUBTITLE,
  limitCampaignSubtitleLines,
  normalizeScratchAccent,
} from "@/lib/campaign-defaults";
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
  isPreview?: boolean;
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
      return "Ã‰crire un avis";
    case "instagram":
      return "Suivez-nous sur Instagram";
    case "facebook":
      return "Voir Facebook";
    case "tiktok":
      return "Voir TikTok";
    case "tripadvisor":
      return "Voir Tripadvisor";
    case "crm":
      return "DÃ©couvrir lâ€™offre";
    default:
      return "Ouvrir le lien";
  }
}

function actionIcon(kind?: PublicCampaign["actions"][number]["kind"]) {
  switch (kind) {
    case "google":
      return (
        <span
          className="font-sans text-4xl font-bold leading-none text-[#4285f4]"
          aria-label="Google"
        >
          G
        </span>
      );
    case "instagram":
      return <Camera className="h-9 w-9" aria-hidden="true" />;
    case "facebook":
      return <Users className="h-9 w-9" aria-hidden="true" />;
    case "tiktok":
      return <Music2 className="h-9 w-9" aria-hidden="true" />;
    case "tripadvisor":
      return <Star className="h-9 w-9" aria-hidden="true" />;
    case "crm":
      return <AtSign className="h-9 w-9" aria-hidden="true" />;
    default:
      return <ArrowRight className="h-9 w-9" aria-hidden="true" />;
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
  compact = false,
  children,
}: {
  open: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="FenÃªtre de participation" className="fixed inset-0 z-40 flex items-end justify-center bg-[#0f1220]/52 px-4 pb-4 pt-10 backdrop-blur-[6px] sm:items-center sm:p-6">
      <div
        className={`w-full max-w-[390px] rounded-[34px] bg-white text-[#111827] shadow-[0_34px_90px_rgba(18,24,39,0.24)] ${
          compact ? "p-5" : "p-6"
        }`}
      >
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
        ? "IllimitÃ©"
        : `${Math.max(0, prize.remainingQuantity)} disponible${
            prize.remainingQuantity > 1 ? "s" : ""
          }`,
  }));

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="rules-modal-title" className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f1220]/58 px-4 pb-4 pt-10 backdrop-blur-[6px] sm:items-center sm:p-6">
      <div className="flex max-h-[88vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[30px] bg-white text-[#111827] shadow-[0_34px_90px_rgba(18,24,39,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#edf0f6] px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[#8b93a5]">
              Conditions d&apos;utilisation
            </p>
            <h2 id="rules-modal-title" className="mt-2 text-2xl font-semibold leading-tight">
              CGU et rÃ¨glement du jeu
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
              PrÃ©ambule et dÃ©finitions
            </h3>
            <p className="mt-2">
              Le prÃ©sent document rÃ©git les conditions de participation aux jeux-concours
              phygitaux ci-aprÃ¨s Â« le Jeu Â», dÃ©ployÃ©s en point de vente via la solution
              logicielle Okado.
            </p>
            <p className="mt-2">
              La SociÃ©tÃ© Organisatrice, ci-aprÃ¨s Â« le Marchand Â», est l&apos;Ã©tablissement
              professionnel au sein duquel le Jeu est dÃ©ployÃ©. Elle dÃ©finit les rÃ¨gles
              spÃ©cifiques, les dotations et assume l&apos;entiÃ¨re responsabilitÃ© lÃ©gale de
              l&apos;organisation du Jeu.
            </p>
            <p className="mt-2">
              Le Prestataire Technique, ci-aprÃ¨s Â« l&apos;Ã‰diteur Â», est la sociÃ©tÃ© BRUNELLE
              PEROLS INVESTISSEMENT, Ã©ditrice de la solution SaaS Okado, agissant
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
              La participation au Jeu implique l&apos;acceptation expresse, pleine et entiÃ¨re,
              sans rÃ©serve, du prÃ©sent rÃ¨glement par le Participant. Ce rÃ¨glement rÃ©git les
              relations entre le Participant et la SociÃ©tÃ© Organisatrice. L&apos;Ã‰diteur de la
              solution Okado est un tiers Ã  cette relation.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 2 - MÃ©canique du jeu et participation
            </h3>
            <p className="mt-2">
              La participation au Jeu s&apos;effectue exclusivement en scannant le QR Code mis
              Ã  disposition au sein de l&apos;Ã©tablissement de la SociÃ©tÃ© Organisatrice. Selon
              le paramÃ©trage dÃ©fini sous la seule responsabilitÃ© de la SociÃ©tÃ©
              Organisatrice, le Participant pourra Ãªtre invitÃ© Ã  consulter des liens
              externes, tels que la fiche Google Business Profile de l&apos;Ã©tablissement.
            </p>
            <p className="mt-2">
              Il est expressÃ©ment prÃ©cisÃ© que le dÃ©pÃ´t d&apos;un avis en ligne est strictement
              facultatif. Il ne constitue en aucun cas une condition de participation, ni
              une obligation pour valider l&apos;obtention d&apos;un gain. L&apos;Ã‰diteur dÃ©cline toute
              responsabilitÃ© quant Ã  l&apos;utilisation de cette fonctionnalitÃ© par la SociÃ©tÃ©
              Organisatrice au regard des conditions d&apos;utilisation des plateformes tierces,
              notamment Google.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 3 - DÃ©signation des gagnants et responsabilitÃ© des lots
            </h3>
            <p className="mt-2">
              L&apos;attribution des gains est gÃ©rÃ©e automatiquement dÃ¨s la soumission du
              formulaire, via un algorithme de tirage au sort alÃ©atoire tenant compte des
              probabilitÃ©s et des stocks paramÃ©trÃ©s par la SociÃ©tÃ© Organisatrice.
            </p>
            <p className="mt-2">
              La SociÃ©tÃ© Organisatrice est seule responsable de la fourniture, de la
              conformitÃ© et de la remise des lots. La responsabilitÃ© du Prestataire
              Technique ne saurait Ãªtre engagÃ©e pour toute rÃ©clamation relative Ã  une
              rupture de stock, un dÃ©faut du lot, un refus de remise par le personnel en
              magasin, ou tout litige liÃ© Ã  l&apos;exÃ©cution du Jeu.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 4 - ModalitÃ©s de rÃ©cupÃ©ration des lots
            </h3>
            <p className="mt-2">
              En cas de gain, le Participant reÃ§oit un e-mail de confirmation Ã  l&apos;adresse
              renseignÃ©e lors de sa participation, contenant un QR Code unique et personnel.
              Le Participant doit prÃ©senter ce QR Code au personnel de la SociÃ©tÃ©
              Organisatrice. La remise du lot n&apos;est dÃ©finitive qu&apos;aprÃ¨s validation de ce QR
              Code par le personnel habilitÃ©, par scan direct ou via la plateforme de gestion
              Okado.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 5 - PrÃ©vention de la fraude et litiges techniques
            </h3>
            <p className="mt-2">
              La participation est strictement nominative et limitÃ©e Ã  une participation par
              jour et par Ã©tablissement. La SociÃ©tÃ© Organisatrice se rÃ©serve le droit
              d&apos;annuler la participation ou de refuser la remise d&apos;un lot Ã  toute personne
              ayant tentÃ© de frauder. En cas de dysfonctionnement technique temporaire de la
              plateforme Okado ou de l&apos;appareil du Participant empÃªchant la validation,
              aucune compensation ne pourra Ãªtre exigÃ©e.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 6 - Protection des donnÃ©es personnelles
            </h3>
            <p className="mt-2">
              Dans le cadre du Jeu, des donnÃ©es Ã  caractÃ¨re personnel sont collectÃ©es. La
              SociÃ©tÃ© Organisatrice agit en tant que Responsable de traitement. Le
              Prestataire Technique hÃ©berge ces donnÃ©es de maniÃ¨re sÃ©curisÃ©e pour le compte
              exclusif de la SociÃ©tÃ© Organisatrice.
            </p>
            <p className="mt-2">
              ConformÃ©ment Ã  la rÃ©glementation applicable, le Participant dispose d&apos;un droit
              d&apos;accÃ¨s, de rectification, de portabilitÃ© et d&apos;effacement de ses donnÃ©es. Pour
              exercer ces droits, le Participant doit s&apos;adresser directement Ã  la SociÃ©tÃ©
              Organisatrice par le biais de ses coordonnÃ©es habituelles.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 7 - Limites de responsabilitÃ© technique
            </h3>
            <p className="mt-2">
              Le Prestataire Technique met en Å“uvre les moyens nÃ©cessaires au bon
              fonctionnement de l&apos;infrastructure du Jeu. Sa responsabilitÃ© ne saurait Ãªtre

              engagÃ©e en cas de non-rÃ©ception de l&apos;e-mail de confirmation de gain due Ã  une
              erreur de saisie, Ã  un filtrage anti-spam, Ã  une dÃ©faillance du fournisseur de
              messagerie, Ã  une interruption rÃ©seau, au dysfonctionnement du smartphone du
              Participant ou Ã  un bogue technique temporaire.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 8 - Lots, stocks dï¯}¶‰žËkºwµçEµÁ…¥¸¹ÁÉ•Í•¹Ñ…Ñ¥½¸¹±½¼¹µ…É¥¹	½ÑÑ½µAáô4(€€€€€€€€€€€€€€€±½½]¥‘Ñ¡Aàõí±½½]¥‘Ñ¡Aáô4(€€€€€€€€€€€€€€€±½½Q•áÑM¥é•Aàõí±½½Q•áÑM¥é•Aáô4(€€€€€€€€€€€€€€€Ñ•µÁ±…Ñ”õíÁ…•Q•µÁ±…Ñ”…Ì€‰ÍÉ…Ñ µÙ…Õ±Ðˆð€‰ÍÉ…Ñ µ½¹™•ÑÑ¤ˆð€‰ÍÉ…Ñ µ½É…°ˆð€‰ÍÉ…Ñ µ±¥±…Œˆð€‰ÍÉ…Ñ µÍÕ¹‰ÕÉÍÐ‰ô4(€€€€€€€€€€€€€€¼ø4(€€€€€€€€€€€€¤€è€ 4(€€€€€€€€€€€€€€ñMÉ…Ñ¡…µ”4(€€€€€€€€€€€€€€€­•äõí€‘í…µÁ…¥¸¹¥‘ô´‘í‘É…ÝM•ÍÍ¥½¸ü¹¥€üü€‰¥‘±”‰õô4(€€€€€€€€€€€€€€€…•¹ÐõíÍÉ…Ñ¡•¹Ñô4(€€€€€€€€€€€€€€€É•ÍÕ±Ñ1…‰•°õíÍÉ…Ñ¡1…‰•±ô4(€€€€€€€€€€€€€€€•¹…‰±•õíÍÑ…”€ôôô€‰É•…‘ä‰ô4(€€€€€€€€€€€€€€€½¹I•Ù•…°õì ¤€ôøÙ½¥¡…¹‘±•…µ•I•Ù•…° ¥ô4(€€€€€€€€€€€€€€¼ø4(4(€€€€€€€€€€€€¥ô4(€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€¥ô4(4(€€€€€€€íÍ¡½Ý	½ÑÑ½µMÑ…Ñ”€ü€ñ‘¥Ø±…ÍÍ9…µ”ô‰µÐ´àÍÁ…”µä´Ðˆø4(€€€€€€€€€íÍÑ…”€ôôô€‰¥‘±”ˆ€˜˜…µÁ…¥¸¹…µ•QåÁ”€„ôô€‰Ý¡••°ˆ€ü€ 4(€€€€€€€€€€€€ñ‰ÕÑÑ½¸4(€€€€€€€€€€€€€ÑåÁ”ô‰‰ÕÑÑ½¸ˆ4(€€€€€€€€€€€€€½¹±¥¬õí½Á•¹Ñ¥½¹¹‘QÉ…­ô4(€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰µàµ…ÕÑ¼‰±½¬Üµ™Õ±°µ…àµÜµlÌØÁÁátÉ½Õ¹‘•µlÈÑÁát‰½É‘•ÈÁà´ØÁä´ÐÑ•áÐµ±œ™½¹ÐµÍ•µ¥‰½±Í¡…‘½ÜµlÁ|ÈÉÁá|ÌÑÁá}É‰„ ÄÜ°ÈÐ°Ìä°À¸Àà¥tˆ4(€€€€€€€€€€€€€ÍÑå±”õíì4(€€€€€€€€€€€€€€€‰…­É½Õ¹‘½±½Èè…µÁ…¥¸¹ÁÉ•Í•¹Ñ…Ñ¥½¸¹‰ÕÑÑ½¸¹‰…­É½Õ¹‘½±½È°4(€€€€€€€€€€€€€€€½±½Èè…µÁ…¥¸¹ÁÉ•Í•¹Ñ…Ñ¥½¸¹‰ÕÑÑ½¸¹Ñ•áÑ½±½È°4(€€€€€€€€€€€€€€€‰½É‘•É½±½Èè…µÁ…¥¸¹ÁÉ•Í•¹Ñ…Ñ¥½¸¹‰ÕÑÑ½¸¹‰½É‘•É½±½È°4(€€€€€€€€€€€€€€€™½¹ÑM¥é”è‰ÕÑÑ½¹½¹ÑM¥é”°4(€€€€€€€€€€€€€õô4(€€€€€€€€€€€€ø4(€€€€€€€€€€€€€íÁÕ‰±¥Ñ…1…‰•±ô4(€€€€€€€€€€€€ð½‰ÕÑÑ½¸ø4(€€€€€€€€€€¤€è¹Õ±±ô4(4(€€€€€€€€€íÍÑ…”€ôôô€‰É•…‘äˆ€˜˜…µÁ…¥¸¹…µ•QåÁ”€„ôô€‰Ý¡••°ˆ€ü€ 4(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰É½Õ¹‘•µlÈáÁát‰½É‘•È‰½É‘•ÈµÝ¡¥Ñ”¼ÜÀ‰œµÝ¡¥Ñ”¼ÜÈÁà´ÔÁä´ÐÑ•áÐµ•¹Ñ•ÈÑ•áÐµÍ´Ñ•áÐµlŒØÈØäÝ…tÍ¡…‘½ÜµlÁ|ÄáÁá|ÐÁÁá}É‰„ ÄÜ°ÈÐ°Ìä°À¸ÀØ¥t‰…­‘É½Àµ‰±ÕÈˆø4(€€€€€€€€€€€€€É…ÑÑ•è±”Ñ¥­•ÐÁ½ÕÈË¥Û¥±•È¥µ·¥‘¥…Ñ•µ•¹ÐÙ½ÑÉ”Ë¥ÍÕ±Ñ…Ð¸4(€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€¤€è¹Õ±±ô4(4(€€€€€€€€€í™…±Í”€ü€ 4(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰É½Õ¹‘•µlÌÉÁát‰½É‘•È‰½É‘•ÈµÝ¡¥Ñ”¼àÀ‰œµÝ¡¥Ñ”¼àÐÀ´ØÑ•áÐµ•¹Ñ•ÈÍ¡…‘½ÜµlÁ|ÈÑÁá|ÐáÁá}É‰„ ÄÜ°ÈÐ°Ìä°À¸Àà¥t‰…­‘É½Àµ‰±ÕÈˆø4(€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µàµ…ÕÑ¼™±•à ´ÈÀÜ´ÈÀ¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÉ½Õ¹‘•µ™Õ±°‰œµl˜Í˜Ñ˜átÑ•áÐ´Íá°ˆø4(€€€€€€€€€€€€€€€€è 4(€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€ñ È±…ÍÍ9…µ”ô‰µÐ´ÔÑ•áÐ´Íá°™½¹ÐµÍ•µ¥‰½±Ñ•áÐµlŒÄÐÄàÈÙtˆùA•É‘Ô€è ð½ Èø4(€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µÐ´ÌÑ•áÐµ‰…Í”±•…‘¥¹œ´ÜÑ•áÐµlŒØÄØàÝ…tˆø4(€€€€€€€€€€€€€€€5•É¤Á½ÕÈÙ½ÑÉ”Á…ÉÑ¥¥Á…Ñ¥½¸¸I•Ù•¹•è‰¥•¹ÓÑÐÁ½ÕÈÕ¹”¹½ÕÙ•±±”¡…¹”¸4(€€€€€€€€€€€€€€ð½Àø4(€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€¤€è¹Õ±±ô4(€€€€€€€€ð½‘¥Øø€è¹Õ±±ô4(€€€€€€ð½‘¥Øø4(4(€€€€€€ñ‰ÕÑÑ½¸4(€€€€€€€ÑåÁ”ô‰‰ÕÑÑ½¸ˆ4(€€€€€€€½¹±¥¬õì ¤€ôøÍ•ÑIÕ±•Í=Á•¸¡ÑÉÕ”¥ô4(€€€€€€€±…ÍÍ9…µ”ô‰™¥á•‰½ÑÑ½´´ÐÉ¥¡Ð´Ðè´ÈÀÉ½Õ¹‘•µ™Õ±°‰½É‘•È‰½É‘•ÈµÝ¡¥Ñ”¼ÜÀ‰œµÝ¡¥Ñ”¼àÈÁà´ÐÁä´ÈÑ•áÐµÍ´™½¹ÐµÍ•µ¥‰½±Ñ•áÐµlŒÄÄÄàÈÝtÍ¡…‘½ÜµlÁ|ÄÑÁá|ÌÑÁá}É‰„ ÄÜ°ÈÐ°Ìä°À¸ÄÈ¥t‰…­‘É½Àµ‰±ÕÈˆ4(€€€€€€ø4(€€€€€€€K¡±•µ•¹Ð4(€€€€€€ð½‰ÕÑÑ½¸ø4(4(€€€€€€ñIÕ±•Í5½‘…°…µÁ…¥¸õí…µÁ…¥¹ô½Á•¸õíÉÕ±•Í=Á•¹ô½¹±½Í”õì ¤€ôøÍ•ÑIÕ±•Í=Á•¸¡™…±Í”¥ô€¼ø4(4(€€€€€€ñAÕ‰±¥5½‘…°½Á•¸õíÍÑ…”€ôôô€‰±½ÍÐ‰ôø4(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µàµ…ÕÑ¼™±•à ´ÈÀÜ´ÈÀ¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÉ½Õ¹‘•µ™Õ±°‰œµl˜Í˜Ñ˜átÑ•áÐ´Íá°™½¹ÐµÍ•µ¥‰½±Ñ•áÐµlŒÄÐÄàÈÙtÍ¡…‘½ÜµlÁ|ÈÁÁá|ÐÕÁá}É‰„ ÄÜ°ÈÐ°Ìä°À¸ÄÀ¥tˆø4(€€€€€€€€€€„4(€€€€€€€€ð½‘¥Øø4(€€€€€€€€ñ È±…ÍÍ9…µ”ô‰µÐ´ØÑ•áÐµ•¹Ñ•ÈÑ•áÐµlÉÉ•µt™½¹ÐµÍ•µ¥‰½±±•…‘¥¹œµlÄ¸ÀÕtÑ•áÐµlŒÄÈÄàÈÙtˆø4(€€€€€€€€€A•É‘Ô4(€€€€€€€€ð½ Èø4(€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µÐ´ÐÑ•áÐµ•¹Ñ•ÈÑ•áÐµ±œ±•…‘¥¹œ´àÑ•áÐµlŒÕ˜ØØÜátˆø4(€€€€€€€€€5•É¤Á½ÕÈÙ½ÑÉ”Á…ÉÑ¥¥Á…Ñ¥½¸¸I•Ù•¹•è‰¥•¹ÓÑÐÁ½ÕÈÕ¹”¹½ÕÙ•±±”¡…¹”¸4(€€€€€€€€ð½Àø4(€€€€€€ð½AÕ‰±¥5½‘…°ø4(4(€€€€€€ñAÕ‰±¥5½‘…°½Á•¸õíÍÑ…”€ôôô€‰‰±½­•‰ôø4(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µàµ…ÕÑ¼™±•à ´ÈÀÜ´ÈÀ¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÉ½Õ¹‘•µ™Õ±°‰œµl˜Í˜Ñ˜átÑ•áÐ´Íá°™½¹ÐµÍ•µ¥‰½±Ñ•áÐµlŒÄÐÄàÈÙtÍ¡…‘½ÜµlÁ|ÈÁÁá|ÐÕÁá}É‰„ ÄÜ°ÈÐ°Ìä°À¸ÄÀ¥tˆø4(€€€€€€€€€€„4(€€€€€€€€ð½‘¥Øø4(€€€€€€€€ñ È±…ÍÍ9…µ”ô‰µÐ´ØÑ•áÐµ•¹Ñ•ÈÑ•áÐµlÉÉ•µt™½¹ÐµÍ•µ¥‰½±±•…‘¥¹œµlÄ¸ÀÕtÑ•áÐµlŒÄÈÄàÈÙtˆø4(€€€€€€€€€A…ÉÑ¥¥Á…Ñ¥½¸“¥«€•¹É•¥ÍÑË¥”4(€€€€€€€€ð½ Èø4(€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µÐ´ÐÑ•áÐµ•¹Ñ•ÈÑ•áÐµ±œ±•…‘¥¹œ´àÑ•áÐµlŒÕ˜ØØÜátˆø4(€€€€€€€€€í‰±½­•‘5•ÍÍ…•ô4(€€€€€€€€ð½Àø4(€€€€€€€€ñ‰ÕÑÑ½¸4(€€€€€€€€€ÑåÁ”ô‰‰ÕÑÑ½¸ˆ4(€€€€€€€€€½¹±¥¬õì ¤€ôøÍ•ÑMÑ…” ‰¥‘±”ˆ¥ô4(€€€€€€€€€±…ÍÍ9…µ”ô‰µÐ´ØÜµ™Õ±°É½Õ¹‘•µlÈÁÁát‰œµlŒÄÄÄàÈÝtÁà´ÔÁä´ÐÑ•áÐµ±œ™½¹ÐµÍ•µ¥‰½±Ñ•áÐµÝ¡¥Ñ”Í¡…‘½ÜµlÁ|ÄÉÁá|ÈÑÁá}É‰„ ÄÜ°ÈÐ°Ìä°À¸ÄØ¥tˆ4(€€€€€€€€ø4(€€€€€€€€€½µÁÉ¥Ì4(€€€€€€€€ð½‰ÕÑÑ½¸ø4(€€€€€€ð½AÕ‰±¥5½‘…°ø4(4(€€€€€€ñAÕ‰±¥5½‘…°½Á•¸õíÍÑ…”€ôôô€‰¥¹ÑÉ¼‰ôø4(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µàµ…ÕÑ¼™±•à ´ÈÐÜ´ÈÐ¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÉ½Õ¹‘•µ™Õ±°‰œµl˜Ý˜Ý™‰tÑ•áÐ´Ñá°™½¹ÐµÍ•µ¥‰½±Ñ•áÐµlŒÅ„É˜ÜÙtÍ¡…‘½ÜµlÁ|ÈÁÁá|ÐÕÁá}É‰„ ÄÜ°ÈÐ°Ìä°À¸ÄÀ¥tˆø4(€€€€€€€€€í…Ñ¥½¹%½¸¡ÕÉÉ•¹ÑÑ¥½¸ü¹­¥¹¥ô4(€€€€€€€€ð½‘¥Øø4(€€€€€€€€ñ È±…ÍÍ9…µ”ô‰µÐ´ØÑ•áÐµ•¹Ñ•ÈÑ•áÐµlÉÉ•µt™½¹ÐµÍ•µ¥‰½±±•…‘¥¹œµlÄ¸ÀÕtÑ•áÐµlŒÄÈÄàÈÙtˆø4(€€€€€€€€€íÕÉÉ•¹ÑÑ¥½¸€ü€‰Ù…¹Ð‘”©½Õ•Èˆ€è€‰AË©Ðƒ€©½Õ•È€ü‰ô4(€€€€€€€€ð½ Èø4(€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µÐ´ÐÑ•áÐµ•¹Ñ•ÈÑ•áÐµ±œ±•…‘¥¹œ´àÑ•áÐµlŒÕ˜ØØÜátˆø4(€€€€€€€€€íÕÉÉ•¹ÑÑ¥½¸ü¹­¥¹€ôôô€‰½½±”ˆ4(€€€€€€€€€€€€ü€‰1…¥ÍÍ•èµ¹½ÕÌÕ¸…Ù¥Ì•ÐÉ•Ù•¹•è¥¤Á½ÕÈ©½Õ•È¸ˆ4(€€€€€€€€€€€€èÕÉÉ•¹ÑÑ¥½¸ü¹­¥¹€ôôô€‰¥¹ÍÑ…É…´ˆ4(€€€€€€€€€€€€€€ü€‰MÕ¥Ù•èµ¹½ÕÌÍÕÈ%¹ÍÑ…É…´Á½ÕÈ“¥½ÕÙÉ¥È±•Ì¹½ÕÙ•…ÕÓ¥Ì‘Ô½µµ•É”°ÁÕ¥ÌÉ•Ù•¹•è¥¤Á½ÕÈ©½Õ•È¸ˆ4(€€€€€€€€€€€€€€èÕÉÉ•¹ÑÑ¥½¸4(€€€€€€€€€€€€€€€€ü€‰¥½ÕÙÉ•è±”±¥•¸‘Ô½µµ•É”‘…¹ÌÕ¸¹½ÕÙ•°½¹±•Ð°ÁÕ¥ÌÉ•Ù•¹•è¥¤Á½ÕÈ©½Õ•È¸ˆ4(€€€€€€€€€€€€€€€€è€‰Q½Õ¡•è)½Õ•ÈÁ½ÕÈÁË¥Á…É•ÈÙ½ÑÉ”Á…ÉÑ¥”•Ð“¥½ÕÙÉ¥ÈÙ½ÑÉ”Ë¥ÍÕ±Ñ…Ð¸‰ô4(€€€€€€€€ð½Àø4(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µÐ´ØÍÁ…”µä´Ìˆø4(€€€€€€€€€íÕÉÉ•¹ÑÑ¥½¸€ü€ 4(€€€€€€€€€€€€ñ„4(€€€€€€€€€€€€€¡É•˜õíÕÉÉ•¹ÑÑ¥½¸¹ÕÉ±ô4(€€€€€€€€€€€€€Ñ…É•Ðô‰}‰±…¹¬ˆ4(€€€€€€€€€€€€€É•°ô‰¹½É•™•ÉÉ•Èˆ4(€€€€€€€€€€€€€½¹±¥¬õì ¤€ôøì4(€€€€€€€€€€€€€€€¥˜€¡ÕÉÉ•¹ÑÑ¥½¸¹­¥¹€ôôô€‰½½±”ˆ¤ì4(€€€€€€€€€€€€€€€€€Í•ÑÑ¥½¹Y¥Í¥Ñ•¡ÑÉÕ”¤ì4(€€€€€€€€€€€€€€€€€Ù½¥ÑÉ…­Ù•¹Ð ‰É•Ù¥•Ý}±¥­•ˆ¤ì4(€€€€€€€€€€€€€€€€€É•ÑÕÉ¸ì4(€€€€€€€€€€€€€€€ô4(4(€€€€€€€€€€€€€€€Í•ÑÑ¥½¹Y¥Í¥Ñ•¡ÑÉÕ”¤ì4(€€€€€€€€€€€€€€€Ù½¥ÑÉ…­Ù•¹Ð ‰Í½¥…±}±¥­•ˆ¤ì4(€€€€€€€€€€€€€õô4(€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰‰±½¬Üµ™Õ±°É½Õ¹‘•µlÈÁÁát‰½É‘•È‰½É‘•Èµl˜ÍˆÈÈåt‰œµl˜ÍˆÈÈåtÁà´ÔÁä´ÐÑ•áÐµ•¹Ñ•ÈÑ•áÐµ±œ™½¹ÐµÍ•µ¥‰½±±•…‘¥¹œ´ÜÑ•áÐµlŒÄÄÄàÈÝtÍ¡…‘½ÜµlÁ|ÄÉÁá|ÈÉÁá}É‰„ ÈÐÌ°ÄÜà°ÐÄ°À¸Èà¥tˆ4(€€€€€€€€€€€€ø4(€€€€€€€€€€€€€í…Ñ¥½¹1…‰•°¡ÕÉÉ•¹ÑÑ¥½¸¹­¥¹¥ô4(€€€€€€€€€€€€ð½„ø4(€€€€€€€€€€¤€è¹Õ±±ô4(€€€€€€€€€€ñ‰ÕÑÑ½¸4(€€€€€€€€€€€ÑåÁ”ô‰‰ÕÑÑ½¸ˆ4(€€€€€€€€€€€½¹±¥¬õì ¤€ôøÙ½¥±…Õ¹¡AÉ•Á…É•‘…µ” ¥ô4(€€€€€€€€€€€‘¥Í…‰±•õí¥Í1½…‘¥¹ô4(€€€€€€€€€€€±…ÍÍ9…µ”õì4(€€€€€€€€€€€€€…Ñ¥½¹Y¥Í¥Ñ•4(€€€€€€€€€€€€€€€€ü€‰Üµ™Õ±°É½Õ¹‘•µlÈÁÁát‰½É‘•È´À‰œµlŒÄÄÄàÈÝtÁà´ÔÁä´ÐÑ•áÐµ±œ™½¹ÐµÍ•µ¥‰½±±•…‘¥¹œ´ÜÑ•áÐµÝ¡¥Ñ”Í¡…‘½ÜµlÁ|ÄÉÁá|ÈÑÁá}É‰„ ÄÜ°ÈÐ°Ìä°À¸ÄØ¥t‘¥Í…‰±•é½Á…¥Ñä´ØÀˆ4(€€€€€€€€€€€€€€€€è€…ÕÉÉ•¹ÑÑ¥½¸4(€€€€€€€€€€€€€€€€€€ü€‰Üµ™Õ±°É½Õ¹‘•µlÈÁÁát‰½É‘•È´À‰œµlŒÄÄÄàÈÝtÁà´ÔÁä´ÐÑ•áÐµá°™½¹ÐµÍ•µ¥‰½±Ñ•áÐµÝ¡¥Ñ”Í¡…‘½ÜµlÁ|ÄÉÁá|ÈÑÁá}É‰„ ÄÜ°ÈÐ°Ìä°À¸ÄØ¥t‘¥Í…‰±•é½Á…¥Ñä´ØÀˆ4(€€€€€€€€€€€€€€€€€€è€‰Üµ™Õ±°É½Õ¹‘•µlÄÉÁát‰½É‘•È´À‰œµÑÉ…¹ÍÁ…É•¹ÐÁà´ÌÁä´ÈÑ•áÐµÍ´™½¹Ðµµ•‘¥Õ´Ñ•áÐµlŒØÄØàÝ…tÕ¹‘•É±¥¹”‘•½É…Ñ¥½¸µlŒÑŒåÑtÕ¹‘•É±¥¹”µ½™™Í•Ð´ÐÑÉ…¹Í¥Ñ¥½¸¡½Ù•ÈéÑ•áÐµlŒÄÄÄàÈÝt‘¥Í…‰±•é½Á…¥Ñä´ØÀˆ4(€€€€€€€€€€€ô4(€€€€€€€€€€ø4(€€€€€€€€€€€í¥Í1½…‘¥¹œ4(€€€€€€€€€€€€€€ü€‰AË¥Á…É…Ñ¥½¸¸¸¸ˆ4(€€€€€€€€€€€€€€è…Ñ¥½¹Y¥Í¥Ñ•ñð€…ÕÉÉ•¹ÑÑ¥½¸4(€€€€€€€€€€€€€€€€ü€‰)½Õ•Èˆ4(€€€€€€€€€€€€€€€€è€‰)½Õ•Èµ…¥¹Ñ•¹…¹Ð‰ô4(€€€€€€€€€€ð½‰ÕÑÑ½¸ø4(€€€€€€€€ð½‘¥Øø4(€€€€€€€í•ÉÉ½È€ü€ 4(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µÐ´ÐÉ½Õ¹‘•µlÄáÁát‰œµl™™˜Å˜ÁtÁà´ÐÁä´ÌÑ•áÐµÍ´Ñ•áÐµlˆÐÈÌÄátˆø4(€€€€€€€€€€€í•ÉÉ½Éô4(€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€¤€è¹Õ±±ô4(€€€€€€ð½AÕ‰±¥5½‘…°ø4(4(€€€€€€ñAÕ‰±¥5½‘…°½Á•¸õíÍÑ…”€ôôô€‰½±±•Ð‰ôø4(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µàµ…ÕÑ¼™±•à ´ÈÐÜ´ÈÐ¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÉ½Õ¹‘•µ™Õ±°‰œµl˜Ý˜Ý™‰tÑ•áÐ´Ñá°Í¡…‘½ÜµlÁ|ÈÁÁá|ÐÕÁá}É‰„ ÄÜ°ÈÐ°Ìä°À¸ÄÀ¥tˆø4(€€€€€€€€€€ñ¥™Ð±…ÍÍ9…µ”ô‰ ´ÄÄÜ´ÄÄˆ…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆ€¼ø4(€€€€€€€€ð½‘¥Øø4(€€€€€€€€ñ È±…ÍÍ9…µ”ô‰µÐ´ØÑ•áÐµ•¹Ñ•ÈÑ•áÐµlÉÉ•µt™½¹ÐµÍ•µ¥‰½±±•…‘¥¹œµlÄ¸ÀÕtÑ•áÐµlŒÄÈÄàÈÙtˆø4(€€€€€€€€€í¥ÍAÉ•…µ•1•…‘…ÁÑÕÉ”4(€€€€€€€€€€€€ü€‰Ù…¹Ð‘”©½Õ•Èˆ4(€€€€€€€€€€€€èÁÉ•Ù¥•ÝI•ÍÕ±Ðü¹ÁÉ¥é”4(€€€€€€€€€€€€ü¥±¥¥Ñ…Ñ¥½¹Ì€„Y½ÕÌ…Ù•èÉ•µÁ½ÉÓ¤€‘íÁÉ•Ù¥•ÝI•ÍÕ±Ð¹ÁÉ¥é”¹±…‰•±õ€4(€€€€€€€€€€€€è€‰5•É¤Á½ÕÈÙ½ÑÉ”Á…ÉÑ¥¥Á…Ñ¥½¸‰ô4(€€€€€€€€ð½ Èø4(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µÐ´ÔÉ½Õ¹‘•µlÈÉÁát‰œµl˜Ù˜Ý™‰tÁà´ÔÁä´ÐÑ•áÐµ‰…Í”±•…‘¥¹œ´ÜÑ•áÐµlŒÐÜÔÀØÝtˆø4(€€€€€€€€€í¥ÍAÉ•…µ•1•…‘…ÁÑÕÉ”4(€€€€€€€€€€€€ü€‰M…¥Í¥ÍÍ•èÙ½Ì½½É‘½¹»¥•Ì•Ð…•ÁÑ•è±”½¹Í•¹Ñ•µ•¹ÐÁ½ÕÈÁ…ÉÑ¥¥Á•È…Ô©•Ô¸ˆ4(€€€€€€€€€€€€èÁÉ•Ù¥•ÝI•ÍÕ±Ðü¹ÁÉ¥é”4(€€€€€€€€€€€€ü€‰Y½Ì¥¹™½Éµ…Ñ¥½¹ÌÍ½¹Ð»¥•ÍÍ…¥É•ÌÁ½ÕÈÙ…±¥‘•È•Ð•¹Ù½å•ÈÙ½ÑÉ”…¥¸¸ˆ4(€€€€€€€€€€€€è€‰1…¥ÍÍ•èÙ½Ì½½É‘½¹»¥•ÌÁ½ÕÈÉ••Ù½¥È±•ÌÁÉ½¡…¥¹•Ì½ÁÁ½ÉÑÕ¹¥Ó¥Ì‘Ô½µµ•É”¸‰ô4(€€€€€€€€ð½‘¥Øø4(€€€€€€€ì…¥ÍAÉ•…µ•1•…‘…ÁÑÕÉ”€˜˜ÁÉ•Ù¥•ÝUÍ…•½¹‘¥Ñ¥½¹Ì€ü€ 4(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µÐ´ÐÉ½Õ¹‘•µlÈÉÁát‰œµl™™˜á”átÁà´ÔÁä´ÐÑ•áÐµ±•™ÐÑ•áÐµÍ´±•…‘¥¹œ´ÜÑ•áÐµlŒÙŒÔÌÄÍtˆø4(€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÕÁÁ•É…Í”ÑÉ…­¥¹œµlÀ¸É•µtÑ•áÐµlŒá„Ù„Äátˆø4(€€€€€€€€€€€€€½¹‘¥Ñ¥½¹Ì™…Á½ÌíÕÑ¥±¥Í…Ñ¥½¸4(€€€€€€€€€€€€ð½Àø4(€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µÐ´ÈÝ¡¥Ñ•ÍÁ…”µÁÉ”µ±¥¹”ˆùíÁÉ•Ù¥•ÝUÍ…•½¹‘¥Ñ¥½¹Íôð½Àø4(€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€¤€è¹Õ±±ô4(€€€€€€€€ñ™½É´±…ÍÍ9…µ”ô‰µÐ´ÔÍÁ…”µä´Ðˆ½¹MÕ‰µ¥ÐõíÍÕ‰µ¥Ñ]¥¹¹•É½Éµôø4(€€€€€€€€€€ñ¥¹ÁÕÐ4(€€€€€€€€€€€Ù…±Õ”õí™¥ÉÍÑ9…µ•ô4(€€€€€€€€€€€½¹¡…¹”õì¡•Ù•¹Ð¤€ôøÍ•Ñ¥ÉÍÑ9…µ”¡•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”¥ô4(€€€€€€€€€€€É•ÅÕ¥É•4(€€€€€€€€€€€Á±…•¡½±‘•Èô‰AË¥¹½´ˆ4(€€€€€€€€€€€±…ÍÍ9…µ”ô‰Üµ™Õ±°É½Õ¹‘•µlÄáÁát‰½É‘•È‰½É‘•Èµlá‘”ÕtÁà´ÐÁä´ÐÑ•áÐµ±œÑ•áÐµlŒÄÄÄàÈÝt½ÕÑ±¥¹”µ¹½¹”Á±…•¡½±‘•ÈéÑ•áÐµlŒäå„ÅˆÉtˆ4(€€€€€€€€€€¼ø4(€€€€€€€€€€ñ±…‰•°±…ÍÍ9…µ”ô‰ÍÈµ½¹±äˆ¡Ñµ±½Èô‰Ý¥¹¹•Èµ™¥ÉÍÐµ¹…µ”ˆùAË¥¹½´ð½±…‰•°ø4(4(€€€€€€€€€€ñ¥¹ÁÕÐ4(€€€€€€€€€€€¥ô‰Ý¥¹¹•Èµ™¥ÉÍÐµ¹…µ”ˆ4(€€€€€€€€€€€ÑåÁ”ô‰•µ…¥°ˆ4(€€€€€€€€€€€Ù…±Õ”õí•µ…¥±ô4(€€€€€€€€€€€½¹¡…¹”õì¡•Ù•¹Ð¤€ôøÍ•Ñµ…¥°¡•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”¥ô4(€€€€€€€€€€€É•ÅÕ¥É•4(€€€€€€€€€€€Á±…•¡½±‘•Èô‰µµ…¥°ˆ4(€€€€€€€€€€€±…ÍÍ9…µ”ô‰Üµ™Õ±°É½Õ¹‘•µlÄáÁát‰½É‘•È‰½É‘•Èµlá‘”ÕtÁà´ÐÁä´ÐÑ•áÐµ±œÑ•áÐµlŒÄÄÄàÈÝt½ÕÑ±¥¹”µ¹½¹”Á±…•¡½±‘•ÈéÑ•áÐµlŒäå„ÅˆÉtˆ4(€€€€€€€€€€¼ø4(€€€€€€€€€€ñ±…‰•°4(€€€€€€€€€€€¡Ñµ±½Èô‰µ…É­•Ñ¥¹œµ½¹Í•¹Ðˆ4(€€€€€€€€€€€±…ÍÍ9…µ”ô‰™±•àÕÉÍ½ÈµÁ½¥¹Ñ•È¥Ñ•µÌµÍÑ…ÉÐ…À´ÌÉ½Õ¹‘•µlÄáÁát‰œµl˜Ù˜Ý™‰tÁà´ÐÁä´ÌÑ•áÐµ±•™ÐÑ•áÐµÍ´±•…‘¥¹œ´ØÑ•áÐµlŒÐÜÔÀØÝtˆ4(€€€€€€€€€€ø4(€€€€€€€€€€€€ñ¥¹ÁÕÐ4(€€€€€€€€€€€€€¥ô‰µ…É­•Ñ¥¹œµ½¹Í•¹Ðˆ4(€€€€€€€€€€€€€ÑåÁ”ô‰¡•­‰½àˆ4(€€€€€€€€€€€€€É•ÅÕ¥É•õíÉ•ÅÕ¥É•Í½¹Ñ…Ñ…ÁÑÕÉ•ô4(€€€€€€€€€€€€€…É¥„µÉ•ÅÕ¥É•õíÉ•ÅÕ¥É•Í½¹Ñ…Ñ…ÁÑÕÉ•ô4(€€€€€€€€€€€€€¡•­•õíµ…É­•Ñ¥¹½¹Í•¹Ñô4(€€€€€€€€€€€€€½¹¡…¹”õì¡•Ù•¹Ð¤€ôøÍ•Ñ5…É­•Ñ¥¹½¹Í•¹Ð¡•Ù•¹Ð¹Ñ…É•Ð¹¡•­•¥ô4(€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰µÐ´Ä ´ÐÜ´Ð…•¹ÐµlŒÄÄÄàÈÝtˆ4(€€€€€€€€€€€€¼ø4(€€€€€€€€€€€€ñÍÁ…¸ø4(€€€€€€€€€€€€€(™…Á½Ìí…•ÁÑ”‘”É••Ù½¥È‘•Ì…ÑÕ…±¥Ó¥Ì•Ð½™™É•Ì‘”±„Á…ÉÐ‘”•Ðƒ¥Ñ…‰±¥ÍÍ•µ•¹Ð¸4(€€€€€€€€€€€€ð½ÍÁ…¸ø4(€€€€€€€€€€ð½±…‰•°ø4(4(€€€€€€€€€í•ÉÉ½È€ü€ 4(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰É½Õ¹‘•µlÄáÁát‰œµl™™˜Å˜ÁtÁà´ÐÁä´ÌÑ•áÐµÍ´Ñ•áÐµlˆÐÈÌÄátˆø4(€€€€€€€€€€€€€í•ÉÉ½Éô4(€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€¤€è¹Õ±±ô4(4(€€€€€€€€€€ñ‰ÕÑÑ½¸4(€€€€€€€€€€€ÑåÁ”ô‰ÍÕ‰µ¥Ðˆ4(€€€€€€€€€€€‘¥Í…‰±•õí¥Í1½…‘¥¹ô4(€€€€€€€€€€€±…ÍÍ9…µ”ô‰Üµ™Õ±°É½Õ¹‘•µlÄáÁát‰œµlŒÄÄÄàÈÝtÁà´ÔÁä´ÐÑ•áÐµ±œ™½¹ÐµÍ•µ¥‰½±Ñ•áÐµÝ¡¥Ñ”‘¥Í…‰±•é½Á…¥Ñä´ØÀˆ4(€€€€€€€€€€ø4(€€€€€€€€€€€í¥Í1½…‘¥¹œ4(€€€€€€€€€€€€€€ü¥ÍAÉ•…µ•1•…‘…ÁÑÕÉ”4(€€€€€€€€€€€€€€€€ü€‰AË¥Á…É…Ñ¥½¸¸¸¸ˆ4(€€€€€€€€€€€€€€€€è€‰¹É•¥ÍÑÉ•µ•¹Ð¸¸¸ˆ4(€€€€€€€€€€€€€€è¥ÍAÉ•…µ•1•…‘…ÁÑÕÉ”4(€€€€€€€€€€€€€€€€ü€‰½¹Ñ¥¹Õ•ÈÙ•ÉÌ±”©•Ôˆ4(€€€€€€€€€€€€€€€€è€‰¹É•¥ÍÑÉ•È‰ô4(€€€€€€€€€€ð½‰ÕÑÑ½¸ø4(€€€€€€€€ð½™½É´ø4(€€€€€€ð½AÕ‰±¥5½‘…°ø4(4(€€€€€€ñAÕ‰±¥5½‘…°½Á•¸õíÍÑ…”€ôôô€‰ÍÕ•ÍÌˆ€˜˜	½½±•…¸¡‘É…ÝI•ÍÕ±Ð¥ô½µÁ…Ðø4(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ñ•áÐµ•¹Ñ•Èˆø4(€€€€€€€€€€ñ È±…ÍÍ9…µ”ô‰Ñ•áÐµlÄ¸ÜÕÉ•µt™½¹ÐµÍ•µ¥‰½±±•…‘¥¹œµlÄ¸ÀÕtÑ•áÐµlŒÄÈÄàÈÙtˆø4(€€€€€€€€€€€5•É¤Á½ÕÈÙ½ÑÉ”Á…ÉÑ¥¥Á…Ñ¥½¸€„4(€€€€€€€€€€ð½ Èø4(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µàµ…ÕÑ¼µÐ´Ð™±•à ´ÄØÜ´ÄØ¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÉ½Õ¹‘•µ™Õ±°‰œµl˜Ý˜Ý™‰tÑ•áÐ´Ñá°Í¡…‘½ÜµlÁ|ÄÙÁá|ÌÑÁá}É‰„ ÄÜ°ÈÐ°Ìä°À¸ÄÀ¥tˆø4(€€€€€€€€€€€€ñ5…¥°±…ÍÍ9…µ”ô‰ ´àÜ´àˆ…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆ€¼ø4(€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µÐ´ÐÑ•áÐµ±œ±•…‘¥¹œ´ÜÑ•áÐµlŒÅ„É˜ÜÙtˆø4(€€€€€€€€€€€í¥Í½¹Ñ…Ñ=¹±åMÕ•ÍÌ4(€€€€€€€€€€€€€€ü€‰Y½ÑÉ”½¹Ñ…Ð•ÍÐ‰¥•¸•¹É•¥ÍÑË¤¸ˆ4(€€€€€€€€€€€€€€è€‰Y½ÕÌÉ••ÙÉ•èÙ½ÑÉ”…¥¸Á…È”µµ…¥°…Ù•Œ±•Ì¥¹™½Éµ…Ñ¥½¹Ì‘”É•ÑÉ…¥Ð‰ô4(€€€€€€€€€€ð½Àø4(€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µÐ´ÌÑ•áÐµÍ´±•…‘¥¹œ´ØÑ•áÐµlŒØÄØàÝ…tˆø4(€€€€€€€€€€€í¥Í½¹Ñ…Ñ=¹±åMÕ•ÍÌ4(€€€€€€€€€€€€€€ü€‰5•É¤Á½ÕÈÙ½ÑÉ”½¹™¥…¹”¸ˆ4(€€€€€€€€€€€€€€è€‰½¹Í•ÉÙ•è”EH½‘”Á½ÕÈÉ•Ñ¥É•ÈÙ½ÑÉ”…¥¸¸M¤³Še”µµ…¥°Ñ…É‘”ƒ€…ÉÉ¥Ù•È°Û¥É¥™¥•èÙ½ÌÍÁ…µÌ¸‰ô4(€€€€€€€€€€ð½Àø4(4(€€€€€€€€€í‘É…ÝI•ÍÕ±Ðü¹ÁÉ¥é”€ü€ñ‘¥Ø±…ÍÍ9…µ”ô‰µÐ´ÐÉ½Õ¹‘•µlÄáÁát‰œµl™™˜Ñ‰tÁà´ÐÁä´ÌÑ•áÐµ±•™ÐÑ•áÐµÍ´±•…‘¥¹œ´ØÑ•áÐµlŒÑÌàÄÁtˆø4(€€€€€€€€€€€€ñÀø4(€€€€€€€€€€€€€Y½ÕÌ…Ù•è•¹ÑÉ”±”í…Ù…¥±…‰±•…Ñ”€üü€‰µ…¥¹Ñ•¹…¹Ð‰ô•Ð±”í•áÁ¥Éå…Ñ”€üü€‰‰¥•¹ÓÑÐ‰õìˆ€‰ô4(€€€€€€€€€€€€€Á½ÕÈÙ•¹¥È±”Ë¥ÕÃ¥É•È¸4(€€€€€€€€€€€€ð½Àø4(€€€€€€€€€€ð½‘¥Øø€è¹Õ±±ô4(4(€€€€€€€€€í‘É…ÝI•ÍÕ±Ðü¹ÁÉ¥é”€˜˜…µÁ…¥¸¹É•Ý…É‘IÕ±•Ì¹ÁÕÉ¡…Í•I•ÅÕ¥É•€ü€ 4(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µÐ´ÌÉ½Õ¹‘•µlÄáÁát‰œµl˜Ý˜Ý™‰tÁà´ÐÁä´ÌÑ•áÐµ±•™ÐÑ•áÐµÍ´±•…‘¥¹œ´ØÑ•áÐµlŒØÄØàÝ…tˆø4(€€€€€€€€€€€€€1”É•ÑÉ…¥Ð‘Ô±½Ð•ÍÐÍ½Õµ¥Ìƒ€Õ¹”½¹‘¥Ñ¥½¸“Še…¡…Ð¸4(€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€¤€è¹Õ±±ô4(4(€€€€€€€€€í‘É…ÝI•ÍÕ±Ðü¹ÁÉ¥é”€˜˜É•Í½±Ù•‘UÍ…•½¹‘¥Ñ¥½¹Ì€ü€ 4(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µÐ´ÌÉ½Õ¹‘•µlÄáÁát‰œµl™™˜Ñ‰tÁà´ÐÁä´ÌÑ•áÐµ±•™ÐÑ•áÐµÍ´±•…‘¥¹œ´ØÑ•áÐµlŒÑÌàÄÁtˆø4(€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÕÁÁ•É…Í”ÑÉ…­¥¹œµlÀ¸É•µtÑ•áÐµlŒá„Ù„Äátˆø4(€€€€€€€€€€€€€€€½¹‘¥Ñ¥½¹Ì™…Á½ÌíÕÑ¥±¥Í…Ñ¥½¸4(€€€€€€€€€€€€€€ð½Àø4(€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µÐ´ÈÝ¡¥Ñ•ÍÁ…”µÁÉ”µ±¥¹”ˆùíÉ•Í½±Ù•‘UÍ…•½¹‘¥Ñ¥½¹Íôð½Àø4(€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€¤€è¹Õ±±ô4(4(€€€€€€€€€íÉ•‘•µÁÑ¥½¹½‘”€ü€ 4(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µÐ´ÐÉ½Õ¹‘•µlÈÁÁát‰½É‘•È‰½É‘•Èµl”Õ”Ý•™t‰œµl™…™‰™™tÀ´Ìˆø4(€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÕÁÁ•É…Í”ÑÉ…­¥¹œµlÀ¸ÈÑ•µtÑ•áÐµlŒáˆäÍ„Õtˆù½‘”‘”É•ÑÉ…¥Ðð½Àø4(€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µÐ´ÄÑ•áÐµá°™½¹ÐµÍ•µ¥‰½±Ñ•áÐµlŒÄÈÄàÈÙtˆùíÉ•‘•µÁÑ¥½¹½‘•ôð½Àø4(€€€€€€€€€€€€€íÅÉA…Ñ €ü€ 4(€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µÐ´Ì™±•à¥Ñ•µÌµ•¹Ñ•È…À´ÌÉ½Õ¹‘•µlÄÙÁát‰œµÝ¡¥Ñ”À´È¸ÔÑ•áÐµ±•™Ðˆø4(€€€€€€€€€€€€€€€€€€ñ%µ…”4(€€€€€€€€€€€€€€€€€€€ÍÉŒõíÅÉA…Ñ¡ô4(€€€€€€€€€€€€€€€€€€€…±ÐõíEH½‘”€‘íÉ•‘•µÁÑ¥½¹½‘•õô4(€€€€€€€€€€€€€€€€€€€Ý¥‘Ñ õìàÁô4(€€€€€€€€€€€€€€€€€€€¡•¥¡ÐõìàÁô4(€€€€€€€€€€€€€€€€€€€Õ¹½ÁÑ¥µ¥é•4(€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰ ´ÈÀÜ´ÈÀÉ½Õ¹‘•µlÄÉÁátˆ4(€€€€€€€€€€€€€€€€€€¼ø4(€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µ¥¸µÜ´À™±•à´Äˆø4(€€€€€€€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµáÌ±•…‘¥¹œ´ÔÑ•áÐµlŒØÄØàÝ…tˆø4(€€€€€€€€€€€€€€€€€€€€€¹É•¥ÍÑÉ•èµ±”Á½ÕÈ±”É•ÑÉ½ÕÙ•È™…¥±•µ•¹Ð¸4(€€€€€€€€€€€€€€€€€€€€ð½Àø4(€€€€€€€€€€€€€€€€€€€€ñ„4(€€€€€€€€€€€€€€€€€€€€€¡É•˜õíÅÉA…Ñ¡ô4(€€€€€€€€€€€€€€€€€€€€€‘½Ý¹±½…õíÅÈµ±½Ð´‘íÉ•‘•µÁÑ¥½¹½‘•ô¹ÍÙô4(€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰µÐ´È¥¹±¥¹”µ™±•àÉ½Õ¹‘•µlÄÉÁát‰œµlŒÄÄÄàÈÝtÁà´ÌÁä´ÈÑ•áÐµáÌ™½¹ÐµÍ•µ¥‰½±€…Ñ•áÐµÝ¡¥Ñ”ˆ4(€€€€€€€€€€€€€€€€€€€€ø4(€€€€€€€€€€€€€€€€€€€€€¹É•¥ÍÑÉ•È4(€€€€€€€€€€€€€€€€€€€€ð½„ø4(€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€¤€è¹Õ±±ô4(€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€¤€è¹Õ±±ô4(€€€€€€€€ð½‘¥Øø4(€€€€€€ð½AÕ‰±¥5½‘…°ø4(€€€€ð½‘¥Øø4(€€¤ì4)ô4(4(