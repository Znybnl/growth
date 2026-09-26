import { BEAUTY_WHEEL_THEMES, beautyWheelBackground, type BeautyWheelTemplateId } from "@/lib/beauty-wheel-themes";
import { Pointer } from "lucide-react";
import { textFontFamily } from "@/lib/format";
import type { GamePageTemplateId } from "@/lib/types";

export function BeautyWheelTemplateGallery({
  selectedTemplateId,
  onSelect,
}: {
  selectedTemplateId?: GamePageTemplateId;
  onSelect: (templateId: BeautyWheelTemplateId) => void;
}) {
  return (
    <section aria-labelledby="beauty-wheel-templates-title" className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b3774]">Collection Beauté</p>
        <h3 id="beauty-wheel-templates-title" className="mt-1 text-base font-semibold text-[#241b2a]">Templates Beauté</h3>
        <p className="mt-1 text-sm text-[#69616c]">Six ambiances pour votre roue, personnalisables aux couleurs de votre établissement.</p>
      </div>
      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        {BEAUTY_WHEEL_THEMES.map((theme) => {
          const selected = selectedTemplateId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(theme.id)}
              className={`group min-w-0 overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b3774] ${selected ? "border-[#6b3774] ring-2 ring-[#6b3774]/15" : "border-[#ded8e1]"}`}
            >
              <div
                className="relative h-40 overflow-hidden px-4 pt-3"
                style={{ backgroundColor: theme.background, backgroundImage: beautyWheelBackground(theme.id, theme.background, theme.primary), color: theme.text }}
              >
                <div className="relative z-10 max-w-[58%] truncate text-[10px] font-semibold tracking-[0.08em]">Votre établissement</div>
                <div className="relative z-10 mt-3 max-w-[58%] text-sm font-bold leading-tight" style={{ fontFamily: textFontFamily(theme.font) }}>Votre animation<br />vous réserve une surprise</div>
                <div className="relative z-10 mt-1 text-[9px]">Des surprises vous attendent</div>
                <div
                  aria-hidden="true"
                  className="absolute -bottom-9 right-[-1.1rem] h-32 w-32 rounded-full border-[5px] border-white shadow-[0_8px_24px_rgba(0,0,0,.12)]"
                  style={{ background: `repeating-conic-gradient(from -22deg, ${theme.primary} 0deg 45deg, ${theme.secondary} 45deg 90deg)` }}
                >
                  <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-white text-[6px] font-bold text-white" style={{ background: theme.primary }}><Pointer aria-hidden="true" className="h-3 w-3" />JOUER</span>
                </div>
              </div>
              <div className="flex items-start justify-between gap-2 px-4 py-3">
                <span className="min-w-0"><span className="block text-sm font-semibold text-[#241b2a]">{theme.name}</span><span className="mt-0.5 block text-xs text-[#746c78]">{theme.tagline}</span></span>
                {selected ? <span className="shrink-0 rounded-full bg-[#f2e7f5] px-2 py-0.5 text-[10px] font-semibold text-[#6b3774]">Sélectionné</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
