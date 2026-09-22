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

function PosterStepsThumbnail({
  template,
  gameType,
}: {
  template: PosterTemplateConfig;
  gameType: GameType;
}) {
  const action = gameType === "wheel" ? "Jouez" : "Grattez";

  if (template.footerVariant === "premium") {
    return (
      <>
        <g transform="translate(0 925)">
        <rect width="794" height="198" fill="white" fillOpacity="0.76" />
        <line x1="281" y1="30" x2="281" y2="138" stroke="#171412" strokeWidth="2" />
        <line x1="513" y1="30" x2="513" y2="138" stroke="#171412" strokeWidth="2" />
        <g transform="translate(33 14)">
          <g transform="translate(0 9)">
            <circle cx="132" cy="48" r="42" fill={template.accent} />
            <g transform="translate(132 48) scale(0.9) translate(-132 -48)">
              <path
                transform="translate(0 -7)"
                d="M116 29 h31 a6 6 0 0 1 6 6 v42 a6 6 0 0 1 -6 6 h-31 a6 6 0 0 1 -6 -6 v-42 a6 6 0 0 1 6 -6 Z M118 42 h27 M118 53 h20 M118 64 h23"
                fill="none"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>
          </g>
          <text x="132" y="138" textAnchor="middle" fill="#111111" fontSize="28" fontWeight="700">Scannez</text>
        </g>
        <g transform="translate(264 14)">
          <g transform="translate(0 9)">
            <circle cx="132" cy="48" r="42" fill={template.accent} />
            <circle cx="132" cy="48" r="25" fill="none" stroke="#ffffff" strokeWidth="4" />
            <path d="M132 23 v50 M107 48 h50 M114 30 l36 36 M150 30 l-36 36" stroke="#ffffff" strokeWidth="3" />
          </g>
          <text x="132" y="138" textAnchor="middle" fill="#111111" fontSize="28" fontWeight="700">{action}</text>
        </g>
        <g transform="translate(497 14)">
          <g transform="translate(0 9)">
            <circle cx="132" cy="48" r="42" fill={template.accent} />
            <g transform="translate(132 48) scale(1.6)">
              <rect x="-13" y="-5" width="26" height="19" rx="2" fill="none" stroke="#ffffff" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M-15-5h30v7h-30z" fill="none" stroke="#ffffff" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M0-5v19" fill="none" stroke="#ffffff" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M0-5c-7 0-11-2-10-6 1-4 7-3 10 6Z" fill="none" stroke="#ffffff" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M0-5c7 0 11-2 10-6-1-4-7-3-10 6Z" fill="none" stroke="#ffffff" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
          <text x="132" y="138" textAnchor="middle" fill="#111111" fontSize="28" fontWeight="700">Gagnez</text>
        </g>
        </g>
      </>
    );
  }

  return (
    <>
      <g transform="translate(0 944)">
      <rect width="794" height="179" fill="#fbf8f2" fillOpacity="0.96" />
      <line x1="281" y1="43" x2="281" y2="133" stroke={template.accent} strokeWidth="2" />
      <line x1="513" y1="43" x2="513" y2="133" stroke={template.accent} strokeWidth="2" />
      <g transform="translate(33 6)">
        <circle cx="132" cy="48" r="35" fill={template.accent} />
        <g transform="translate(132 48) scale(0.72) translate(-132 -48)">
          <path
            transform="translate(0 -7)"
            d="M116 29 h31 a6 6 0 0 1 6 6 v42 a6 6 0 0 1 -6 6 h-31 a6 6 0 0 1 -6 -6 v-42 a6 6 0 0 1 6 -6 Z M118 42 h27 M118 53 h20 M118 64 h23"
            fill="none"
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
        <text x="132" y="124" textAnchor="middle" fill={template.accentDark} fontSize="28" fontWeight="700">Scannez</text>
      </g>
      <g transform="translate(264 6)">
        <circle cx="132" cy="48" r="35" fill={template.accent} />
        <circle cx="132" cy="48" r="21" fill="none" stroke="#ffffff" strokeWidth="3.5" />
        <path d="M132 27 v42 M111 48 h42 M116 32 l32 32 M148 32 l-32 32" stroke="#ffffff" strokeWidth="2.6" />
        <text x="132" y="124" textAnchor="middle" fill={template.accentDark} fontSize="28" fontWeight="700">{action}</text>
      </g>
      <g transform="translate(497 6)">
        <circle cx="132" cy="48" r="35" fill={template.accent} />
        <g transform="translate(132 48) scale(1.6)">
          <rect x="-13" y="-5" width="26" height="19" rx="2" fill="none" stroke="#ffffff" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M-15-5h30v7h-30z" fill="none" stroke="#ffffff" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M0-5v19" fill="none" stroke="#ffffff" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M0-5c-7 0-11-2-10-6 1-4 7-3 10 6Z" fill="none" stroke="#ffffff" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M0-5c7 0 11-2 10-6-1-4-7-3-10 6Z" fill="none" stroke="#ffffff" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <text x="132" y="124" textAnchor="middle" fill={template.accentDark} fontSize="28" fontWeight="700">Gagnez</text>
      </g>
      </g>
    </>
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
        {POSTER_TEMPLATE_CHOICES.filter((template) =>
          gameType === "wheel" || !template.wheelOnly || template.scratchSupported,
        ).map((template) => {
          const active = (selectedTemplateId ?? "classic-wheel") === template.id;
          const visualTemplate = template.id === "classic-wheel"
            ? getPosterTemplate("classic-wheel", selectedBackgroundMotif)
            : template;

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
                    <PosterStepsThumbnail template={visualTemplate} gameType={gameType} />
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
                    <PosterStepsThumbnail template={visualTemplate} gameType={gameType} />
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
