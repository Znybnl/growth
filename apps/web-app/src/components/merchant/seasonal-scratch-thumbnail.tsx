import Image from "next/image";
import { christmasScratchTemplate, type ChristmasScratchTemplateId } from "@/lib/christmas-scratch-templates";
import { halloweenScratchTemplate } from "@/lib/halloween-scratch-template";
import { BRUSH_CLIP_PATH, SCALLOPED_TICKET_CLIP_PATH, SMOOTH_FESTIVE_BRUSH_CLIP_PATH } from "@/lib/scratch-surface-shapes";

export function SeasonalScratchThumbnail({ templateId, card = false }: { templateId: ChristmasScratchTemplateId | "scratch-halloween-gold"; card?: boolean }) {
  const halloween = halloweenScratchTemplate(templateId);
  const theme = (christmasScratchTemplate(templateId) || halloween)!;
  const scratchShape = christmasScratchTemplate(templateId)?.scratchShape;
  const isFestiveBrush = theme.id === "scratch-christmas-evergreen" || theme.id === "scratch-christmas-champagne" || theme.id === "scratch-christmas-noir-or";
  const scratchRotationDeg = theme.id === "scratch-christmas-evergreen" ? -1.1 : theme.id === "scratch-christmas-champagne" ? 0.9 : theme.id === "scratch-christmas-noir-or" ? -1.2 : 0;
  const brushClipPath = isFestiveBrush ? SMOOTH_FESTIVE_BRUSH_CLIP_PATH : BRUSH_CLIP_PATH;
  return <div aria-hidden="true" data-testid={`scratch-template-thumbnail-${templateId}`} style={{ position: "relative" }} className={`relative flex items-center justify-center overflow-hidden p-2 ${card ? "h-full" : "mb-3 h-[148px] rounded-xl"}`}>
    <Image src={theme.background} alt="" fill sizes="240px" className="object-cover" />
    <div style={{ position: "relative" }} className="relative flex h-[144px] w-[96px] flex-col items-center overflow-hidden rounded-xl border border-white/70 px-2 pb-2 pt-3 text-center shadow-lg">
      <Image src={theme.background} alt="" fill sizes="96px" className="object-cover" />
      <div className="relative z-10 flex flex-col items-center" style={{ color: theme.text }}>
        <span className="font-cormorant text-[6px]" style={{ color: theme.logo }}>Votre établissement</span>
        <span className={`${theme.fontClass} mt-2 max-w-full text-[13px] leading-[.96]`}>{theme.sampleHeadline}</span>
        {halloween ? <Image src="/images/templates/halloween-gold/wordmark-v3.webp" alt="" width={900} height={196} className="mt-1 h-auto w-[74px]" /> : <span className="mt-1 max-w-full font-cormorant text-[5px] leading-tight">{theme.sampleSubline}</span>}
        <span
          className={`relative ${scratchShape ? "mt-auto" : "mt-3"} flex shrink-0 items-center justify-center overflow-hidden border text-center shadow-md ${isFestiveBrush ? "h-[46px] w-[72px]" : scratchShape === "brush" ? "h-[35px] w-[78px]" : scratchShape === "ticket" ? "h-[41px] w-[78px] rounded-[3px] border-2 border-[#f4d78e] bg-[#b52a29] p-[3px]" : "h-[53px] w-[53px] rounded-full"}`}
          style={{ position: "relative", background: scratchShape === "ticket" ? "#b52a29" : `linear-gradient(135deg, ${theme.scratch.base}, ${theme.scratch.highlight} 45%, ${theme.scratch.base})`, ...(isFestiveBrush ? { clipPath: brushClipPath, transform: `rotate(${scratchRotationDeg}deg)` } : scratchShape === "brush" ? { clipPath: BRUSH_CLIP_PATH } : scratchShape === "ticket" ? { clipPath: SCALLOPED_TICKET_CLIP_PATH } : {}) }}
        >
          <span className={`${scratchShape === "ticket" ? "relative flex h-full w-full items-center justify-center overflow-hidden border border-[#fff0c5]" : "absolute inset-0"}`} style={scratchShape === "ticket" ? { clipPath: SCALLOPED_TICKET_CLIP_PATH } : undefined}>
            {theme.scratch.texture ? <Image src={theme.scratch.texture} alt="" fill sizes="68px" unoptimized className="object-cover" style={{ opacity: theme.scratch.textureOpacity }} /> : <span aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(135deg, transparent 0 5px, rgba(255,255,255,.1) 6px 7px), linear-gradient(135deg, ${theme.scratch.base}, ${theme.scratch.highlight} 48%, ${theme.scratch.base})` }} />}
          </span>
        </span>
      </div>
    </div>
  </div>;
}
