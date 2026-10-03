import { Gift, LockKeyhole, PartyPopper, Sparkles, Sun } from "lucide-react";

import type { GamePageTemplateId } from "@/lib/types";
import { defaultScratchTextColor } from "@/lib/campaign-defaults";

const SCRATCH_THUMBNAILS = {
  "scratch-vault": {
    name: "Coffre néon",
    eyebrow: "UN CADEAU À DÉCOUVRIR",
    headline: "Ouvrez le coffre",
    background: "radial-gradient(ellipse at 50% 44%, #273568 0%, #11182f 68%)",
    ticket: "linear-gradient(155deg, #10172d, #202b51 58%, #121a34)",
    ink: "#f4f6ff",
    muted: "#b9c5e6",
    foil: "linear-gradient(135deg, #182342, #27365f 48%, #15203d)",
    foilEdge: "#64dcf5",
    foilInk: "#8cecff",
    motif: "vault",
  },
  "scratch-coral": {
    name: "Corail joyeux",
    eyebrow: "UNE PETITE SURPRISE",
    headline: "Un cadeau vous attend",
    background: "radial-gradient(ellipse at 20% 0%, #fff5e9, #ffe1d4 70%, #ffcdbf)",
    ticket: "linear-gradient(145deg, #fffaf4, #fff1e8)",
    ink: "#663e35",
    muted: "#9b6a5d",
    foil: "linear-gradient(145deg, #e99772, #ffc5a3 48%, #dc8068)",
    foilEdge: "#fff8ee",
    foilInk: "#fff9f2",
    motif: "sparkles",
  },
  "scratch-lilac": {
    name: "Cadeau lilas",
    eyebrow: "VOTRE INSTANT SURPRISE",
    headline: "Grattez pour découvrir",
    background: "radial-gradient(ellipse at 78% 0%, #f0dcff, #f8f3ff 58%, #ebe1fb)",
    ticket: "linear-gradient(145deg, #fffaff, #f7f1ff)",
    ink: defaultScratchTextColor("scratch-lilac"),
    muted: defaultScratchTextColor("scratch-lilac"),
    foil: "linear-gradient(145deg, #a978cf, #d4b4ee 48%, #9564c2)",
    foilEdge: "#fffaff",
    foilInk: "#fffaff",
    motif: "gift",
  },
  "scratch-nude-classic": {
    name: "Nude",
    eyebrow: "UNE SURPRISE RAFFINÉE",
    headline: "Grattez & découvrez",
    background: "url('/images/scratch-templates/nude-neutral-background.webp') center / cover no-repeat",
    ticket: "linear-gradient(155deg, #fffdf8, #f6eee3 58%, #fffaf2)",
    ink: "#49372c",
    muted: "#8a725c",
    foil: "linear-gradient(135deg, #b99a6a, #e4d0aa 48%, #a98450)",
    foilEdge: "#fff7e9",
    foilInk: "#fff7e9",
    motif: "gift",
  },
  "scratch-confetti": {
    name: "Carte Confettis",
    eyebrow: "C'EST LA FÊTE",
    headline: "Une surprise à gratter",
    background: "radial-gradient(ellipse at 50% 0%, #fff7d9, #fffaf0 60%, #ffecc1)",
    ticket: "linear-gradient(145deg, #fffdf5, #fff7e5)",
    ink: "#52402c",
    muted: "#92744b",
    foil: "linear-gradient(145deg, #d89b37, #f5d481 48%, #c8872b)",
    foilEdge: "#fff9e8",
    foilInk: "#fff6dd",
    motif: "party",
  },
  "scratch-sunburst": {
    name: "Rayons soleil",
    eyebrow: "UN JEU PLEIN D'ÉCLAT",
    headline: "Grattez & découvrez",
    background: "repeating-conic-gradient(from -12deg at 50% 53%, #ffe9a8 0deg 12deg, #fff6d9 12deg 24deg)",
    ticket: "linear-gradient(145deg, #fffbea, #fff2c8)",
    ink: "#5b4018",
    muted: "#977340",
    foil: "linear-gradient(145deg, #dd9c28, #f7ce62 46%, #d18b20)",
    foilEdge: "#fffbea",
    foilInk: "#fff9e8",
    motif: "sun",
  },
} as const;

