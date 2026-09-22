import { GameType, PosterBackgroundMotif, PosterTemplateId } from "@/lib/types";
import {
  getPosterTemplate,
  POSTER_BACKGROUND_MOTIFS,
  POSTER_TEMPLATE_CHOICES,
  PosterTemplateConfig,
} from "@/lib/poster-templates";
import { QrCode } from "lucide-react";

type PosterTemplateSelectorProps = {
  gameType: GameType;
  selectedTemplateId?: PosterTemplateId;
  qrDataUrl?: string | null;
  selectedBackgroundMotif?: PosterBackgroundMotif;
  onSelect: (templateId: PosterTemplateId) => void;
  onSelectMotif: (backgroundMotif: PosterBackgroundMotif) => void;
};

function WheelThumbnail({ template }: { template: PosterTemplateConfig }) {
  return (
    <span
      className="absolute -left-6 top-5 h-[200px] w-[200px] rounded-full border-[10px] shadow-[0_18px_34px_rgba(17,24,39,0.16)]"
      style={{
        borderColor: template.wheel.rimColor,
        background: `conic-gradient(${template.wheel.winColor} 0 60deg, #fff7ef 60deg 120deg, ${template.wheel.winColor} 120deg 180deg, #fff7ef 180deg 240deg, ${template.wheel.winColor} 240deg 300deg, #fff7ef 300deg 360deg)`,
      }}
    />
  );
}

function ScratchThumbnail({ template }: { template: PosterTemplateConfig }) {
  return (
    <span
      className="absolute left-6 top-12 block h-[126px] w-[230px] -rotate-3 rounded-[20px] border-[6px] bg-white p-3 shadow-[0_18px_34px_rgba(17,24,39,0.16)]"
      style={{ borderColor: template.accent }}
    >
      <span className="block h-[62px] rounded-[12px] bg-[linear-gradient(135deg,#dbe2ee,#fff,#aeb9ce)]" />
      <span className="mt-2 block text-center text-[10px] font-black tracking-[0.12em]" style={{ color: template.accentDark }}>
        GRATTEZ ICI
      </span>
    </span>
  );
}

function QrThumbnail({ template }: { template: PosterTemplateConfig }) {
  return (
    <span
      className="absolute bottom-5 right-5 grid h-20 w-20 grid-cols-5 gap-0.5 rounded-[14px] border-4 bg-white p-2"
      style={{ borderColor: template.wheel.winColor }}
    >
      {Array.from({ length: 25 }).map((_, index) => (
        <span
          key={index}
          className="rounded-[1px]"
          style={{
            backgroundColor: [0, 1, 3, 4, 5, 9, 11, 12, 14, 15, 18, 20, 21, 23, 24].includes(index)
              ? "#111827"
              : "transparent",
          }}
        />
      ))}
    </span>
  );
}

