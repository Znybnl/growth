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
        <span className="mt-2 font-bodoni text-[13px] leading-none">Grattez &amp;<br />gagnez</span>
        <span className="mt-1 font-cormorant text-[5px] leading-tight">De belles surprises pour Noël</span>
        <span className="relative mt-3 block h-[53px] w-[53px] overflow-hidden rounded-full border border-[#fff4d7] shadow-md" style={{ position: "relative", width: 53, height: 53, background: `linear-gradient(135deg, ${theme.scratch.base}, ${theme.scratch.highlight} 45%, ${theme.scratch.base})` }}>
          <Image src={theme.scratch.texture} alt="" fill sizes="53px" unoptimized className="object-cover" style={{ opacity: theme.scratch.textureOpacity }} />
        </span>
      </div>
    </div>
  </div>;
}