type ScratchThumbnailId = keyof typeof SCRATCH_THUMBNAILS;

function isScratchThumbnailId(templateId: GamePageTemplateId): templateId is ScratchThumbnailId {
  return templateId in SCRATCH_THUMBNAILS;
}

const MOTIF_ICONS = {
  vault: LockKeyhole,
  sparkles: Sparkles,
  gift: Gift,
  party: PartyPopper,
  sun: Sun,
} as const;

export function ScratchTemplateThumbnail({ templateId }: { templateId: GamePageTemplateId }) {
  if (!isScratchThumbnailId(templateId)) return null;

  const template = SCRATCH_THUMBNAILS[templateId];
  const Motif = MOTIF_ICONS[template.motif];
  const isVault = templateId === "scratch-vault";
  const isSunburst = templateId === "scratch-sunburst";

  return (
    <span
      aria-hidden="true"
      data-testid={`scratch-template-thumbnail-${templateId}`}
      className="relative mb-3 flex h-[148px] items-center justify-center overflow-hidden rounded-[14px] p-2"
      style={{ background: template.background }}
    >
      {!isVault && !isSunburst ? (
        <span className="pointer-events-none absolute -right-5 -top-7 h-20 w-20 rounded-full bg-white/55 blur-2xl" />
      ) : null}
      {templateId === "scratch-confetti" ? (
        <span className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_13%_22%,#ec8b55_0_2px,transparent_2.5px),radial-gradient(circle_at_83%_24%,#f0bf45_0_2px,transparent_2.5px),radial-gradient(circle_at_20%_77%,#8a9b70_0_2px,transparent_2.5px),radial-gradient(circle_at_84%_73%,#df8875_0_2px,transparent_2.5px)]" />
      ) : null}
      <span
        className="relative flex h-full w-[91px] flex-col items-center overflow-hidden rounded-[11px] border border-white/80 px-2.5 pb-2.5 pt-3 shadow-[0_9px_22px_rgba(33,28,41,.2)]"
        style={{ background: template.ticket }}
      >
        {isVault ? (
          <span className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(ellipse_at_50%_38%,#75eaff,transparent_68%)]" />
        ) : null}
        <span className="relative text-[5px] font-semibold uppercase tracking-[0.2em]" style={{ color: template.muted }}>
          Votre logo
        </span>
        <span className="relative mt-2 line-clamp-2 text-center font-serif text-[10px] leading-[1.05]" style={{ color: template.ink }}>
          {template.headline}
        </span>
        <span className="relative mt-1.5 text-center text-[4px] font-semibold uppercase tracking-[0.12em]" style={{ color: template.muted }}>
          {template.eyebrow}
        </span>
        <span
          className={`relative mt-auto flex items-center justify-center overflow-hidden border shadow-[0_3px_9px_rgba(22,26,42,.16)] ${isSunburst ? "h-[35px] w-[57px] rounded-[10px]" : "h-[43px] w-[43px] rounded-[11px]"}`}
          style={{ background: template.foil, borderColor: template.foilEdge }}
        >
          <span className="pointer-events-none absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(135deg,transparent_0_5px,rgba(255,255,255,.42)_5px_6px)]" />
          <Motif className="relative h-5 w-5" strokeWidth={isVault ? 1.7 : 1.5} color={template.foilInk} opacity={0.88} />
        </span>
        <span className="relative mt-1.5 text-center text-[4px]" style={{ color: template.muted }}>
          Le résultat s&apos;affiche après grattage
        </span>
      </span>
      {isSunburst ? (
        <span className="pointer-events-none absolute bottom-1 right-2 h-2 w-2 rounded-full bg-white/80 shadow-[0_0_12px_4px_rgba(255,255,255,.45)]" />
      ) : null}
    </span>
  );
}