export function PosterTemplateSelector({
  gameType,
  selectedTemplateId,
  qrDataUrl,
  selectedBackgroundMotif = "plain",
  onSelect,
  onSelectMotif,
}: PosterTemplateSelectorProps) {
  return (
    <section className="okado-card p-6 md:p-8">
      <p className="okado-label">Template</p>
      <h2 className="okado-section-title mt-2">Choisir le design de l&apos;affiche</h2>
      <p className="mt-2 text-sm leading-6 text-ash">
        Le même design est utilisé pour la roue et le ticket ; seul le visuel central change.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {POSTER_TEMPLATE_CHOICES.map((template) => {
          const active = (selectedTemplateId ?? "classic-wheel") === template.id;
          const visualTemplate = template.id === "classic-wheel"
            ? getPosterTemplate("classic-wheel", selectedBackgroundMotif)
            : template;
          const footerAction = gameType === "wheel" ? "Jouez" : "Grattez";

          return (
            <div
              key={template.id}
              className={`group overflow-hidden rounded-[var(--radius-card)] border text-left transition ${
                active
                  ? "border-aubergine bg-purple-haze shadow-[0_8px_20px_rgba(97,31,105,0.12)]"
                  : "border-[#d7e0ed] bg-white hover:border-aubergine"
              }`}
            >
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(template.id)}
                className="block w-full text-left"
              >
              <span aria-hidden="true" className="relative block h-[220px] overflow-hidden" style={{
                background: visualTemplate.background,
              }}>
                {visualTemplate.id === "premium-wheel" ? (
                  <svg viewBox="0 0 794 1123" className="h-full w-full" aria-hidden="true">
                    <image href="/backgrounds/premium-poster-backdrop.png" width="794" height="1123" />
                    <text x="520" y="102" textAnchor="middle" fontSize="28" fill="#171412">Votre établissement</text>
                    <text x="284" y="210" fontSize="58" className="font-cormorant" fill="#111">
                      <tspan x="284">Scannez, jouez,</tspan><tspan x="284" dy="60">récupérez votre</tspan><tspan x="284" dy="60">cadeau !</tspan>
                    </text>
                    <g data-testid="elegance-thumbnail-qr">
                      <rect x="62" y="486" width="306" height="330" rx="24" fill="white" stroke="#a17d57" strokeWidth="2" />
                      {qrDataUrl ? <image href={qrDataUrl} x="95" y="514" width="240" height="240" /> : <QrCode x="95" y="514" width="240" height="240" color="#111" strokeWidth="1.5" />}
                      <text x="215" y="790" textAnchor="middle" fontSize="19" fontWeight="700" fill="#111">SCANNEZ POUR JOUER</text>
                    </g>
                    <rect y="925" width="794" height="198" fill="white" fillOpacity="0.8" />
                    <text y="1040" fontSize="30" fontWeight="600" fill="#171412"><tspan x="98">Scannez</tspan><tspan x="350">{footerAction}</tspan><tspan x="595">Gagnez</tspan></text>
                  </svg>
                ) : visualTemplate.id === "botanical-wheel" ? (
                  <svg viewBox="0 0 794 1123" className="h-full w-full" aria-hidden="true">
                    <image href="/backgrounds/botanical-poster-backdrop.png" width="794" height="1123" />
                    <text x="72" y="104" fontSize="22" letterSpacing="4" fill="#153a35">Votre établissement</text>
                    <line x1="72" y1="132" x2="140" y2="132" stroke="#8d9c8e" strokeWidth="3" />
                    <text x="72" y="220" fontSize="48" fontFamily="Georgia, serif" fill="#153a35">
                      <tspan x="72">Scannez, jouez,</tspan><tspan x="72" dy="52">récupérez votre</tspan><tspan x="72" dy="52">cadeau !</tspan>
                    </text>
                    <text x="72" y="440" fontSize="17" letterSpacing="2" fill="#153a35">
                      <tspan x="72">PRENEZ</tspan><tspan x="72" dy="27">SOIN DE VOUS,</tspan><tspan x="72" dy="27">LA CHANCE</tspan><tspan x="72" dy="27">S&apos;EN CHARGE.</tspan>
                    </text>
                    <g data-testid="botanical-thumbnail-qr">
                      <rect x="445" y="480" width="306" height="316" rx="24" fill="white" stroke="#9eafa0" strokeWidth="2" />
                      {qrDataUrl ? <image href={qrDataUrl} x="470" y="505" width="256" height="256" /> : <QrCode x="470" y="505" width="256" height="256" color="#111" strokeWidth="1.5" />}
                      <rect x="420" y="790" width="356" height="62" rx="20" fill="#718578" stroke="white" strokeWidth="4" />
                      <text x="598" y="828" textAnchor="middle" fontSize="18" fontWeight="700" fill="white">SCANNEZ POUR JOUER</text>
                    </g>
                    <rect y="944" width="794" height="179" fill="#fbf8f2" fillOpacity="0.96" />
                    <circle cx="132" cy="992" r="32" fill="#718578" /><text x="132" y="1004" textAnchor="middle" fontSize="30" fontWeight="700" fill="white">1</text>
                    <circle cx="397" cy="992" r="32" fill="#718578" /><circle cx="397" cy="992" r="18" fill="none" stroke="white" strokeWidth="3" /><path d="M397 974v36M379 992h36M384 979l26 26M410 979l-26 26" stroke="white" strokeWidth="2" />
                    <circle cx="662" cy="992" r="32" fill="#718578" /><path d="M647 989h30v24h-30zM643 982h38v9h-38zM662 982v31M652 982c-11-9 4-14 10 0M672 982c6-14 21-9 10 0" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                    <line x1="270" y1="960" x2="270" y2="1036" stroke="#718578" strokeWidth="2" /><line x1="524" y1="960" x2="524" y2="1036" stroke="#718578" strokeWidth="2" />
                    <text x="132" y="1072" textAnchor="middle" fontSize="24" fontWeight="700" fill="#153a35">Scannez</text>
                    <text x="397" y="1072" textAnchor="middle" fontSize="24" fontWeight="700" fill="#153a35">{footerAction}</text>
                    <text x="662" y="1072" textAnchor="middle" fontSize="24" fontWeight="700" fill="#153a35">Gagnez</text>
                  </svg>
                ) : <>
                  {gameType === "wheel" ? <WheelThumbnail template={visualTemplate} /> : <ScratchThumbnail template={visualTemplate} />}
                  <QrThumbnail template={visualTemplate} />
                </>}
              </span>
              <span className="block p-4">
                <span className="block text-sm font-semibold text-[#111827]">{template.label}</span>
                <span className="mt-1 block text-xs leading-5 text-[#5c6577]">{template.description}</span>
              </span>
              </button>
              {active && template.id === "classic-wheel" ? (
                <div className="border-t border-[#e6d8eb] px-4 pb-4 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-charcoal">Motif du fond</p>
                  <div className="mt-2 grid gap-2" role="group" aria-label="Motif du fond">
                    {POSTER_BACKGROUND_MOTIFS.map((motif) => {
                      const motifActive = selectedBackgroundMotif === motif.id;
                      return (
                        <button
                          key={motif.id}
                          type="button"
                          aria-pressed={motifActive}
                          aria-label={motif.label}
                          title={motif.description}
                          onClick={() => onSelectMotif(motif.id)}
                          className={`flex min-w-0 items-center gap-2 rounded-[8px] border px-2 py-2 text-left text-[11px] font-semibold transition ${
                            motifActive
                              ? "border-aubergine bg-white text-aubergine shadow-sm"
                              : "border-[#e2e8f0] bg-white/60 text-graphite hover:border-aubergine"
                          }`}
                        >
                          <span className="block h-6 w-12 shrink-0 rounded-[4px] border border-black/5" style={{ background: motif.preview }} />
                          <span className="block break-words leading-4">{motif.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
