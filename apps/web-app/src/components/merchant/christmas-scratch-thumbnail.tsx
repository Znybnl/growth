import Image from "next/image";
import { christmasScratchTemplate, type ChristmasScratchTemplateId } from "@/lib/christmas-scratch-templates";

const BRUSH_CLIP_PATH = "polygon(2% 22%, 7% 18%, 6% 14%, 12% 15%, 14% 10%, 20% 12%, 25% 8%, 31% 11%, 37% 7%, 43% 10%, 49% 6%, 55% 9%, 61% 7%, 67% 11%, 73% 8%, 79% 12%, 85% 9%, 90% 14%, 96% 12%, 94% 19%, 98% 23%, 95% 29%, 99% 34%, 96% 40%, 99% 46%, 95% 52%, 98% 58%, 94% 64%, 97% 70%, 92% 75%, 95% 81%, 88% 84%, 90% 90%, 83% 88%, 77% 94%, 70% 91%, 64% 96%, 57% 92%, 50% 97%, 44% 93%, 37% 96%, 31% 91%, 24% 95%, 19% 89%, 12% 92%, 10% 86%, 4% 87%, 7% 80%, 2% 75%, 6% 68%, 1% 62%, 5% 56%, 2% 49%, 6% 43%, 3% 36%, 8% 31%, 4% 26%, 9% 23%)";

export function ChristmasScratchThumbnail({ templateId, card = false }: { templateId: ChristmasScratchTemplateId; card?: boolean }) {
  const theme = christmasScratchTemplate(templateId)!;
  return <div aria-hidden="true" data-testid={`scratch-template-thumbnail-${templateId}`} style={{ position: "relative" }} className={`relative flex items-center justify-center overflow-hidden p-2 ${card ? "h-full" : "mb-3 h-[148px] rounded-xl"}`}>
    <Image src={theme.background} alt="" fill sizes="240px" className="object-cover" />
    <div style={{ position: "relative" }} className="relative flex h-[144px] w-[96px] flex-col items-center overflow-hidden rounded-xl border border-white/70 px-2 pb-2 pt-3 text-center shadow-lg">
      <Image src={theme.background} alt="" fill sizes="96px" className="object-cover" />
      <div className="relative z-10 flex flex-col items-center" style={{ color: theme.text }}>
        <span className="font-cormorant text-[6px]" style={{ color: theme.logo }}>Votre établissement</span>
        <span className={`${theme.fontClass} mt-2 max-w-full text-[13px] leading-[.96]`}>{theme.sampleHeadline}</span>
        <span className="mt-1 max-w-full font-cormorant text-[5px] leading-tight">{theme.sampleSubline}</span>
        <span
          className={`relative ${theme.scratchShape ? "mt-auto" : "mt-3"} flex shrink-0 items-center justify-center overflow-hidden border text-center shadow-md ${theme.scratchShape === "brush" ? "h-[35px] w-[68px]" : theme.scratchShape === "ticket" ? "h-[39px] w-[65px] rounded-[3px] border-2 border-[#f4d78e] bg-[#b52a29] p-[3px]" : "h-[53px] w-[53px] rounded-full"}`}
          style={{ position: "relative", background: theme.scratchShape === "ticket" ? "#b52a29" : `linear-gradient(135deg, ${theme.scratch.base}, ${theme.scratch.highlight} 45%, ${theme.scratch.base})`, ...(theme.scratchShape === "brush" ? { clipPath: BRUSH_CLIP_PATH } : {}) }}
        >
          <span className={`${theme.scratchShape === "ticket" ? "relative flex h-full w-full items-center justify-center overflow-hidden border border-[#fff0c5]" : "absolute inset-0"}`} style={theme.scratchShape === "ticket" ? { clipPath: BRUSH_CLIP_PATH } : undefined}>
            {theme.scratch.texture ? <Image src={theme.scratch.texture} alt="" fill sizes="68px" unoptimized className="object-cover" style={{ opacity: theme.scratch.textureOpacity }} /> : <span aria-hidden="true" className="absolute inset-0 [background-image:repeating-linear-gradient(135deg,transparent_0_5px,rgba(255,255,255,.3)_6px_7px),linear-gradient(135deg,#aeb7bd,#f4f0df_48%,#aeb7bd)]" />}
            {theme.scratchShape ? <span className="relative z-10 font-semibold text-[5px] leading-none" style={{ color: theme.scratchShape === "ticket" ? "#512c25" : "#4b3925" }}>Ticket<br />à gratter</span> : null}
          </span>
        </span>
      </div>
    </div>
  </div>;
}
