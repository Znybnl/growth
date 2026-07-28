"use client";

import Image from "next/image";
import {
  ArrowRight,
  AtSign,
  Camera,
  Gift,
  Mail,
  MessageCircle,
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
import { DEFAULT_SCRATCH_SUBTITLE, normalizeScratchAccent } from "@/lib/campaign-defaults";
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
      return <MessageCircle className="h-9 w-9" aria-hidden="true" />;
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
    <div role="dialog" aria-modal="true" aria-label="FenÃƒÂªtre de participation" className="fixed inset-0 z-40 flex items-end justify-center bg-[#0f1220]/52 px-4 pb-4 pt-10 backdrop-blur-[6px] sm:items-center sm:p-6">
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
        ? "IllimitÃƒÂ©"
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
              CGU et rÃƒÂ¨glement du jeu
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
              PrÃƒÂ©ambule et dÃƒÂ©finitions
            </h3>
            <p className="mt-2">
              Le prÃƒÂ©sent document rÃƒÂ©git les conditions de participation aux jeux-concours
              phygitaux ci-aprÃƒÂ¨s Ã‚Â« le Jeu Ã‚Â», dÃƒÂ©ployÃƒÂ©s en point de vente via la solution
              logicielle Okado.
            </p>
            <p className="mt-2">
              La SociÃƒÂ©tÃƒÂ© Organisatrice, ci-aprÃƒÂ¨s Ã‚Â« le Marchand Ã‚Â», est l&apos;ÃƒÂ©tablissement
              professionnel au sein duquel le Jeu est dÃƒÂ©ployÃƒÂ©. Elle dÃƒÂ©finit les rÃƒÂ¨gles
              spÃƒÂ©cifiques, les dotations et assume l&apos;entiÃƒÂ¨re responsabilitÃƒÂ© lÃƒÂ©gale de
              l&apos;organisation du Jeu.
            </p>
            <p className="mt-2">
              Le Prestataire Technique, ci-aprÃƒÂ¨s Ã‚Â« l&apos;Ãƒâ€°diteur Ã‚Â», est la sociÃƒÂ©tÃƒÂ© BRUNELLE
              PEROLS INVESTISSEMENT, ÃƒÂ©ditrice de la solution SaaS Okado, agissant
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
              La participation au Jeu implique l&apos;acceptation expresse, pleine et entiÃƒÂ¨re,
              sans rÃƒÂ©serve, du prÃƒÂ©sent rÃƒÂ¨glement par le Participant. Ce rÃƒÂ¨glement rÃƒÂ©git les
              relations entre le Participant et la SociÃƒÂ©tÃƒÂ© Organisatrice. L&apos;Ãƒâ€°diteur de la
              solution Okado est un tiers ÃƒÂ  cette relation.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 2 - MÃƒÂ©canique du jeu et participation
            </h3>
            <p className="mt-2">
              La participation au Jeu s&apos;effectue exclusivement en scannant le QR Code mis
              ÃƒÂ  disposition au sein de l&apos;ÃƒÂ©tablissement de la SociÃƒÂ©tÃƒÂ© Organisatrice. Selon
              le paramÃƒÂ©trage dÃƒÂ©fini sous la seule responsabilitÃƒÂ© de la SociÃƒÂ©tÃƒÂ©
              Organisatrice, le Participant pourra ÃƒÂªtre invitÃƒÂ© ÃƒÂ  consulter des liens
              externes, tels que la fiche Google Business Profile de l&apos;ÃƒÂ©tablissement.
            </p>
            <p className="mt-2">
              Il est expressÃƒÂ©ment prÃƒÂ©cisÃƒÂ© que le dÃƒÂ©pÃƒÂ´t d&apos;un avis en ligne est strictement
              facultatif. Il ne constitue en aucun cas une condition de participation, ni
              une obligation pour valider l&apos;obtention d&apos;un gain. L&apos;Ãƒâ€°diteur dÃƒÂ©cline toute
              responsabilitÃƒÂ© quant ÃƒÂ  l&apos;utilisation de cette fonctionnalitÃƒÂ© par la SociÃƒÂ©tÃƒÂ©
              Organisatrice au regard des conditions d&apos;utilisation des plateformes tierces,
              notamment Google.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 3 - DÃƒÂ©signation des gagnants et responsabilitÃƒÂ© des lots
            </h3>
            <p className="mt-2">
              L&apos;attribution des gains est gÃƒÂ©rÃƒÂ©e automatiquement dÃƒÂ¨s la soumission du
              formulaire, via un algorithme de tirage au sort alÃƒÂ©atoire tenant compte des
              probabilitÃƒÂ©s et des stocks paramÃƒÂ©trÃƒÂ©s par la SociÃƒÂ©tÃƒÂ© Organisatrice.
            </p>
            <p className="mt-2">
              La SociÃƒÂ©tÃƒÂ© Organisatrice est seule responsable de la fourniture, de la
              conformitÃƒÂ© et de la remise des lots. La responsabilitÃƒÂ© du Prestataire
              Technique ne saurait ÃƒÂªtre engagÃƒÂ©e pour toute rÃƒÂ©clamation relative ÃƒÂ  une
              rupture de stock, un dÃƒÂ©faut du lot, un refus de remise par le personnel en
              magasin, ou tout litige liÃƒÂ© ÃƒÂ  l&apos;exÃƒÂ©cution du Jeu.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 4 - ModalitÃƒÂ©s de rÃƒÂ©cupÃƒÂ©ration des lots
            </h3>
            <p className="mt-2">
              En cas de gain, le Participant reÃƒÂ§oit un e-mail de confirmation ÃƒÂ  l&apos;adresse
              renseignÃƒÂ©e lors de sa participation, contenant un QR Code unique et personnel.
              Le Participant doit prÃƒÂ©senter ce QR Code au personnel de la SociÃƒÂ©tÃƒÂ©
              Organisatrice. La remise du lot n&apos;est dÃƒÂ©finitive qu&apos;aprÃƒÂ¨s validation de ce QR
              Code par le personnel habilitÃƒÂ©, par scan direct ou via la plateforme de gestion
              Okado.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 5 - PrÃƒÂ©vention de la fraude et litiges techniques
            </h3>
            <p className="mt-2">
              La participation est strictement nominative et limitÃƒÂ©e ÃƒÂ  une participation par
              jour et par ÃƒÂ©tablissement. La SociÃƒÂ©tÃƒÂ© Organisatrice se rÃƒÂ©serve le droit
              d&apos;annuler la participation ou de refuser la remise d&apos;un lot ÃƒÂ  toute personne
              ayant tentÃƒÂ© de frauder. En cas de dysfonctionnement technique temporaire de la
              plateforme Okado ou de l&apos;appareil du Participant empÃƒÂªchant la validation,
              aucune compensation ne pourra ÃƒÂªtre exigÃƒÂ©e.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 6 - Protection des donnÃƒÂ©es personnelles
            </h3>
            <p className="mt-2">
              Dans le cadre du Jeu, des donnÃƒÂ©es ÃƒÂ  caractÃƒÂ¨re personnel sont collectÃƒÂ©es. La
              SociÃƒÂ©tÃƒÂ© Organisatrice agit en tant que Responsable de traitement. Le
              Prestataire Technique hÃƒÂ©berge ces donnÃƒÂ©es de maniÃƒÂ¨re sÃƒÂ©curisÃƒÂ©e pour le compte
              exclusif de la SociÃƒÂ©tÃƒÂ© Organisatrice.
            </p>
            <p className="mt-2">
              ConformÃƒÂ©ment ÃƒÂ  la rÃƒÂ©glementation applicable, le Participant dispose d&apos;un droit
              d&apos;accÃƒÂ¨s, de rectification, de portabilitÃƒÂ© et d&apos;effacement de ses donnÃƒÂ©es. Pour
              exercer ces droits, le Participant doit s&apos;adresser directement ÃƒÂ  la SociÃƒÂ©tÃƒÂ©
              Organisatrice par le biais de ses coordonnÃƒÂ©es habituelles.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#111827]">
              Article 7 - Limites de responsabilitÃƒÂ© technique
            </h3>
            <p className="mt-2">
              Le Prestataire Technique met en Ã…â€œuvre les moyens nÃƒÂ©cessaires au bon
              fonctionnement de l&apos;infrastructure du Jeu. Sa responsabilitÃƒÂ© ne saurait ÃƒÂªtre

              engagÃƒÂ©e en cas de non-rÃƒÂ©ception de l&apos;e-mail de confirmation de gain due ÃƒÂ  une
              erreur de saisie, ÃƒÂ  un filtrage anti-spam, ÃƒÂ  une dÃƒÂ©faillance du fournisseur de
              messagerie, ÃƒÂ  une interruption rÃƒÂ©seau, au dysfonctionnement du smartphone du
              Participant ou ÃƒÂ  un bogue technique temporaire.
            </p>
          </section>

          <section>
            <h3 className="text-baseïŸ{¶‰Ëkºwµçt(€€€€€€€€€€€€€€€±½½±¥¹µ•¹Ñ±…ÍÌõí±½½±¥¹µ•¹Ñ±…ÍÍô4(€€€€€€€€€€€€€€€±½½	½ÑÑ½µMÁ…¥¹Aàõí…µÁ…¥¸¹ÁÉ•Í•¹Ñ…Ñ¥½¸¹±½¼¹µ…É¥¹	½ÑÑ½µAáô4(€€€€€€€€€€€€€€€±½½]¥‘Ñ¡Aàõí±½½]¥‘Ñ¡Aáô4(€€€€€€€€€€€€€€€Ñ•µÁ±…Ñ”õíÁ…•Q•µÁ±…Ñ”…Ì€‰ÍÉ…Ñ µÙ…Õ±Ğˆğ€‰ÍÉ…Ñ µ½¹™•ÑÑ¤ˆğ€‰ÍÉ…Ñ µ½É…°ˆğ€‰ÍÉ…Ñ µ±¥±…Œˆğ€‰ÍÉ…Ñ µÍÕ¹‰ÕÉÍĞ‰ô4(€€€€€€€€€€€€€€¼ø4(€€€€€€€€€€€€¤€è€ 4(€€€€€€€€€€€€€€ñMÉ…Ñ¡…µ”4(€€€€€€€€€€€€€€€­•äõí€‘í…µÁ…¥¸¹¥‘ô´‘í‘É…İM•ÍÍ¥½¸ü¹¥€üü€‰¥‘±”‰õô4(€€€€€€€€€€€€€€€…•¹ĞõíÍÉ…Ñ¡•¹Ñô(€€€€€€€€€€€€€€€É•ÍÕ±Ñ1…‰•°õíÍÉ…Ñ¡1…‰•±ô4(€€€€€€€€€€€€€€€•¹…‰±•õíÍÑ…”€ôôô€‰É•…‘ä‰ô4(€€€€€€€€€€€€€€€½¹I•Ù•…°õì ¤€ôøÙ½¥¡…¹‘±•…µ•I•Ù•…° ¥ô4(€€€€€€€€€€€€€€¼ø4(4(€€€€€€€€€€€€¥ô4(€€€€€€€€€€ğ½‘¥Øø4(€€€€€€€€¥ô4(4(€€€€€€€íÍ¡½İ	½ÑÑ½µMÑ…Ñ”€ü€ñ‘¥Ø±…ÍÍ9…µ”ô‰µĞ´àÍÁ…”µä´Ğˆø4(€€€€€€€€€íÍÑ…”€ôôô€‰¥‘±”ˆ€˜˜…µÁ…¥¸¹…µ•QåÁ”€„ôô€‰İ¡••°ˆ€ü€ 4(€€€€€€€€€€€€ñ‰ÕÑÑ½¸4(€€€€€€€€€€€€€ÑåÁ”ô‰‰ÕÑÑ½¸ˆ4(€€€€€€€€€€€€€½¹±¥¬õí½Á•¹Ñ¥½¹¹‘QÉ…­ô4(€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰µàµ…ÕÑ¼‰±½¬Üµ™Õ±°µ…àµÜµlÌØÁÁátÉ½Õ¹‘•µlÈÑÁát‰½É‘•ÈÁà´ØÁä´ĞÑ•áĞµ±œ™½¹ĞµÍ•µ¥‰½±Í¡…‘½ÜµlÁ|ÈÉÁá|ÌÑÁá}É‰„ ÄÜ°ÈĞ°Ìä°À¸Àà¥tˆ4(€€€€€€€€€€€€€ÍÑå±”õíì4(€€€€€€€€€€€€€€€‰…­É½Õ¹‘½±½Èè…µÁ…¥¸¹ÁÉ•Í•¹Ñ…Ñ¥½¸¹‰ÕÑÑ½¸¹‰…­É½Õ¹‘½±½È°4(€€€€€€€€€€€€€€€½±½Èè…µÁ…¥¸¹ÁÉ•Í•¹Ñ…Ñ¥½¸¹‰ÕÑÑ½¸¹Ñ•áÑ½±½È°4(€€€€€€€€€€€€€€€‰½É‘•É½±½Èè…µÁ…¥¸¹ÁÉ•Í•¹Ñ…Ñ¥½¸¹‰ÕÑÑ½¸¹‰½É‘•É½±½È°4(€€€€€€€€€€€€€€€™½¹ÑM¥é”è‰ÕÑÑ½¹½¹ÑM¥é”°4(€€€€€€€€€€€€€õô4(€€€€€€€€€€€€ø4(€€€€€€€€€€€€€íÁÕ‰±¥Ñ…1…‰•±ô4(€€€€€€€€€€€€ğ½‰ÕÑÑ½¸ø4(€€€€€€€€€€¤€è¹Õ±±ô4(4(€€€€€€€€€íÍÑ…”€ôôô€‰É•…‘äˆ€˜˜…µÁ…¥¸¹…µ•QåÁ”€„ôô€‰İ¡••°ˆ€ü€ 4(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰É½Õ¹‘•µlÈáÁát‰½É‘•È‰½É‘•Èµİ¡¥Ñ”¼ÜÀ‰œµİ¡¥Ñ”¼ÜÈÁà´ÔÁä´ĞÑ•áĞµ•¹Ñ•ÈÑ•áĞµÍ´Ñ•áĞµlŒØÈØäİ…tÍ¡…‘½ÜµlÁ|ÄáÁá|ĞÁÁá}É‰„ ÄÜ°ÈĞ°Ìä°À¸ÀØ¥t‰…­‘É½Àµ‰±ÕÈˆø4(€€€€€€€€€€€€€É…ÑÑ•è±”Ñ¥­•ĞÁ½ÕÈË¥Û¥±•È¥µ·¥‘¥…Ñ•µ•¹ĞÙ½ÑÉ”Ë¥ÍÕ±Ñ…Ğ¸(€€€€€€€€€€€€ğ½‘¥Øø4(€€€€€€€€€€¤€è¹Õ±±ô4(4(€€€€€€€€€í™…±Í”€ü€ 4(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰É½Õ¹‘•µlÌÉÁát‰½É‘•È‰½É‘•Èµİ¡¥Ñ”¼àÀ‰œµİ¡¥Ñ”¼àĞÀ´ØÑ•áĞµ•¹Ñ•ÈÍ¡…‘½ÜµlÁ|ÈÑÁá|ĞáÁá}É‰„ ÄÜ°ÈĞ°Ìä°À¸Àà¥t‰…­‘É½Àµ‰±ÕÈˆø4(€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µàµ…ÕÑ¼™±•à ´ÈÀÜ´ÈÀ¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÉ½Õ¹‘•µ™Õ±°‰œµl˜Í˜Ñ˜átÑ•áĞ´Íá°ˆø4(€€€€€€€€€€€€€€€€è 4(€€€€€€€€€€€€€€ğ½‘¥Øø4(€€€€€€€€€€€€€€ñ È±…ÍÍ9…µ”ô‰µĞ´ÔÑ•áĞ´Íá°™½¹ĞµÍ•µ¥‰½±Ñ•áĞµlŒÄĞÄàÈÙtˆùA•É‘Ô€è ğ½ Èø4(€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µĞ´ÌÑ•áĞµ‰…Í”±•…‘¥¹œ´ÜÑ•áĞµlŒØÄØàİ…tˆø4(€€€€€€€€€€€€€€€5•É¤Á½ÕÈÙ½ÑÉ”Á…ÉÑ¥¥Á…Ñ¥½¸¸I•Ù•¹•è‰¥•¹ÓÑĞÁ½ÕÈÕ¹”¹½ÕÙ•±±”¡…¹”¸(€€€€€€€€€€€€€€ğ½Àø4(€€€€€€€€€€€€ğ½‘¥Øø4(€€€€€€€€€€¤€è¹Õ±±ô4(€€€€€€€€ğ½‘¥Øø€è¹Õ±±ô4(€€€€€€ğ½‘¥Øø4(4(€€€€€€ñ‰ÕÑÑ½¸4(€€€€€€€ÑåÁ”ô‰‰ÕÑÑ½¸ˆ4(€€€€€€€½¹±¥¬õì ¤€ôøÍ•ÑIÕ±•Í=Á•¸¡ÑÉÕ”¥ô4(€€€€€€€±…ÍÍ9…µ”ô‰™¥á•‰½ÑÑ½´´ĞÉ¥¡Ğ´Ğè´ÈÀÉ½Õ¹‘•µ™Õ±°‰½É‘•È‰½É‘•Èµİ¡¥Ñ”¼ÜÀ‰œµİ¡¥Ñ”¼àÈÁà´ĞÁä´ÈÑ•áĞµÍ´™½¹ĞµÍ•µ¥‰½±Ñ•áĞµlŒÄÄÄàÈİtÍ¡…‘½ÜµlÁ|ÄÑÁá|ÌÑÁá}É‰„ ÄÜ°ÈĞ°Ìä°À¸ÄÈ¥t‰…­‘É½Àµ‰±ÕÈˆ4(€€€€€€ø4(€€€€€€€K¡±•µ•¹Ğ(€€€€€€ğ½‰ÕÑÑ½¸ø4(4(€€€€€€ñIÕ±•Í5½‘…°…µÁ…¥¸õí…µÁ…¥¹ô½Á•¸õíÉÕ±•Í=Á•¹ô½¹±½Í”õì ¤€ôøÍ•ÑIÕ±•Í=Á•¸¡™…±Í”¥ô€¼ø4(4(€€€€€€ñAÕ‰±¥5½‘…°½Á•¸õíÍÑ…”€ôôô€‰±½ÍĞ‰ôø4(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µàµ…ÕÑ¼™±•à ´ÈÀÜ´ÈÀ¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÉ½Õ¹‘•µ™Õ±°‰œµl˜Í˜Ñ˜átÑ•áĞ´Íá°™½¹ĞµÍ•µ¥‰½±Ñ•áĞµlŒÄĞÄàÈÙtÍ¡…‘½ÜµlÁ|ÈÁÁá|ĞÕÁá}É‰„ ÄÜ°ÈĞ°Ìä°À¸ÄÀ¥tˆø4(€€€€€€€€€€„4(€€€€€€€€ğ½‘¥Øø4(€€€€€€€€ñ È±…ÍÍ9…µ”ô‰µĞ´ØÑ•áĞµ•¹Ñ•ÈÑ•áĞµlÉÉ•µt™½¹ĞµÍ•µ¥‰½±±•…‘¥¹œµlÄ¸ÀÕtÑ•áĞµlŒÄÈÄàÈÙtˆø4(€€€€€€€€€A•É‘Ô4(€€€€€€€€ğ½ Èø4(€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µĞ´ĞÑ•áĞµ•¹Ñ•ÈÑ•áĞµ±œ±•…‘¥¹œ´àÑ•áĞµlŒÕ˜ØØÜátˆø4(€€€€€€€€€5•É¤Á½ÕÈÙ½ÑÉ”Á…ÉÑ¥¥Á…Ñ¥½¸¸I•Ù•¹•è‰¥•¹ÓÑĞÁ½ÕÈÕ¹”¹½ÕÙ•±±”¡…¹”¸(€€€€€€€€ğ½Àø4(€€€€€€ğ½AÕ‰±¥5½‘…°ø4(4(€€€€€€ñAÕ‰±¥5½‘…°½Á•¸õíÍÑ…”€ôôô€‰‰±½­•‰ôø4(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µàµ…ÕÑ¼™±•à ´ÈÀÜ´ÈÀ¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÉ½Õ¹‘•µ™Õ±°‰œµl˜Í˜Ñ˜átÑ•áĞ´Íá°™½¹ĞµÍ•µ¥‰½±Ñ•áĞµlŒÄĞÄàÈÙtÍ¡…‘½ÜµlÁ|ÈÁÁá|ĞÕÁá}É‰„ ÄÜ°ÈĞ°Ìä°À¸ÄÀ¥tˆø4(€€€€€€€€€€„4(€€€€€€€€ğ½‘¥Øø4(€€€€€€€€ñ È±…ÍÍ9…µ”ô‰µĞ´ØÑ•áĞµ•¹Ñ•ÈÑ•áĞµlÉÉ•µt™½¹ĞµÍ•µ¥‰½±±•…‘¥¹œµlÄ¸ÀÕtÑ•áĞµlŒÄÈÄàÈÙtˆø4(€€€€€€€€€A…ÉÑ¥¥Á…Ñ¥½¸“¥«€•¹É•¥ÍÑË¥”(€€€€€€€€ğ½ Èø4(€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µĞ´ĞÑ•áĞµ•¹Ñ•ÈÑ•áĞµ±œ±•…‘¥¹œ´àÑ•áĞµlŒÕ˜ØØÜátˆø4(€€€€€€€€€í‰±½­•‘5•ÍÍ…•ô4(€€€€€€€€ğ½Àø4(€€€€€€€€ñ‰ÕÑÑ½¸4(€€€€€€€€€ÑåÁ”ô‰‰ÕÑÑ½¸ˆ4(€€€€€€€€€½¹±¥¬õì ¤€ôøÍ•ÑMÑ…” ‰¥‘±”ˆ¥ô4(€€€€€€€€€±…ÍÍ9…µ”ô‰µĞ´ØÜµ™Õ±°É½Õ¹‘•µlÈÁÁát‰œµlŒÄÄÄàÈİtÁà´ÔÁä´ĞÑ•áĞµ±œ™½¹ĞµÍ•µ¥‰½±Ñ•áĞµİ¡¥Ñ”Í¡…‘½ÜµlÁ|ÄÉÁá|ÈÑÁá}É‰„ ÄÜ°ÈĞ°Ìä°À¸ÄØ¥tˆ4(€€€€€€€€ø4(€€€€€€€€€½µÁÉ¥Ì4(€€€€€€€€ğ½‰ÕÑÑ½¸ø4(€€€€€€ğ½AÕ‰±¥5½‘…°ø4(4(€€€€€€ñAÕ‰±¥5½‘…°½Á•¸õíÍÑ…”€ôôô€‰¥¹ÑÉ¼‰ôø4(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µàµ…ÕÑ¼™±•à ´ÈĞÜ´ÈĞ¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÉ½Õ¹‘•µ™Õ±°‰œµl˜İ˜İ™‰tÑ•áĞ´Ñá°™½¹ĞµÍ•µ¥‰½±Ñ•áĞµlŒÅ„É˜ÜÙtÍ¡…‘½ÜµlÁ|ÈÁÁá|ĞÕÁá}É‰„ ÄÜ°ÈĞ°Ìä°À¸ÄÀ¥tˆø4(€€€€€€€€€í…Ñ¥½¹%½¸¡ÕÉÉ•¹ÑÑ¥½¸ü¹­¥¹¥ô4(€€€€€€€€ğ½‘¥Øø4(€€€€€€€€ñ È±…ÍÍ9…µ”ô‰µĞ´ØÑ•áĞµ•¹Ñ•ÈÑ•áĞµlÉÉ•µt™½¹ĞµÍ•µ¥‰½±±•…‘¥¹œµlÄ¸ÀÕtÑ•áĞµlŒÄÈÄàÈÙtˆø4(€€€€€€€€€íÕÉÉ•¹ÑÑ¥½¸€ü€‰Ù…¹Ğ‘”©½Õ•Èˆ€è€‰AË©Ğƒ€©½Õ•È€ü‰ô(€€€€€€€€ğ½ Èø4(€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µĞ´ĞÑ•áĞµ•¹Ñ•ÈÑ•áĞµ±œ±•…‘¥¹œ´àÑ•áĞµlŒÕ˜ØØÜátˆø4(€€€€€€€€€íÕÉÉ•¹ÑÑ¥½¸ü¹­¥¹€ôôô€‰½½±”ˆ4(€€€€€€€€€€€€ü€‰1…¥ÍÍ•èµ¹½ÕÌÕ¸…Ù¥Ì•ĞÉ•Ù•¹•è¥¤Á½ÕÈ©½Õ•È¸ˆ4(€€€€€€€€€€€€èÕÉÉ•¹ÑÑ¥½¸ü¹­¥¹€ôôô€‰¥¹ÍÑ…É…´ˆ4(€€€€€€€€€€€€€€ü€‰MÕ¥Ù•èµ¹½ÕÌÍÕÈ%¹ÍÑ…É…´Á½ÕÈ“¥½ÕÙÉ¥È±•Ì¹½ÕÙ•…ÕÓ¥Ì‘Ô½µµ•É”°ÁÕ¥ÌÉ•Ù•¹•è¥¤Á½ÕÈ©½Õ•È¸ˆ(€€€€€€€€€€€€€€èÕÉÉ•¹ÑÑ¥½¸4(€€€€€€€€€€€€€€€€ü€‰¥½ÕÙÉ•è±”±¥•¸‘Ô½µµ•É”‘…¹ÌÕ¸¹½ÕÙ•°½¹±•Ğ°ÁÕ¥ÌÉ•Ù•¹•è¥¤Á½ÕÈ©½Õ•È¸ˆ(€€€€€€€€€€€€€€€€è€‰Q½Õ¡•è)½Õ•ÈÁ½ÕÈÁË¥Á…É•ÈÙ½ÑÉ”Á…ÉÑ¥”•Ğ“¥½ÕÙÉ¥ÈÙ½ÑÉ”Ë¥ÍÕ±Ñ…Ğ¸‰ô(€€€€€€€€ğ½Àø4(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µĞ´ØÍÁ…”µä´Ìˆø4(€€€€€€€€€íÕÉÉ•¹ÑÑ¥½¸€ü€ 4(€€€€€€€€€€€€ñ„4(€€€€€€€€€€€€€¡É•˜õíÕÉÉ•¹ÑÑ¥½¸¹ÕÉ±ô4(€€€€€€€€€€€€€Ñ…É•Ğô‰}‰±…¹¬ˆ4(€€€€€€€€€€€€€É•°ô‰¹½É•™•ÉÉ•Èˆ4(€€€€€€€€€€€€€½¹±¥¬õì ¤€ôøì4(€€€€€€€€€€€€€€€¥˜€¡ÕÉÉ•¹ÑÑ¥½¸¹­¥¹€ôôô€‰½½±”ˆ¤ì4(€€€€€€€€€€€€€€€€€Í•ÑÑ¥½¹Y¥Í¥Ñ•¡ÑÉÕ”¤ì4(€€€€€€€€€€€€€€€€€Ù½¥ÑÉ…­Ù•¹Ğ ‰É•Ù¥•İ}±¥­•ˆ¤ì4(€€€€€€€€€€€€€€€€€É•ÑÕÉ¸ì4(€€€€€€€€€€€€€€€ô4(4(€€€€€€€€€€€€€€€Í•ÑÑ¥½¹Y¥Í¥Ñ•¡ÑÉÕ”¤ì4(€€€€€€€€€€€€€€€Ù½¥ÑÉ…­Ù•¹Ğ ‰Í½¥…±}±¥­•ˆ¤ì4(€€€€€€€€€€€€€õô4(€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰‰±½¬Üµ™Õ±°É½Õ¹‘•µlÈÁÁát‰½É‘•È‰½É‘•Èµl˜ÍˆÈÈåt‰œµl˜ÍˆÈÈåtÁà´ÔÁä´ĞÑ•áĞµ•¹Ñ•ÈÑ•áĞµ±œ™½¹ĞµÍ•µ¥‰½±±•…‘¥¹œ´ÜÑ•áĞµlŒÄÄÄàÈİtÍ¡…‘½ÜµlÁ|ÄÉÁá|ÈÉÁá}É‰„ ÈĞÌ°ÄÜà°ĞÄ°À¸Èà¥tˆ4(€€€€€€€€€€€€ø4(€€€€€€€€€€€€€í…Ñ¥½¹1…‰•°¡ÕÉÉ•¹ÑÑ¥½¸¹­¥¹¥ô4(€€€€€€€€€€€€ğ½„ø4(€€€€€€€€€€¤€è¹Õ±±ô4(€€€€€€€€€€ñ‰ÕÑÑ½¸4(€€€€€€€€€€€ÑåÁ”ô‰‰ÕÑÑ½¸ˆ4(€€€€€€€€€€€½¹±¥¬õì ¤€ôøÙ½¥±…Õ¹¡AÉ•Á…É•‘…µ” ¥ô4(€€€€€€€€€€€‘¥Í…‰±•õí¥Í1½…‘¥¹ô4(€€€€€€€€€€€±…ÍÍ9…µ”õì4(€€€€€€€€€€€€€…Ñ¥½¹Y¥Í¥Ñ•4(€€€€€€€€€€€€€€€€ü€‰Üµ™Õ±°É½Õ¹‘•µlÈÁÁát‰œµlŒÄÄÄàÈİtÁà´ÔÁä´ĞÑ•áĞµ±œ™½¹ĞµÍ•µ¥‰½±±•…‘¥¹œ´ÜÑ•áĞµİ¡¥Ñ”Í¡…‘½ÜµlÁ|ÄÉÁá|ÈÑÁá}É‰„ ÄÜ°ÈĞ°Ìä°À¸ÄØ¥t‘¥Í…‰±•é½Á…¥Ñä´ØÀˆ4(€€€€€€€€€€€€€€€€è€…ÕÉÉ•¹ÑÑ¥½¸4(€€€€€€€€€€€€€€€€€€ü€‰Üµ™Õ±°É½Õ¹‘•µlÈÁÁát‰œµlŒÄÄÄàÈİtÁà´ÔÁä´ĞÑ•áĞµá°™½¹ĞµÍ•µ¥‰½±Ñ•áĞµİ¡¥Ñ”Í¡…‘½ÜµlÁ|ÄÉÁá|ÈÑÁá}É‰„ ÄÜ°ÈĞ°Ìä°À¸ÄØ¥t‘¥Í…‰±•é½Á…¥Ñä´ØÀˆ4(€€€€€€€€€€€€€€€€€€è€‰Üµ™Õ±°É½Õ¹‘•µlÄÉÁát‰œµÑÉ…¹ÍÁ…É•¹ĞÁà´ÌÁä´ÈÑ•áĞµÍ´™½¹Ğµµ•‘¥Õ´Ñ•áĞµlŒØÄØàİ…tÕ¹‘•É±¥¹”‘•½É…Ñ¥½¸µlŒÑŒåÑtÕ¹‘•É±¥¹”µ½™™Í•Ğ´ĞÑÉ…¹Í¥Ñ¥½¸¡½Ù•ÈéÑ•áĞµlŒÄÄÄàÈİt‘¥Í…‰±•é½Á…¥Ñä´ØÀˆ4(€€€€€€€€€€€ô4(€€€€€€€€€€ø4(€€€€€€€€€€€í¥Í1½…‘¥¹œ4(€€€€€€€€€€€€€€ü€‰AË¥Á…É…Ñ¥½¸¸¸¸ˆ(€€€€€€€€€€€€€€è…Ñ¥½¹Y¥Í¥Ñ•ñğ€…ÕÉÉ•¹ÑÑ¥½¸4(€€€€€€€€€€€€€€€€ü€‰)½Õ•Èˆ4(€€€€€€€€€€€€€€€€è€‰)½Õ•Èµ…¥¹Ñ•¹…¹Ğ‰ô4(€€€€€€€€€€ğ½‰ÕÑÑ½¸ø4(€€€€€€€€ğ½‘¥Øø4(€€€€€€€í•ÉÉ½È€ü€ 4(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µĞ´ĞÉ½Õ¹‘•µlÄáÁát‰œµl™™˜Å˜ÁtÁà´ĞÁä´ÌÑ•áĞµÍ´Ñ•áĞµlˆĞÈÌÄátˆø4(€€€€€€€€€€€í•ÉÉ½Éô4(€€€€€€€€€€ğ½‘¥Øø4(€€€€€€€€¤€è¹Õ±±ô4(€€€€€€ğ½AÕ‰±¥5½‘…°ø4(4(€€€€€€ñAÕ‰±¥5½‘…°½Á•¸õíÍÑ…”€ôôô€‰½±±•Ğ‰ôø4(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µàµ…ÕÑ¼™±•à ´ÈĞÜ´ÈĞ¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÉ½Õ¹‘•µ™Õ±°‰œµl˜İ˜İ™‰tÑ•áĞ´Ñá°Í¡…‘½ÜµlÁ|ÈÁÁá|ĞÕÁá}É‰„ ÄÜ°ÈĞ°Ìä°À¸ÄÀ¥tˆø4(€€€€€€€€€€ñ¥™Ğ±…ÍÍ9…µ”ô‰ ´ÄÄÜ´ÄÄˆ…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆ€¼ø(€€€€€€€€ğ½‘¥Øø4(€€€€€€€€ñ È±…ÍÍ9…µ”ô‰µĞ´ØÑ•áĞµ•¹Ñ•ÈÑ•áĞµlÉÉ•µt™½¹ĞµÍ•µ¥‰½±±•…‘¥¹œµlÄ¸ÀÕtÑ•áĞµlŒÄÈÄàÈÙtˆø4(€€€€€€€€€í¥ÍAÉ•…µ•1•…‘…ÁÑÕÉ”4(€€€€€€€€€€€€ü€‰Ù…¹Ğ‘”©½Õ•Èˆ4(€€€€€€€€€€€€èÁÉ•Ù¥•İI•ÍÕ±Ğü¹ÁÉ¥é”4(€€€€€€€€€€€€ü¥±¥¥Ñ…Ñ¥½¹Ì€„Y½ÕÌ…Ù•èÉ•µÁ½ÉÓ¤€‘íÁÉ•Ù¥•İI•ÍÕ±Ğ¹ÁÉ¥é”¹±…‰•±õ€4(€€€€€€€€€€€€è€‰5•É¤Á½ÕÈÙ½ÑÉ”Á…ÉÑ¥¥Á…Ñ¥½¸‰ô4(€€€€€€€€ğ½ Èø4(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µĞ´ÔÉ½Õ¹‘•µlÈÉÁát‰œµl˜Ù˜İ™‰tÁà´ÔÁä´ĞÑ•áĞµ‰…Í”±•…‘¥¹œ´ÜÑ•áĞµlŒĞÜÔÀØİtˆø4(€€€€€€€€€í¥ÍAÉ•…µ•1•…‘…ÁÑÕÉ”4(€€€€€€€€€€€€ü€‰M…¥Í¥ÍÍ•èÙ½Ì½½É‘½¹»¥•Ì•Ğ…•ÁÑ•è±”½¹Í•¹Ñ•µ•¹ĞÁ½ÕÈÁ…ÉÑ¥¥Á•È…Ô©•Ô¸ˆ4(€€€€€€€€€€€€èÁÉ•Ù¥•İI•ÍÕ±Ğü¹ÁÉ¥é”4(€€€€€€€€€€€€ü€‰Y½Ì¥¹™½Éµ…Ñ¥½¹ÌÍ½¹Ğ»¥•ÍÍ…¥É•ÌÁ½ÕÈÙ…±¥‘•È•Ğ•¹Ù½å•ÈÙ½ÑÉ”…¥¸¸ˆ4(€€€€€€€€€€€€è€‰1…¥ÍÍ•èÙ½Ì½½É‘½¹»¥•ÌÁ½ÕÈÉ••Ù½¥È±•ÌÁÉ½¡…¥¹•Ì½ÁÁ½ÉÑÕ¹¥Ó¥Ì‘Ô½µµ•É”¸‰ô4(€€€€€€€€ğ½‘¥Øø4(€€€€€€€ì…¥ÍAÉ•…µ•1•…‘…ÁÑÕÉ”€˜˜ÁÉ•Ù¥•İUÍ…•½¹‘¥Ñ¥½¹Ì€ü€ 4(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µĞ´ĞÉ½Õ¹‘•µlÈÉÁát‰œµl™™˜á”átÁà´ÔÁä´ĞÑ•áĞµ±•™ĞÑ•áĞµÍ´±•…‘¥¹œ´ÜÑ•áĞµlŒÙŒÔÌÄÍtˆø4(€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áĞµáÌÕÁÁ•É…Í”ÑÉ…­¥¹œµlÀ¸É•µtÑ•áĞµlŒá„Ù„Äátˆø4(€€€€€€€€€€€€€½¹‘¥Ñ¥½¹Ì™…Á½ÌíÕÑ¥±¥Í…Ñ¥½¸4(€€€€€€€€€€€€ğ½Àø4(€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µĞ´Èİ¡¥Ñ•ÍÁ…”µÁÉ”µ±¥¹”ˆùíÁÉ•Ù¥•İUÍ…•½¹‘¥Ñ¥½¹Íôğ½Àø4(€€€€€€€€€€ğ½‘¥Øø4(€€€€€€€€¤€è¹Õ±±ô4(€€€€€€€€ñ™½É´±…ÍÍ9…µ”ô‰µĞ´ÔÍÁ…”µä´Ğˆ½¹MÕ‰µ¥ĞõíÍÕ‰µ¥Ñ]¥¹¹•É½Éµôø4(€€€€€€€€€€ñ¥¹ÁÕĞ4(€€€€€€€€€€€Ù…±Õ”õí™¥ÉÍÑ9…µ•ô4(€€€€€€€€€€€½¹¡…¹”õì¡•Ù•¹Ğ¤€ôøÍ•Ñ¥ÉÍÑ9…µ”¡•Ù•¹Ğ¹Ñ…É•Ğ¹Ù…±Õ”¥ô4(€€€€€€€€€€€É•ÅÕ¥É•4(€€€€€€€€€€€Á±…•¡½±‘•Èô‰AË¥¹½´ˆ(€€€€€€€€€€€±…ÍÍ9…µ”ô‰Üµ™Õ±°É½Õ¹‘•µlÄáÁát‰½É‘•È‰½É‘•Èµlá‘”ÕtÁà´ĞÁä´ĞÑ•áĞµ±œÑ•áĞµlŒÄÄÄàÈİt½ÕÑ±¥¹”µ¹½¹”Á±…•¡½±‘•ÈéÑ•áĞµlŒäå„ÅˆÉtˆ4(€€€€€€€€€€¼ø4(€€€€€€€€€€ñ±…‰•°±…ÍÍ9…µ”ô‰ÍÈµ½¹±äˆ¡Ñµ±½Èô‰İ¥¹¹•Èµ™¥ÉÍĞµ¹…µ”ˆùAË¥¹½´ğ½±…‰•°ø(4(€€€€€€€€€€ñ¥¹ÁÕĞ4(€€€€€€€€€€€¥ô‰İ¥¹¹•Èµ™¥ÉÍĞµ¹…µ”ˆ4(€€€€€€€€€€€ÑåÁ”ô‰•µ…¥°ˆ4(€€€€€€€€€€€Ù…±Õ”õí•µ…¥±ô4(€€€€€€€€€€€½¹¡…¹”õì¡•Ù•¹Ğ¤€ôøÍ•Ñµ…¥°¡•Ù•¹Ğ¹Ñ…É•Ğ¹Ù…±Õ”¥ô4(€€€€€€€€€€€É•ÅÕ¥É•4(€€€€€€€€€€€Á±…•¡½±‘•Èô‰µµ…¥°ˆ4(€€€€€€€€€€€±…ÍÍ9…µ”ô‰Üµ™Õ±°É½Õ¹‘•µlÄáÁát‰½É‘•È‰½É‘•Èµlá‘”ÕtÁà´ĞÁä´ĞÑ•áĞµ±œÑ•áĞµlŒÄÄÄàÈİt½ÕÑ±¥¹”µ¹½¹”Á±…•¡½±‘•ÈéÑ•áĞµlŒäå„ÅˆÉtˆ4(€€€€€€€€€€¼ø4(€€€€€€€€€€ñ±…‰•°4(€€€€€€€€€€€¡Ñµ±½Èô‰µ…É­•Ñ¥¹œµ½¹Í•¹Ğˆ4(€€€€€€€€€€€±…ÍÍ9…µ”ô‰™±•àÕÉÍ½ÈµÁ½¥¹Ñ•È¥Ñ•µÌµÍÑ…ÉĞ…À´ÌÉ½Õ¹‘•µlÄáÁát‰œµl˜Ù˜İ™‰tÁà´ĞÁä´ÌÑ•áĞµ±•™ĞÑ•áĞµÍ´±•…‘¥¹œ´ØÑ•áĞµlŒĞÜÔÀØİtˆ4(€€€€€€€€€€ø4(€€€€€€€€€€€€ñ¥¹ÁÕĞ4(€€€€€€€€€€€€€¥ô‰µ…É­•Ñ¥¹œµ½¹Í•¹Ğˆ4(€€€€€€€€€€€€€ÑåÁ”ô‰¡•­‰½àˆ4(€€€€€€€€€€€€€É•ÅÕ¥É•õíÉ•ÅÕ¥É•Í½¹Ñ…Ñ…ÁÑÕÉ•ô4(€€€€€€€€€€€€€…É¥„µÉ•ÅÕ¥É•õíÉ•ÅÕ¥É•Í½¹Ñ…Ñ…ÁÑÕÉ•ô4(€€€€€€€€€€€€€¡•­•õíµ…É­•Ñ¥¹½¹Í•¹Ñô4(€€€€€€€€€€€€€½¹¡…¹”õì¡•Ù•¹Ğ¤€ôøÍ•Ñ5…É­•Ñ¥¹½¹Í•¹Ğ¡•Ù•¹Ğ¹Ñ…É•Ğ¹¡•­•¥ô4(€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰µĞ´Ä ´ĞÜ´Ğ…•¹ĞµlŒÄÄÄàÈİtˆ4(€€€€€€€€€€€€¼ø4(€€€€€€€€€€€€ñÍÁ…¸ø4(€€€€€€€€€€€€€(™…Á½Ìí…•ÁÑ”‘”É••Ù½¥È‘•Ì…ÑÕ…±¥Ó¥Ì•Ğ½™™É•Ì‘”±„Á…ÉĞ‘”•Ğƒ¥Ñ…‰±¥ÍÍ•µ•¹Ğ¸(€€€€€€€€€€€€ğ½ÍÁ…¸ø4(€€€€€€€€€€ğ½±…‰•°ø4(4(€€€€€€€€€í•ÉÉ½È€ü€ 4(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰É½Õ¹‘•µlÄáÁát‰œµl™™˜Å˜ÁtÁà´ĞÁä´ÌÑ•áĞµÍ´Ñ•áĞµlˆĞÈÌÄátˆø4(€€€€€€€€€€€€€í•ÉÉ½Éô4(€€€€€€€€€€€€ğ½‘¥Øø4(€€€€€€€€€€¤€è¹Õ±±ô4(4(€€€€€€€€€€ñ‰ÕÑÑ½¸4(€€€€€€€€€€€ÑåÁ”ô‰ÍÕ‰µ¥Ğˆ4(€€€€€€€€€€€‘¥Í…‰±•õí¥Í1½…‘¥¹ô4(€€€€€€€€€€€±…ÍÍ9…µ”ô‰Üµ™Õ±°É½Õ¹‘•µlÄáÁát‰œµlŒÄÄÄàÈİtÁà´ÔÁä´ĞÑ•áĞµ±œ™½¹ĞµÍ•µ¥‰½±Ñ•áĞµİ¡¥Ñ”‘¥Í…‰±•é½Á…¥Ñä´ØÀˆ4(€€€€€€€€€€ø4(€€€€€€€€€€€í¥Í1½…‘¥¹œ4(€€€€€€€€€€€€€€ü¥ÍAÉ•…µ•1•…‘…ÁÑÕÉ”4(€€€€€€€€€€€€€€€€ü€‰AË¥Á…É…Ñ¥½¸¸¸¸ˆ4(€€€€€€€€€€€€€€€€è€‰¹É•¥ÍÑÉ•µ•¹Ğ¸¸¸ˆ4(€€€€€€€€€€€€€€è¥ÍAÉ•…µ•1•…‘…ÁÑÕÉ”4(€€€€€€€€€€€€€€€€ü€‰½¹Ñ¥¹Õ•ÈÙ•ÉÌ±”©•Ôˆ4(€€€€€€€€€€€€€€€€è€‰¹É•¥ÍÑÉ•È‰ô4(€€€€€€€€€€ğ½‰ÕÑÑ½¸ø4(€€€€€€€€ğ½™½É´ø4(€€€€€€ğ½AÕ‰±¥5½‘…°ø4(4(€€€€€€ñAÕ‰±¥5½‘…°½Á•¸õíÍÑ…”€ôôô€‰ÍÕ•ÍÌˆ€˜˜	½½±•…¸¡‘É…İI•ÍÕ±Ğ¥ô½µÁ…Ğø4(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ñ•áĞµ•¹Ñ•Èˆø4(€€€€€€€€€€ñ È±…ÍÍ9…µ”ô‰Ñ•áĞµlÄ¸ÜÕÉ•µt™½¹ĞµÍ•µ¥‰½±±•…‘¥¹œµlÄ¸ÀÕtÑ•áĞµlŒÄÈÄàÈÙtˆø4(€€€€€€€€€€€5•É¤Á½ÕÈÙ½ÑÉ”Á…ÉÑ¥¥Á…Ñ¥½¸€„4(€€€€€€€€€€ğ½ Èø4(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µàµ…ÕÑ¼µĞ´Ğ™±•à ´ÄØÜ´ÄØ¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÉ½Õ¹‘•µ™Õ±°‰œµl˜İ˜İ™‰tÑ•áĞ´Ñá°Í¡…‘½ÜµlÁ|ÄÙÁá|ÌÑÁá}É‰„ ÄÜ°ÈĞ°Ìä°À¸ÄÀ¥tˆø4(€€€€€€€€€€€€ñ5…¥°±…ÍÍ9…µ”ô‰ ´àÜ´àˆ…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆ€¼ø(€€€€€€€€€€ğ½‘¥Øø4(€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µĞ´ĞÑ•áĞµ±œ±•…‘¥¹œ´ÜÑ•áĞµlŒÅ„É˜ÜÙtˆø4(€€€€€€€€€€€í¥Í½¹Ñ…Ñ=¹±åMÕ•ÍÌ4(€€€€€€€€€€€€€€ü€‰Y½ÑÉ”½¹Ñ…Ğ•ÍĞ‰¥•¸•¹É•¥ÍÑË¤¸ˆ(€€€€€€€€€€€€€€è€‰Y½ÕÌÉ••ÙÉ•èÙ½ÑÉ”…¥¸Á…È”µµ…¥°…Ù•Œ±•Ì¥¹™½Éµ…Ñ¥½¹Ì‘”É•ÑÉ…¥Ğ‰ô4(€€€€€€€€€€ğ½Àø4(€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µĞ´ÌÑ•áĞµÍ´±•…‘¥¹œ´ØÑ•áĞµlŒØÄØàİ…tˆø4(€€€€€€€€€€€í¥Í½¹Ñ…Ñ=¹±åMÕ•ÍÌ4(€€€€€€€€€€€€€€ü€‰5•É¤Á½ÕÈÙ½ÑÉ”½¹™¥…¹”¸ˆ4(€€€€€€€€€€€€€€è€‰½¹Í•ÉÙ•è”EH½‘”Á½ÕÈÉ•Ñ¥É•ÈÙ½ÑÉ”…¥¸¸M¤³Še”µµ…¥°Ñ…É‘”ƒ€…ÉÉ¥Ù•È°Û¥É¥™¥•èÙ½ÌÍÁ…µÌ¸‰ô(€€€€€€€€€€ğ½Àø4(4(€€€€€€€€€í‘É…İI•ÍÕ±Ğü¹ÁÉ¥é”€ü€ñ‘¥Ø±…ÍÍ9…µ”ô‰µĞ´ĞÉ½Õ¹‘•µlÄáÁát‰œµl™™˜Ñ‰tÁà´ĞÁä´ÌÑ•áĞµ±•™ĞÑ•áĞµÍ´±•…‘¥¹œ´ØÑ•áĞµlŒÑÌàÄÁtˆø4(€€€€€€€€€€€€ñÀø4(€€€€€€€€€€€€€Y½ÕÌ…Ù•è•¹ÑÉ”±”í…Ù…¥±…‰±•…Ñ”€üü€‰µ…¥¹Ñ•¹…¹Ğ‰ô•Ğ±”í•áÁ¥Éå…Ñ”€üü€‰‰¥•¹ÓÑĞ‰õìˆ€‰ô(€€€€€€€€€€€€€Á½ÕÈÙ•¹¥È±”Ë¥ÕÃ¥É•È¸(€€€€€€€€€€€€ğ½Àø4(€€€€€€€€€€ğ½‘¥Øø€è¹Õ±±ô4(4(€€€€€€€€€í‘É…İI•ÍÕ±Ğü¹ÁÉ¥é”€˜˜…µÁ…¥¸¹É•İ…É‘IÕ±•Ì¹ÁÕÉ¡…Í•I•ÅÕ¥É•€ü€ 4(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µĞ´ÌÉ½Õ¹‘•µlÄáÁát‰œµl˜İ˜İ™‰tÁà´ĞÁä´ÌÑ•áĞµ±•™ĞÑ•áĞµÍ´±•…‘¥¹œ´ØÑ•áĞµlŒØÄØàİ…tˆø4(€€€€€€€€€€€€€1”É•ÑÉ…¥Ğ‘Ô±½Ğ•ÍĞÍ½Õµ¥Ìƒ€Õ¹”½¹‘¥Ñ¥½¸“Še…¡…Ğ¸(€€€€€€€€€€€€ğ½‘¥Øø4(€€€€€€€€€€¤€è¹Õ±±ô4(4(€€€€€€€€€í‘É…İI•ÍÕ±Ğü¹ÁÉ¥é”€˜˜É•Í½±Ù•‘UÍ…•½¹‘¥Ñ¥½¹Ì€ü€ 4(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µĞ´ÌÉ½Õ¹‘•µlÄáÁát‰œµl™™˜Ñ‰tÁà´ĞÁä´ÌÑ•áĞµ±•™ĞÑ•áĞµÍ´±•…‘¥¹œ´ØÑ•áĞµlŒÑÌàÄÁtˆø4(€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áĞµáÌÕÁÁ•É…Í”ÑÉ…­¥¹œµlÀ¸É•µtÑ•áĞµlŒá„Ù„Äátˆø4(€€€€€€€€€€€€€€€½¹‘¥Ñ¥½¹Ì™…Á½ÌíÕÑ¥±¥Í…Ñ¥½¸4(€€€€€€€€€€€€€€ğ½Àø4(€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µĞ´Èİ¡¥Ñ•ÍÁ…”µÁÉ”µ±¥¹”ˆùíÉ•Í½±Ù•‘UÍ…•½¹‘¥Ñ¥½¹Íôğ½Àø4(€€€€€€€€€€€€ğ½‘¥Øø4(€€€€€€€€€€¤€è¹Õ±±ô4(4(€€€€€€€€€íÉ•‘•µÁÑ¥½¹½‘”€ü€ 4(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µĞ´ĞÉ½Õ¹‘•µlÈÁÁát‰½É‘•È‰½É‘•Èµl”Õ”İ•™t‰œµl™…™‰™™tÀ´Ìˆø4(€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áĞµáÌÕÁÁ•É…Í”ÑÉ…­¥¹œµlÀ¸ÈÑ•µtÑ•áĞµlŒáˆäÍ„Õtˆù½‘”‘”É•ÑÉ…¥Ğğ½Àø4(€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µĞ´ÄÑ•áĞµá°™½¹ĞµÍ•µ¥‰½±Ñ•áĞµlŒÄÈÄàÈÙtˆùíÉ•‘•µÁÑ¥½¹½‘•ôğ½Àø4(€€€€€€€€€€€€€íÅÉA…Ñ €ü€ 4(€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µĞ´Ì™±•à¥Ñ•µÌµ•¹Ñ•È…À´ÌÉ½Õ¹‘•µlÄÙÁát‰œµİ¡¥Ñ”À´È¸ÔÑ•áĞµ±•™Ğˆø4(€€€€€€€€€€€€€€€€€€ñ%µ…”4(€€€€€€€€€€€€€€€€€€€ÍÉŒõíÅÉA…Ñ¡ô4(€€€€€€€€€€€€€€€€€€€…±ĞõíEH½‘”€‘íÉ•‘•µÁÑ¥½¹½‘•õô4(€€€€€€€€€€€€€€€€€€€İ¥‘Ñ õìàÁô4(€€€€€€€€€€€€€€€€€€€¡•¥¡ĞõìàÁô4(€€€€€€€€€€€€€€€€€€€Õ¹½ÁÑ¥µ¥é•4(€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰ ´ÈÀÜ´ÈÀÉ½Õ¹‘•µlÄÉÁátˆ4(€€€€€€€€€€€€€€€€€€¼ø4(€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µ¥¸µÜ´À™±•à´Äˆø4(€€€€€€€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áĞµáÌ±•…‘¥¹œ´ÔÑ•áĞµlŒØÄØàİ…tˆø4(€€€€€€€€€€€€€€€€€€€€€¹É•¥ÍÑÉ•èµ±”Á½ÕÈ±”É•ÑÉ½ÕÙ•È™…¥±•µ•¹Ğ¸4(€€€€€€€€€€€€€€€€€€€€ğ½Àø4(€€€€€€€€€€€€€€€€€€€€ñ„4(€€€€€€€€€€€€€€€€€€€€€¡É•˜õíÅÉA…Ñ¡ô4(€€€€€€€€€€€€€€€€€€€€€‘½İ¹±½…õíÅÈµ±½Ğ´‘íÉ•‘•µÁÑ¥½¹½‘•ô¹ÍÙô4(€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰µĞ´È¥¹±¥¹”µ™±•àÉ½Õ¹‘•µlÄÉÁát‰œµlŒÄÄÄàÈİtÁà´ÌÁä´ÈÑ•áĞµáÌ™½¹ĞµÍ•µ¥‰½±€…Ñ•áĞµİ¡¥Ñ”ˆ4(€€€€€€€€€€€€€€€€€€€€ø4(€€€€€€€€€€€€€€€€€€€€€¹É•¥ÍÑÉ•È4(€€€€€€€€€€€€€€€€€€€€ğ½„ø4(€€€€€€€€€€€€€€€€€€ğ½‘¥Øø4(€€€€€€€€€€€€€€€€ğ½‘¥Øø4(€€€€€€€€€€€€€€¤€è¹Õ±±ô4(€€€€€€€€€€€€ğ½‘¥Øø4(€€€€€€€€€€¤€è¹Õ±±ô4(€€€€€€€€ğ½‘¥Øø4(€€€€€€ğ½AÕ‰±¥5½‘…°ø4(€€€€ğ½‘¥Øø4(€€¤ì4)ô4(4(