import { BEAUTY_WHEEL_THEMES, beautyWheelBackground, type BeautyWheelTemplateId } from "@/lib/beauty-wheel-themes";
import { Pointer } from "lucide-react";
import { RoseFlowerMark, RosePowderDecor } from "@/components/public/rose-powder-decor";
import { textFontFamily } from "@/lib/format";
import type { GamePageTemplateId } from "@/lib/types";

export function BeautyWheelTemplateGallery({
  selectedTemplateId,
  merchantName,
  onSelect,
}: {
  selectedTemplateId?: GamePageTemplateId;
  merchantName: string;
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
                className={`relative h-40 overflow-hidden px-4 pt-3 ${theme.id === "beauty-rose" ? "okado-rose-powder-surface" : ""}`}
                style={{ backgroundColor: theme.background, backgroundImage: beautyWheelBackground(theme.id, theme.background, theme.primary), color: theme.text }}
              >
                {theme.id === "beauty-rose" ? <RosePowderDecor primaryColor={theme.primary} /> : null}
                <div className="relative z-10 max-w-[70%] truncate text-[10px] font-semibold tracking-[0.08em]">{merchantName}</div>
                <div className="relative z-10 mt-3 max-w-[80%] text-sm font-bold leading-tight" style={{ fontFamily: textFontFamily(theme.font), fontWeight: theme.id === "beauty-rose" ? 600 : undefined }}>Tournez la roue<br />et tentez de gagner</div>
                <div className="relative z-10 mt-1 text-[9px]">Des surprises vous attendent</div>
                <div
                  aria-hidden="true"
                  className={`absolute -bottom-[6.4rem] right-[-1.5rem] h-44 w-44 rounded-full ${theme.id === "beauty-rose" ? "border-[2px]" : "border-[7px] border-white shadow-[0_8px_24px_rgba(0,0,0,.12)]"}`}
                  style={{ borderColor: theme.id === "beauty-rose" ? "#e7aebb" : undefined, background: theme.id === "beauty-rose" ? `repeating-conic-gradient(from -22deg, ${theme.secondary} 0deg 44.5deg, rgba(185,95,117,.35) 44.5deg 45deg, #edc5ce 45deg 89.5deg, rgba(185,95,117,.35) 89.5deg 90deg, ${theme.primary} 90deg 134.5deg, rgba(185,95,117,.35) 134.5deg 135deg)` : `repeating-conic-gradient(from -22deg, ${theme.primary} 0deg 45deg, ${theme.secondary} 45deg 90deg)`, boxShadow: theme.id === "beauty-rose" ? "0 10px 30px rgba(90,45,60,.1)" : undefined }}
                >
                  {theme.id === "beauty-rose" ? <span className="absolute left-1/2 top-[-2px] h-6 w-4 -translate-x-1/2 rounded-t-full bg-[#b95f75] [clip-path:polygon(50%_0%,100%_15%,83%_65%,50%_100%,17%_65%,0%_15%)]" /> : null}
                  <span className={`absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-[7px] font-bold ${theme.id === "beauty-rose" ? "border border-[#e7aebb] text-[#b95f75]" : "border-[3px] border-white text-white"}`} style={{ background: theme.id === "beauty-rose" ? "#fffdfc" : theme.primary }}>{theme.id === "beauty-rose" ? <RoseFlowerMark className="h-5 w-5" /> : <Pointer aria-hidden="true" className="h-4 w-4" />}JOUER</span>
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
