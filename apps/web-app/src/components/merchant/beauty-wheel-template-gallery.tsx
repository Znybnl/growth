import { BEAUTY_WHEEL_THEMES, beautyWheelBackground, beautyWheelDefaultBackground, beautyWheelButtonTextColor } from "@/lib/beauty-wheel-themes";
import Image from "next/image";
import { buildBeautyWheelSegmentColors } from "@/lib/beauty-wheel-segments";
import { BeautyLogoRule, BeautyWheelPointer } from "@/components/public/beauty-wheel-finishes";
import { beautyCenterFinish, beautyCenterRelief } from "@/lib/beauty-wheel-finishes";
import { wheelButtonBackgroundForWhiteText } from "@/lib/wheel-button-contrast";
import { textFontFamily } from "@/lib/format";
import type { GamePageTemplateId } from "@/lib/types";

type BeautyTheme = (typeof BEAUTY_WHEEL_THEMES)[number];

function BeautyWheelThumbnail({ theme }: { theme: BeautyTheme }) {
  const colors = buildBeautyWheelSegmentColors(theme.id, 8, theme.primary, theme.secondary);
  const wedgeStops = colors
    .map((color, index) => `${color} ${index * 45}deg ${(index + 1) * 45}deg`)
    .join(", ");
  const ringColor = theme.id === "beauty-editorial" ? "#b99a68" : theme.id === "beauty-rose" ? "#b95f75" : theme.primary;
  const centerTextColor = theme.id === "beauty-rose" ? "#b95f75" : beautyWheelButtonTextColor(theme.id, theme.primary);
  const centerBackground = theme.id === "beauty-rose" ? "#fffdfc" : wheelButtonBackgroundForWhiteText(theme.primary, centerTextColor);

  return (
    <div
      aria-hidden="true"
      className="absolute -bottom-5 right-[-0.8rem] z-10 grid size-32 place-items-center rounded-full border-[3px] p-[3px]"
      style={{ borderColor: ringColor, backgroundColor: theme.secondary, outline: "2px solid white", boxShadow: `0 8px 22px color-mix(in srgb, ${theme.primary} 22%, transparent)` }}
    >
      <div
        className="relative size-full rounded-full"
        style={{ backgroundImage: `repeating-conic-gradient(from -22.5deg, transparent 0deg 44deg, rgba(255,255,255,.88) 44deg 45deg), conic-gradient(from -22.5deg, ${wedgeStops})` }}
      >
        <div
          data-testid="beauty-thumbnail-center"
          className="absolute left-1/2 top-1/2 flex size-[2.7rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[8px] font-semibold tracking-[0.025em]"
          style={{ background: beautyCenterFinish(centerBackground), color: centerTextColor, fontFamily: textFontFamily("dm-sans"), ...beautyCenterRelief(theme.primary) }}
        >
          <span>JOUER</span>
        </div>
      </div>
      <BeautyWheelPointer color={ringColor} className="absolute left-1/2 -top-2 h-7 w-5 -translate-x-1/2 overflow-visible" />
    </div>
  );
}

function BeautyThumbnailDecor({ theme }: { theme: BeautyTheme }) {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 size-full" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" focusable="false">
      {theme.id === "beauty-rose" ? <g fill={theme.primary} opacity=".1"><ellipse cx="275" cy="24" rx="62" ry="38" /><ellipse cx="20" cy="145" rx="50" ry="27" /></g> : null}
      {theme.id === "beauty-nude" ? <g fill="none" stroke={theme.primary} strokeLinecap="round"><path d="M226 -18 C300 14 316 51 321 83" opacity=".3" /><path d="M245 -23 C309 7 329 43 334 72" opacity=".18" /><path d="M12 147 C33 151 48 156 61 165" opacity=".16" /></g> : null}
      {theme.id === "beauty-botanical" ? <g fill={theme.primary} opacity=".11"><path d="M-18 115 C19 74 50 78 65 98 C44 129 17 137 -18 115Z" /><path d="M-10 145 C23 115 48 120 61 140 C37 162 15 163 -10 145Z" /><path d="M43 110 C28 121 14 130 -4 137" fill="none" stroke={theme.primary} strokeWidth="1.2" opacity=".48" /></g> : null}
      {theme.id === "beauty-pop" ? <g fill={theme.primary} opacity=".16"><circle cx="24" cy="36" r="18" /><circle cx="68" cy="18" r="6" /><path d="M238 28l4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" /></g> : null}
      {theme.id === "beauty-editorial" ? <g><path d="M283 0h37v160h-28" fill={theme.primary} opacity=".06" /><path d="M260 18h40M260 24h26M14 137h44" fill="none" stroke="#b99a68" strokeWidth="1" opacity=".5" /></g> : null}
      {theme.id === "beauty-tech" ? <g fill="none" stroke="#d9ccff"><circle cx="296" cy="34" r="30" opacity=".16" /><circle cx="296" cy="34" r="42" opacity=".1" /><circle cx="45" cy="143" r="1.5" fill="#e8ddff" stroke="none" opacity=".7" /><circle cx="75" cy="26" r="1.5" fill="#e8ddff" stroke="none" opacity=".6" /></g> : null}
    </svg>
  );
}

