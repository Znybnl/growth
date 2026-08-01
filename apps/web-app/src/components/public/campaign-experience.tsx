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
              Article 8 - Lots, stocks disponibles et probabilitÃ©s de gain
            </h3>
            <p className="mt-2">
              Les gains sont attribuÃ©s dans la limite des quantitÃ©s de stock disponibles au
              moment de la participation. Lorsqu&apos;un lot n&apos;est plus disponible, il ne peut
              plus Ãªtre attribuÃ©, mÃªme si sa probabilitÃ© de gain est indiquÃ©e ci-dessous.
            </p>
  ïo6¶‰ËkºwµçXY[™Ñ›ÛÛ\ÜÏ^ÚXY[™Ñ›ÛÛ\ÜßBˆXY[™Ñ›ÛÚ^™O^ÚXY[™Ñ›ÛÚ^™_BˆXY[™Ñ›ÛÙZYÚ^ØØ[\ZYÛ‹œ™\Ù[][Û‹šXY[™Ë™›ÛÙZYÚÏÈŒBˆXY[™Ğ[YÛ›Y[Û\ÜÏ^ÚXY[™Ğ[YÛ›Y[Û\ÜßBˆÙÛĞ[YÛ›Y[Û\ÜÏ^ÛÙÛĞ[YÛ›Y[Û\ÜßBˆÙÛĞ›İÛTÜXÚ[™Ô^ØØ[\ZYÛ‹œ™\Ù[][Û‹›ÙÛË›X\™Ú[›İÛTBˆÙÛÕÚY^ÛÙÛÕÚYBˆÙÛÕ^Ú^™T^ÛÙÛÕ^Ú^™TBˆ[\]O^ÜYÙU[\]H\ÈœØÜ˜]Ú]˜][ˆœØÜ˜]ÚXÛÛ™™]HˆœØÜ˜]ÚXÛÜ˜[ˆœØÜ˜]Ú[[XÈˆœØÜ˜]Ú\İ[˜\œİŸBˆÏ‚ˆ
Hˆ
ˆØÜ˜]ÚØ[YBˆÙ^O^Ø	ØØ[\ZYÛ‹šYKIÙ˜]ÔÙ\ÜÚ[ÛËšYÏÈšYHŸXBˆXØÙ[^ÜØÜ˜]ÚXØÙ[Bˆ™\İ[X™[^ÜØÜ˜]ÚX™[Bˆ[˜X›Y^ÜİYÙHOOHœ™XYHŸBˆÛ”™]™X[^Ê
HOˆ›ÚY[™QØ[YT™]™X[

_BˆÏ‚‚ˆ
_BˆÙ]‚ˆ
_B‚ˆÜÚİĞ›İÛTİ]HÈ]ˆÛ\ÜÓ˜[YOH›]NÜXÙK^KM‚ˆÜİYÙHOOHšYHˆ	‰ˆØ[\ZYÛ‹™Ø[YU\HOOHÚY[ˆÈ
ˆ]Û‚ˆ\OH˜]Ûˆ‚ˆÛÛXÚÏ^ÛÜ[Xİ[Û[™˜XÚßBˆÛ\ÜÓ˜[YOH›^X]]È›ØÚÈËY[X^]ËVÌÍŒH›İ[™YVÌH›Ü™\ˆMˆKM^[È›Û\Ù[ZX›ÛÚYİËVÌÌŒœÌÍÜ™Ø˜JMËÎKŒ
WH‚ˆİ[O^ŞÂˆ˜XÚÙÜ›İ[™ÛÛÜˆØ[\ZYÛ‹œ™\Ù[][Û‹˜]Û‹˜˜XÚÙÜ›İ[™ÛÛÜ‹ˆÛÛÜˆØ[\ZYÛ‹œ™\Ù[][Û‹˜]Û‹^ÛÛÜ‹ˆ›Ü™\ÛÛÜˆØ[\ZYÛ‹œ™\Ù[][Û‹˜]Û‹˜›Ü™\ÛÛÜ‹ˆ›ÛÚ^™Nˆ]Û‘›ÛÚ^™Kˆ_Bˆ‚ˆÜX›XĞİSX™[BˆØ]Û‚ˆ
Hˆ[B‚ˆÜİYÙHOOHœ™XYHˆ	‰ˆØ[\ZYÛ‹™Ø[YU\HOOHÚY[ˆÈ
ˆ]ˆÛ\ÜÓ˜[YOHœ›İ[™YVÌH›Ü™\ˆ›Ü™\‹]Ú]KÍÌ™Ë]Ú]KÍÌˆMHKM^XÙ[\ˆ^\ÛH^VÈÍŒMØWHÚYİËVÌÌNÍÜ™Ø˜JMËÎKŒŠWH˜XÚÙ›ÜX›\ˆ‚ˆÜ˜]^ˆHXÚÙ]İ\ˆ°ê]°ê[\ˆ[[pêYX][Y[›İ™H°ê\İ[]‚ˆÙ]‚ˆ
Hˆ[B‚ˆÙ˜[ÙHÈ
ˆ]ˆÛ\ÜÓ˜[YOHœ›İ[™YVÌÌœH›Ü™\ˆ›Ü™\‹]Ú]KÎ™Ë]Ú]KÎMˆ^XÙ[\ˆÚYİËVÌÌÍÜ™Ø˜JMËÎKŒ
WH˜XÚÙ›ÜX›\ˆ‚ˆ]ˆÛ\ÜÓ˜[YOH›^X]]È›^LŒËLŒ][\ËXÙ[\ˆ\İYKXÙ[\ˆ›İ[™YY[™ËVÈÙŒÙH^LŞ‚ˆŠˆÙ]‚ˆˆÛ\ÜÓ˜[YOH›]MH^LŞ›Û\Ù[ZX›Û^VÈÌMN—H”\™HŠÚ‚ˆÛ\ÜÓ˜[YOH›]LÈ^X˜\ÙHXY[™ËMÈ^VÈÍŒMØWH‚ˆY\˜ÚHİ\ˆ›İ™H\XÚ\][Û‹ˆ™]™[™^ˆšY[0íİ\ˆ[™H›İ]™[HÚ[˜ÙK‚ˆÜ‚ˆÙ]‚ˆ
Hˆ[BˆÙ]ˆˆ[BˆÙ]‚‚ˆ]Û‚ˆ\OH˜]Ûˆ‚ˆÛÛXÚÏ^Ê
HOˆÙ][\ÓÜ[ŠYJ_BˆÛ\ÜÓ˜[YOH™š^Y›İÛKMšYÚM‹LŒ›İ[™YY[›Ü™\ˆ›Ü™\‹]Ú]KÍÌ™Ë]Ú]KÎˆMKLˆ^\ÛH›Û\Ù[ZX›Û^VÈÌLLN×HÚYİËVÌÌMÌÍÜ™Ø˜JMËÎKŒLŠWH˜XÚÙ›ÜX›\ˆ‚ˆ‚ˆ°êÛ[Y[ˆØ]Û‚‚ˆ[\Ó[Ù[Ø[\ZYÛ^ØØ[\ZYÛŸHÜ[^Ü[\ÓÜ[ŸHÛÛÜÙO^Ê
HOˆÙ][\ÓÜ[Š˜[ÙJ_HÏ‚‚ˆX›XÓ[Ù[Ü[^ÜİYÙHOOH›ÜİŸO‚ˆ]ˆÛ\ÜÓ˜[YOH›^X]]È›^LŒËLŒ][\ËXÙ[\ˆ\İYKXÙ[\ˆ›İ[™YY[™ËVÈÙŒÙH^LŞ›Û\Ù[ZX›Û^VÈÌMN—HÚYİËVÌÌŒÍ\Ü™Ø˜JMËÎKŒL
WH‚ˆBˆÙ]‚ˆˆÛ\ÜÓ˜[YOH›]Mˆ^XÙ[\ˆ^VÌœ™[WH›Û\Ù[ZX›ÛXY[™ËVÌKŒWH^VÈÌLŒN—H‚ˆ\™BˆÚ‚ˆÛ\ÜÓ˜[YOH›]M^XÙ[\ˆ^[ÈXY[™ËN^VÈÍYÎH‚ˆY\˜ÚHİ\ˆ›İ™H\XÚ\][Û‹ˆ™]™[™^ˆšY[0íİ\ˆ[™H›İ]™[HÚ[˜ÙK‚ˆÜ‚ˆÔX›XÓ[Ù[‚‚ˆX›XÓ[Ù[Ü[^ÜİYÙHOOH˜›ØÚÙYŸO‚ˆ]ˆÛ\ÜÓ˜[YOH›^X]]È›^LŒËLŒ][\ËXÙ[\ˆ\İYKXÙ[\ˆ›İ[™YY[™ËVÈÙŒÙH^LŞ›Û\Ù[ZX›Û^VÈÌMN—HÚYİËVÌÌŒÍ\Ü™Ø˜JMËÎKŒL
WH‚ˆBˆÙ]‚ˆˆÛ\ÜÓ˜[YOH›]Mˆ^XÙ[\ˆ^VÌœ™[WH›Û\Ù[ZX›ÛXY[™ËVÌKŒWH^VÈÌLŒN—H‚ˆ\XÚ\][Ûˆ0êZ°è[œ™YÚ\İ°êYBˆÚ‚ˆÛ\ÜÓ˜[YOH›]M^XÙ[\ˆ^[ÈXY[™ËN^VÈÍYÎH‚ˆØ›ØÚÙYY\ÜØYÙ_BˆÜ‚ˆ]Û‚ˆ\OH˜]Ûˆ‚ˆÛÛXÚÏ^Ê
HOˆÙ]İYÙJšYHŠ_BˆÛ\ÜÓ˜[YOH›]MˆËY[›İ[™YVÌŒH™ËVÈÌLLN×HMHKM^[È›Û\Ù[ZX›Û^]Ú]HÚYİËVÌÌLœÌÜ™Ø˜JMËÎKŒMŠWH‚ˆ‚ˆÛÛ\š\ÂˆØ]Û‚ˆÔX›XÓ[Ù[‚‚ˆX›XÓ[Ù[Ü[^ÜİYÙHOOHš[›ÈŸO‚ˆ]ˆÛ\ÜÓ˜[YOH›^X]]È›^LËL][\ËXÙ[\ˆ\İYKXÙ[\ˆ›İ[™YY[™ËVÈÙÙÙ˜—H^M›Û\Ù[ZX›Û^VÈÌXL™Í—HÚYİËVÌÌŒÍ\Ü™Ø˜JMËÎKŒL
WH‚ˆØXİ[Û’XÛÛŠİ\œ™[Xİ[ÛËšÚ[™
_BˆÙ]‚ˆˆÛ\ÜÓ˜[YOH›]Mˆ^XÙ[\ˆ^VÌœ™[WH›Û\Ù[ZX›ÛXY[™ËVÌKŒWH^VÈÌLŒN—H‚ˆØİ\œ™[Xİ[ÛˆÈ]˜[H›İY\ˆˆˆ”°ê0è›İY\ˆÈŸBˆÚ‚ˆÛ\ÜÓ˜[YOH›]M^XÙ[\ˆ^[ÈXY[™ËN^VÈÍYÎH‚ˆØİ\œ™[Xİ[ÛËšÚ[™OOH™ÛÛÙÛH‚ˆÈ“Z\ÜÙ^‹[›İ\È[ˆ]š\È]™]™[™^ˆXÚHİ\ˆ›İY\‹ˆ‚ˆˆİ\œ™[Xİ[ÛËšÚ[™OOHš[œİYÜ˜[H‚ˆÈ”İZ]™^‹[›İ\Èİ\ˆ[œİYÜ˜[Hİ\ˆ0êXÛİ]œš\ˆ\È›İ]™X]]0ê\ÈHÛÛ[Y\˜ÙKZ\È™]™[™^ˆXÚHİ\ˆ›İY\‹ˆ‚ˆˆİ\œ™[Xİ[Û‚ˆÈ‘0êXÛİ]œ™^ˆHY[ˆHÛÛ[Y\˜ÙH[œÈ[ˆ›İ]™[Û™Û]Z\È™]™[™^ˆXÚHİ\ˆ›İY\‹ˆ‚ˆˆ•İXÚ^ˆ›İY\ˆİ\ˆ°ê\\™\ˆ›İ™H\YH]0êXÛİ]œš\ˆ›İ™H°ê\İ[]ˆŸBˆÜ‚ˆ]ˆÛ\ÜÓ˜[YOH›]MˆÜXÙK^KLÈ‚ˆØİ\œ™[Xİ[ÛˆÈ
ˆBˆ™Y^Øİ\œ™[Xİ[Û‹\›Bˆ\™Ù]H—Ø›[šÈ‚ˆ™[H››Ü™Y™\œ™\ˆ‚ˆÛÛXÚÏ^Ê
HOˆÂˆYˆ
İ\œ™[Xİ[Û‹šÚ[™OOH™ÛÛÙÛHŠHÂˆÙ]Xİ[Û•š\Ú]Y
YJNÂˆ›ÚY˜XÚÑ]™[
œ™]šY]×ØÛXÚÙYŠNÂˆ™]\›ÂˆB‚ˆÙ]Xİ[Û•š\Ú]Y
YJNÂˆ›ÚY˜XÚÑ]™[
œÛØÚX[ØÛXÚÙYŠNÂˆ_BˆÛ\ÜÓ˜[YOH˜›ØÚÈËY[›İ[™YVÌŒH›Ü™\ˆ›Ü™\‹VÈÙŒØŒŒWH™ËVÈÙŒØŒŒWHMHKM^XÙ[\ˆ^[È›Û\Ù[ZX›ÛXY[™ËMÈ^VÈÌLLN×HÚYİËVÌÌLœÌŒœÜ™Ø˜JËMÎKŒ
WH‚ˆ‚ˆØXİ[Û“X™[
İ\œ™[Xİ[Û‹šÚ[™
_BˆØO‚ˆ
Hˆ[Bˆ]Û‚ˆ\OH˜]Ûˆ‚ˆÛÛXÚÏ^Ê
HOˆ›ÚY][˜Ú™\\™YØ[YJ
_Bˆ\ØX›Y^Ú\ÓØY[™ßBˆÛ\ÜÓ˜[YO^ÂˆXİ[Û•š\Ú]YˆÈËY[›İ[™YVÌŒH›Ü™\‹L™ËVÈÌLLN×HMHKM^[È›Û\Ù[ZX›ÛXY[™ËMÈ^]Ú]HÚYİËVÌÌLœÌÜ™Ø˜JMËÎKŒMŠWH\ØX›Y›ÜXÚ]KMŒ‚ˆˆXİ\œ™[Xİ[Û‚ˆÈËY[›İ[™YVÌŒH›Ü™\‹L™ËVÈÌLLN×HMHKM^^›Û\Ù[ZX›Û^]Ú]HÚYİËVÌÌLœÌÜ™Ø˜JMËÎKŒMŠWH\ØX›Y›ÜXÚ]KMŒ‚ˆˆËY[›İ[™YVÌLœH›Ü™\‹L™Ë]˜[œÜ\™[LÈKLˆ^\ÛH›Û[YY][H^VÈÍŒMØWH[™\›[™HXÛÜ˜][Û‹VÈØÍÎYH[™\›[™K[Ù™œÙ]M˜[œÚ][Ûˆİ™\^VÈÌLLN×H\ØX›Y›ÜXÚ]KMŒ‚ˆBˆ‚ˆÚ\ÓØY[™ÂˆÈ”°ê\\˜][Û‹‹‹ˆ‚ˆˆXİ[Û•š\Ú]YXİ\œ™[Xİ[Û‚ˆÈ’›İY\ˆ‚ˆˆ’›İY\ˆXZ[[˜[ŸBˆØ]Û‚ˆÙ]‚ˆÙ\œ›ÜˆÈ
ˆ]ˆÛ\ÜÓ˜[YOH›]M›İ[™YVÌNH™ËVÈÙ™™ŒYŒHMKLÈ^\ÛH^VÈØŒÌNH‚ˆÙ\œ›ÜŸBˆÙ]‚ˆ
Hˆ[BˆÔX›XÓ[Ù[‚‚ˆX›XÓ[Ù[Ü[^ÜİYÙHOOH˜ÛÛXİŸO‚ˆ]ˆÛ\ÜÓ˜[YOH›^X]]È›^LËL][\ËXÙ[\ˆ\İYKXÙ[\ˆ›İ[™YY[™ËVÈÙÙÙ˜—H^MÚYİËVÌÌŒÍ\Ü™Ø˜JMËÎKŒL
WH‚ˆÚYÛ\ÜÓ˜[YOHšLLHËLLHˆ\šXKZY[HYHˆÏ‚ˆÙ]‚ˆˆÛ\ÜÓ˜[YOH›]Mˆ^XÙ[\ˆ^VÌœ™[WH›Û\Ù[ZX›ÛXY[™ËVÌKŒWH^VÈÌLŒN—H‚ˆÚ\Ô™QØ[YSXYØ\\™BˆÈ]˜[H›İY\ˆ‚ˆˆ™]šY]Ô™\İ[Ëœš^™BˆÈ°ê[XÚ]][ÛœÈH›İ\È]™^ˆ™[\Ü0êH	Ü™]šY]Ô™\İ[œš^™K›X™[Xˆˆ“Y\˜ÚHİ\ˆ›İ™H\XÚ\][ÛˆŸBˆÚ‚ˆ]ˆÛ\ÜÓ˜[YOH›]MH›İ[™YVÌŒœH™ËVÈÙ™Ù˜—HMHKM^X˜\ÙHXY[™ËMÈ^VÈÍÍL×H‚ˆÚ\Ô™QØ[YSXYØ\\™BˆÈ”ØZ\Ú\ÜÙ^ˆ›ÜÈÛÛÜ™Û›°êY\È]XØÙ\^ˆHÛÛœÙ[[Y[İ\ˆ\XÚ\\ˆ]H™]Kˆ‚ˆˆ™]šY]Ô™\İ[Ëœš^™BˆÈ•›ÜÈ[™›Ü›X][ÛœÈÛÛ°êXÙ\ÜØZ\™\Èİ\ˆ˜[Y\ˆ][›ŞY\ˆ›İ™HØZ[‹ˆ‚ˆˆ“Z\ÜÙ^ˆ›ÜÈÛÛÜ™Û›°êY\Èİ\ˆ™XÙ]›Ú\ˆ\È›ØÚZ[™\ÈÜÜ[š]0ê\ÈHÛÛ[Y\˜ÙKˆŸBˆÙ]‚ˆÈZ\Ô™QØ[YSXYØ\\™H	‰ˆ™]šY]Õ\ØYÙPÛÛ™][ÛœÈÈ
ˆ]ˆÛ\ÜÓ˜[YOH›]M›İ[™YVÌŒœH™ËVÈÙ™™NHMHKM^[Y^\ÛHXY[™ËMÈ^VÈÍ˜ÍLÌL×H‚ˆÛ\ÜÓ˜[YOH^^È\\˜Ø\ÙH˜XÚÚ[™ËVÌŒ™[WH^VÈÎM˜LNH‚ˆÛÛ™][ÛœÈ	˜\ÜÎİ][\Ø][Û‚ˆÜ‚ˆÛ\ÜÓ˜[YOH›]LˆÚ]\ÜXÙK\™K[[™HÜ™]šY]Õ\ØYÙPÛÛ™][ÛœßOÜ‚ˆÙ]‚ˆ
Hˆ[Bˆ›Ü›HÛ\ÜÓ˜[YOH›]MHÜXÙK^KMˆÛ”İX›Z]^ÜİX›Z]Ú[›™\‘›Ü›_O‚ˆ[œ]ˆ˜[YO^Ùš\œİ˜[Y_BˆÛÚ[™ÙO^Ê]™[
HOˆÙ]š\œİ˜[YJ]™[\™Ù]˜[YJ_Bˆ™\]Z\™YˆXÙZÛ\H”°ê[›ÛH‚ˆÛ\ÜÓ˜[YOHËY[›İ[™YVÌNH›Ü™\ˆ›Ü™\‹VÈÙÙMWHMKM^[È^VÈÌLLN×Hİ][™K[›Û™HXÙZÛ\^VÈÎNXLXŒ—H‚ˆÏ‚ˆX™[Û\ÜÓ˜[YOHœÜ‹[Û›Hˆ[›ÜHÚ[›™\‹Yš\œİ[˜[YH”°ê[›ÛOÛX™[‚‚ˆ[œ]ˆYHÚ[›™\‹Yš\œİ[˜[YH‚ˆ\OH™[XZ[‚ˆ˜[YO^Ù[XZ[BˆÛÚ[™ÙO^Ê]™[
HOˆÙ][XZ[
]™[\™Ù]˜[YJ_Bˆ™\]Z\™YˆXÙZÛ\H‘K[XZ[‚ˆÛ\ÜÓ˜[YOHËY[›İ[™YVÌNH›Ü™\ˆ›Ü™\‹VÈÙÙMWHMKM^[È^VÈÌLLN×Hİ][™K[›Û™HXÙZÛ\^VÈÎNXLXŒ—H‚ˆÏ‚ˆX™[ˆ[›ÜH›X\šÙ][™ËXÛÛœÙ[‚ˆÛ\ÜÓ˜[YOH™›^İ\œÛÜ‹\Ú[\ˆ][\Ë\İ\Ø\LÈ›İ[™YVÌNH™ËVÈÙ™Ù˜—HMKLÈ^[Y^\ÛHXY[™ËMˆ^VÈÍÍL×H‚ˆ‚ˆ[œ]ˆYH›X\šÙ][™ËXÛÛœÙ[‚ˆ\OH˜ÚXÚØ›Ş‚ˆ™\]Z\™Y^Ü™\]Z\™\ĞÛÛXİØ\\™_Bˆ\šXK\™\]Z\™Y^Ü™\]Z\™\ĞÛÛXİØ\\™_BˆÚXÚÙY^ÛX\šÙ][™ĞÛÛœÙ[BˆÛÚ[™ÙO^Ê]™[
HOˆÙ]X\šÙ][™ĞÛÛœÙ[
]™[\™Ù]˜ÚXÚÙY
_BˆÛ\ÜÓ˜[YOH›]LHMËMXØÙ[VÈÌLLN×H‚ˆÏ‚ˆÜ[‚ˆ‰˜\ÜÎØXØÙ\HH™XÙ]›Ú\ˆ\ÈXİX[]0ê\È]Ù™œ™\ÈHH\HÙ]0ê]X›\ÜÙ[Y[‚ˆÜÜ[‚ˆÛX™[‚‚ˆÙ\œ›ÜˆÈ
ˆ]ˆÛ\ÜÓ˜[YOHœ›İ[™YVÌNH™ËVÈÙ™™ŒYŒHMKLÈ^\ÛH^VÈØŒÌNH‚ˆÙ\œ›ÜŸBˆÙ]‚ˆ
Hˆ[B‚ˆ]Û‚ˆ\OHœİX›Z]‚ˆ\ØX›Y^Ú\ÓØY[™ßBˆÛ\ÜÓ˜[YOHËY[›İ[™YVÌNH™ËVÈÌLLN×HMHKM^[È›Û\Ù[ZX›Û^]Ú]H\ØX›Y›ÜXÚ]KMŒ‚ˆ‚ˆÚ\ÓØY[™ÂˆÈ\Ô™QØ[YSXYØ\\™BˆÈ”°ê\\˜][Û‹‹‹ˆ‚ˆˆ‘[œ™YÚ\İ™[Y[‹‹ˆ‚ˆˆ\Ô™QØ[YSXYØ\\™BˆÈÛÛ[Y\ˆ™\œÈH™]H‚ˆˆ‘[œ™YÚ\İ™\ˆŸBˆØ]Û‚ˆÙ›Ü›O‚ˆÔX›XÓ[Ù[‚‚ˆX›XÓ[Ù[Ü[^ÜİYÙHOOHœİXØÙ\ÜÈˆ	‰ˆ›ÛÛX[Š˜]Ô™\İ[
_HÛÛ\Xİ‚ˆ]ˆÛ\ÜÓ˜[YOH^XÙ[\ˆ‚ˆˆÛ\ÜÓ˜[YOH^VÌKÍ\™[WH›Û\Ù[ZX›ÛXY[™ËVÌKŒWH^VÈÌLŒN—H‚ˆY\˜ÚHİ\ˆ›İ™H\XÚ\][ÛˆBˆÚ‚ˆ]ˆÛ\ÜÓ˜[YOH›^X]]È]M›^LMˆËLMˆ][\ËXÙ[\ˆ\İYKXÙ[\ˆ›İ[™YY[™ËVÈÙÙÙ˜—H^MÚYİËVÌÌMœÌÍÜ™Ø˜JMËÎKŒL
WH‚ˆXZ[Û\ÜÓ˜[YOHšNËNˆ\šXKZY[HYHˆÏ‚ˆÙ]‚ˆÛ\ÜÓ˜[YOH›]M^[ÈXY[™ËMÈ^VÈÌXL™Í—H‚ˆÚ\ĞÛÛXİÛ›TİXØÙ\ÜÂˆÈ•›İ™HÛÛXİ\İšY[ˆ[œ™YÚ\İ°êKˆ‚ˆˆ•›İ\È™XÙ]œ™^ˆ›İ™HØZ[ˆ\ˆK[XZ[]™XÈ\È[™›Ü›X][ÛœÈH™]˜Z]ŸBˆÜ‚ˆÛ\ÜÓ˜[YOH›]LÈ^\ÛHXY[™ËMˆ^VÈÍŒMØWH‚ˆÚ\ĞÛÛXİÛ›TİXØÙ\ÜÂˆÈ“Y\˜ÚHİ\ˆ›İ™HÛÛ™šX[˜ÙKˆ‚ˆˆÛÛœÙ\™^ˆÙHTˆÛÙHİ\ˆ™]\™\ˆ›İ™HØZ[‹ˆÚH8 &YK[XZ[\™H0è\œš]™\‹°ê\šYšY^ˆ›ÜÈÜ[\ËˆŸBˆÜ‚‚ˆÙ˜]Ô™\İ[Ëœš^™HÈ]ˆÛ\ÜÓ˜[YOH›]M›İ[™YVÌNH™ËVÈÙ™™Ø—HMKLÈ^[Y^\ÛHXY[™ËMˆ^VÈÍÎLH‚ˆ‚ˆ›İ\È]™^ˆ[™HHØ]˜Z[X›Q]HÏÈ›XZ[[˜[ŸH]HÙ^\Q]HÏÈ˜šY[0íŸ^ÈˆŸBˆİ\ˆ™[š\ˆH°êXİ\0ê\™\‹‚ˆÜ‚ˆÙ]ˆˆ[B‚ˆÙ˜]Ô™\İ[Ëœš^™H	‰ˆØ[\ZYÛ‹œ™]Ø\™[\Ëœ\˜Ú\ÙT™\]Z\™YÈ
ˆ]ˆÛ\ÜÓ˜[YOH›]LÈ›İ[™YVÌNH™ËVÈÙÙÙ˜—HMKLÈ^[Y^\ÛHXY[™ËMˆ^VÈÍŒMØWH‚ˆH™]˜Z]Hİ\İÛİ[Z\È0è[™HÛÛ™][Ûˆ8 &XXÚ]‚ˆÙ]‚ˆ
Hˆ[B‚ˆÙ˜]Ô™\İ[Ëœš^™H	‰ˆ™\ÛÛ™Y\ØYÙPÛÛ™][ÛœÈÈ
ˆ]ˆÛ\ÜÓ˜[YOH›]LÈ›İ[™YVÌNH™ËVÈÙ™™Ø—HMKLÈ^[Y^\ÛHXY[™ËMˆ^VÈÍÎLH‚ˆÛ\ÜÓ˜[YOH^^È\\˜Ø\ÙH˜XÚÚ[™ËVÌŒ™[WH^VÈÎM˜LNH‚ˆÛÛ™][ÛœÈ	˜\ÜÎİ][\Ø][Û‚ˆÜ‚ˆÛ\ÜÓ˜[YOH›]LˆÚ]\ÜXÙK\™K[[™HÜ™\ÛÛ™Y\ØYÙPÛÛ™][ÛœßOÜ‚ˆÙ]‚ˆ
Hˆ[B‚ˆÜ™Y[\[ÛÛÙHÈ
ˆ]ˆÛ\ÜÓ˜[YOH›]M›İ[™YVÌŒH›Ü™\ˆ›Ü™\‹VÈÙMYMÙY—H™ËVÈÙ˜Y˜™™—HLÈ‚ˆÛ\ÜÓ˜[YOH^^È\\˜Ø\ÙH˜XÚÚ[™ËVÌŒ[WH^VÈÎLØMWHÛÙHH™]˜Z]Ü‚ˆÛ\ÜÓ˜[YOH›]LH^^›Û\Ù[ZX›Û^VÈÌLŒN—HÜ™Y[\[ÛÛÙ_OÜ‚ˆÜ\”]È
ˆ]ˆÛ\ÜÓ˜[YOH›]LÈ›^][\ËXÙ[\ˆØ\LÈ›İ[™YVÌMœH™Ë]Ú]HL‹H^[Y‚ˆ[XYÙBˆÜ˜Ï^Ü\”]Bˆ[^ØTˆÛÙH	Ü™Y[\[ÛÛÙ_XBˆÚY^ÎBˆZYÚ^ÎBˆ[›Ü[Z^™YˆÛ\ÜÓ˜[YOHšLŒËLŒ›İ[™YVÌLœH‚ˆÏ‚ˆ]ˆÛ\ÜÓ˜[YOH›Z[‹]ËL›^LH‚ˆÛ\ÜÓ˜[YOH^^ÈXY[™ËMH^VÈÍŒMØWH‚ˆ[œ™YÚ\İ™^‹[Hİ\ˆH™]›İ]™\ˆ˜XÚ[[Y[‚ˆÜ‚ˆBˆ™Y^Ü\”]BˆİÛ›ØY^Ø\‹[İIÜ™Y[\[ÛÛÙ_Kœİ™ØBˆÛ\ÜÓ˜[YOH›]Lˆ[›[™KY›^›İ[™YVÌLœH™ËVÈÌLLN×HLÈKLˆ^^È›Û\Ù[ZX›Û]^]Ú]H‚ˆ‚ˆ[œ™YÚ\İ™\‚ˆØO‚ˆÙ]‚ˆÙ]‚ˆ
Hˆ[BˆÙ]‚ˆ
Hˆ[BˆÙ]‚ˆÔX›XÓ[Ù[‚ˆÙ]‚ˆ
NÂŸB‚