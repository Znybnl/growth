import Image from "next/image";
import { christmasScratchTemplate, type ChristmasScratchTemplateId } from "@/lib/christmas-scratch-templates";

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
          style={{ position: "relative", background: theme.scratchShape === "ticket" ? "#b52a29" : `linear-gradient(135deg, ${theme.scratch.base}, ${theme.scratch.highlight} 45%, ${theme.scratch.base})`, ...(theme.scratchShape === "brush" ? { clipPath: "polygon(4% 18%, 14% 8%, 23% 14%, 34% 4%, 47% 10%, 57% 5%, 69% 14%, 83% 7%, 96% 18%, 92% 35%, 98% 52%, 92% 68%, 96% 84%, 81% 94%, 67% 87%, 55% 97%, 42% 88%, 28% 96%, 18% 86%, 5% 91%, 8% 72%, 2% 57%, 8% 40%)" } : {}) }}
        >
          <span className={`${theme.scratchShape === "ticket" ? "relative flex h-full w-full items-center justify-center overflow-hidden border border-[#fff0c5]" : "absolute inset-0"}`}>
            {theme.scratch.texture ? <Image src={theme.scratch.texture} alt="" fill sizes="68px" unoptimized className="object-cover" style={{ opacity: theme.scratch.textureOpacity }} /> : <span aria-hidden="true" className="absolute inset-0 [background-image:repeating-linear-gradient(135deg,transparent_0_5px,rgba(255,255,255,.3)_6px_7px),linear-gradient(135deg,#aeb7bd,#f4f0df_48%,#aeb7bd)]" />}
            {theme.scratchShape ? <span className="relative z-10 font-semibold text-[5px] leading-none" style={{ color: theme.scratchShape === "ticket" ? "#512c25" : "#4b3925" }}>Ticket<br />à gratter</span> : null}
          </span>
        </span>
      </div>
    </div>
  </div>;
}