function EclatWheelThumbnail() {
  return (
    <div
      aria-hidden="true"
      data-testid="eclat-thumbnail-wheel"
      className="absolute -bottom-5 right-[-0.8rem] z-10 grid size-32 place-items-center rounded-full border-[5px] border-white p-1 shadow-[0_9px_24px_rgba(222,103,151,0.18)]"
      style={{ backgroundImage: "conic-gradient(from -22.5deg, #f3a4c4 0deg 45deg, #fff9fb 45deg 90deg, #f3a4c4 90deg 135deg, #fff9fb 135deg 180deg, #f3a4c4 180deg 225deg, #fff9fb 225deg 270deg, #f3a4c4 270deg 315deg, #fff9fb 315deg 360deg)" }}
    >
      <div className="relative size-full rounded-full border-2 border-[#e78ab0]/50">
        <div data-testid="eclat-thumbnail-pointer" className="absolute left-1/2 top-1 -translate-x-1/2 border-x-[7px] border-t-[13px] border-x-transparent border-t-[#e78ab0]" />
        <div data-testid="eclat-thumbnail-center" className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white bg-[#003cb4] text-[6px] font-bold tracking-wide text-white shadow-md">
          JOUER
        </div>
      </div>
    </div>
  );
}

export function BeautyWheelTemplateGallery({
  selectedTemplateId,
  onSelect,
}: {
  selectedTemplateId?: GamePageTemplateId;
  onSelect: (templateId: GamePageTemplateId) => void;
}) {
  return (
    <section aria-labelledby="beauty-wheel-templates-title" className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b3774]">Collection Beauté</p>
        <h3 id="beauty-wheel-templates-title" className="mt-1 text-base font-semibold text-[#241b2a]">Templates Beauté</h3>
        <p className="mt-1 text-sm text-[#69616c]">Sept styles de roue, personnalisables aux couleurs de votre établissement.</p>
      </div>
      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        {BEAUTY_WHEEL_THEMES.map((theme) => {
          const selected = selectedTemplateId === theme.id;
          const nativeBackground = beautyWheelDefaultBackground(theme.id, { mode: "color", color: theme.background });
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
                style={{ backgroundColor: theme.background, backgroundImage: nativeBackground ? "none" : beautyWheelBackground(theme.id, theme.background, theme.primary), color: theme.text }}
              >
                {nativeBackground ? <Image src={nativeBackground} alt="" fill sizes="320px" data-template-art={theme.id} className="pointer-events-none object-cover" /> : <BeautyThumbnailDecor theme={theme} />}
                <div data-testid="beauty-thumbnail-logo" className="relative z-10 min-h-[20px] max-w-[56%] text-[8px] font-semibold uppercase leading-[1.15] tracking-[0.06em]">Votre établissement<BeautyLogoRule color={theme.text} /></div>
                <div className="relative z-10 mt-3 max-w-[56%] text-[13px] font-bold leading-[1.12]" style={{ fontFamily: textFontFamily(theme.font) }}>Votre animation<br />vous réserve une surprise</div>
                <div className="relative z-10 mt-1 max-w-[55%] text-[8px] leading-tight opacity-75">Des surprises vous attendent</div>
                <BeautyWheelThumbnail theme={theme} />
              </div>
              <div className="flex items-start justify-between gap-2 px-4 py-3">
                <span className="min-w-0"><span className="block text-sm font-semibold text-[#241b2a]">{theme.name}</span><span className="mt-0.5 block text-xs text-[#746c78]">{theme.tagline}</span></span>
                {selected ? <span className="shrink-0 rounded-full bg-[#f2e7f5] px-2 py-0.5 text-[10px] font-semibold text-[#6b3774]">Sélectionné</span> : null}
              </div>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={selectedTemplateId === "rose-institut"}
          onClick={() => onSelect("rose-institut")}
          className={`group min-w-0 overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b3774] ${selectedTemplateId === "rose-institut" ? "border-[#6b3774] ring-2 ring-[#6b3774]/15" : "border-[#ded8e1]"}`}
        >
          <div data-testid="eclat-thumbnail" className="relative h-40 overflow-hidden bg-[radial-gradient(ellipse_at_18%_8%,rgba(243,164,196,0.22),transparent_48%),linear-gradient(145deg,#fff8fb,#ffeaf2)] px-4 pt-3 text-[#003cb4]">
            <div data-testid="beauty-thumbnail-logo" className="relative z-10 min-h-[20px] max-w-[56%] text-[8px] font-semibold uppercase leading-[1.15] tracking-[0.06em]">Votre établissement<BeautyLogoRule color="#003cb4" /></div>
            <div className="relative z-10 mt-3 max-w-[56%] font-playfair text-[13px] font-bold leading-[1.12]">Tournez la roue<br />et tentez de gagner</div>
            <div className="relative z-10 mt-1 max-w-[55%] text-[8px] leading-tight opacity-75">Une roue lumineuse à vos couleurs</div>
            <EclatWheelThumbnail />
          </div>
          <div className="flex items-start justify-between gap-2 px-4 py-3">
            <span className="min-w-0"><span className="block text-sm font-semibold text-[#241b2a]">Éclat</span><span className="mt-0.5 block text-xs text-[#746c78]">Lumineux & personnalisable</span></span>
            {selectedTemplateId === "rose-institut" ? <span className="shrink-0 rounded-full bg-[#f2e7f5] px-2 py-0.5 text-[10px] font-semibold text-[#6b3774]">Sélectionné</span> : null}
          </div>
        </button>
      </div>
    </section>
  );
}
