"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useMemo, useState } from "react";

import {
  buildPosterWheelSegments,
  createPosterSettingsDefaults,
  normalizePosterSettings,
} from "@/lib/poster-utils";
import {
  Campaign,
  CampaignPosterSettings,
  Merchant,
  Prize,
  TextFont,
} from "@/lib/types";

type PosterEditorProps = {
  campaign: Campaign;
  merchant: Merchant;
  prizes: Prize[];
};

const textFontOptions: TextFont[] = ["display", "sans", "serif"];

function uploadAsDataUrl(
  event: ChangeEvent<HTMLInputElement>,
  onLoaded: (value: string) => void,
) {
  const file = event.target.files?.[0];

  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      onLoaded(reader.result);
    }
  };
  reader.readAsDataURL(file);
}

function fontClass(font: TextFont) {
  if (font === "serif") return "font-serif";
  if (font === "sans") return "font-sans";
  return "font-display";
}

function fontLabel(font: TextFont) {
  if (font === "serif") return "Serif";
  if (font === "sans") return "Sans";
  return "Display";
}

function splitLines(text: string, maxChars: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxChars || !current) {
      current = next;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export function PosterEditor({ campaign, merchant, prizes }: PosterEditorProps) {
  const router = useRouter();
  const [poster, setPoster] = useState<CampaignPosterSettings>(() =>
    normalizePosterSettings(
      campaign.presentation.poster,
      createPosterSettingsDefaults({
        logoUrl: campaign.logoUrl,
        logoSizePercent: campaign.presentation.logo.sizePercent,
        logoBottomMarginPx: campaign.presentation.logo.marginBottomPx,
        backgroundImageUrl: campaign.presentation.background.imageUrl ?? "",
        headline: campaign.subtitle,
        headlineTextColor: campaign.presentation.heading.textColor,
        headlineFontSizePx: campaign.presentation.heading.fontSizePx,
        headlineFontFamily: campaign.presentation.heading.fontFamily,
        wheel: campaign.presentation.wheel,
        footerBackgroundColor: campaign.accent.signal,
      }),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const wheelStyle = useMemo(
    () => ({
      background: `conic-gradient(${poster.wheel.winColor} 0 60deg, ${poster.wheel.loseColor} 60deg 120deg, ${poster.wheel.alternateWinColor} 120deg 180deg, ${poster.wheel.alternateLoseColor} 180deg 240deg, ${poster.wheel.winColor} 240deg 300deg, ${poster.wheel.loseColor} 300deg 360deg)`,
      borderColor: poster.wheel.rimColor,
    }),
    [poster.wheel],
  );
  const wheelSegments = useMemo(
    () => buildPosterWheelSegments(prizes, poster.wheel),
    [poster.wheel, prizes],
  );
  const headlineLines = useMemo(
    () => splitLines(poster.headline || campaign.subtitle || campaign.title, 16).slice(0, 3),
    [campaign.subtitle, campaign.title, poster.headline],
  );
  const logoWidth = Math.max(90, poster.logoSizePercent * 1.4);
  const headlineMarginTop = Math.max(10, poster.logoBottomMarginPx * 0.55);
  const previewHeadlineSize = Math.max(22, poster.headlineFontSizePx * 0.6);
  const scratchTop = headlineLines.length >= 3 ? "50%" : "48%";
  const wheelTop = headlineLines.length >= 3 ? "45%" : "43%";
  const scanTop = campaign.gameType === "wheel" ? "60%" : "65%";
  const qrTop = campaign.gameType === "wheel" ? "57%" : "61%";

  function updatePoster(patch: Partial<CampaignPosterSettings>) {
    setPoster((current) => ({ ...current, ...patch }));
  }

  function updateWheel(key: keyof CampaignPosterSettings["wheel"], value: string) {
    setPoster((current) => ({
      ...current,
      wheel: {
        ...current.wheel,
        [key]: value,
      },
    }));
  }

  async function savePoster() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/poster-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(poster),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Enregistrement impossible.");
      }

      setMessage("Affiche enregistrée.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-120px)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(440px,0.78fr)]">
      <div className="space-y-6">
        <section className="rounded-[8px] border border-[#dbe4f0] bg-white p-6 shadow-[0_16px_42px_rgba(122,136,166,0.1)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Atelier affiche</p>
              <h1 className="mt-3 text-4xl font-semibold text-[#111827]">
                Personnaliser l&apos;affiche A4
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5c6577]">
                Cet écran ne modifie que l&apos;affiche imprimable. La page publique reste
                paramétrée dans l&apos;éditeur de campagne.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/campaigns/${campaign.id}/edit`}
                className="rounded-[8px] border border-[#d7e0ed] px-4 py-3 text-sm font-semibold text-[#182033]"
              >
                Revenir à la campagne
              </Link>
              <button
                type="button"
                onClick={savePoster}
                disabled={isSaving}
                className="rounded-[8px] bg-[#111827] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
          {message ? (
            <div className="mt-5 rounded-[8px] border border-[#dbe4f0] bg-[#f7f9fc] px-4 py-3 text-sm font-semibold text-[#182033]">
              {message}
            </div>
          ) : null}
        </section>

        <section className="rounded-[8px] border border-[#dbe4f0] bg-white p-6 shadow-[0_16px_42px_rgba(122,136,166,0.1)]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Marque</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#111827]">Logo et titre haut</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="group relative flex min-h-[132px] cursor-pointer flex-col justify-between rounded-[8px] border border-dashed border-[#cfd9ea] bg-[#f7f9fc] p-4 text-sm transition hover:border-[#2f6df6] hover:bg-[#eef4ff]">
              <div>
                <span className="mb-2 block text-[#616b7c]">Importer le logo affiche</span>
                <p className="max-w-md text-sm leading-6 text-[#516073]">
                  PNG, JPG ou SVG. Le logo restera centré en haut de l&apos;affiche.
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#214ccf] shadow-sm">
                  {poster.logoUrl ? "Logo chargé" : "Logo campagne"}
                </span>
                <span className="rounded-[8px] bg-[#2f6df6] px-4 py-2 text-xs font-semibold text-white">
                  Choisir
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => uploadAsDataUrl(event, (value) => updatePoster({ logoUrl: value }))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Taille du logo (%)</span>
              <input
                type="number"
                min={40}
                max={180}
                value={poster.logoSizePercent}
                onChange={(event) => updatePoster({ logoSizePercent: Number(event.target.value || 100) })}
                className="w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Marge sous le logo (px)</span>
              <input
                type="number"
                min={0}
                max={120}
                value={poster.logoBottomMarginPx}
                onChange={(event) =>
                  updatePoster({ logoBottomMarginPx: Number(event.target.value || 0) })
                }
                className="w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>

            <label className="text-sm md:col-span-2">
              <span className="mb-2 block text-[#616b7c]">Texte sous le logo</span>
              <textarea
                rows={3}
                value={poster.headline}
                onChange={(event) => updatePoster({ headline: event.target.value })}
                className="w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Couleur du texte</span>
              <input
                type="color"
                value={poster.headlineTextColor}
                onChange={(event) => updatePoster({ headlineTextColor: event.target.value })}
                className="h-14 w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Taille du texte (px)</span>
              <input
                type="number"
                min={24}
                max={84}
                value={poster.headlineFontSizePx}
                onChange={(event) => updatePoster({ headlineFontSizePx: Number(event.target.value || 42) })}
                className="w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>

            <div className="md:col-span-2">
              <span className="mb-3 block text-sm text-[#616b7c]">Police</span>
              <div className="grid gap-3 md:grid-cols-3">
                {textFontOptions.map((font) => {
                  const active = poster.headlineFontFamily === font;
                  return (
                    <button
                      key={font}
                      type="button"
                      onClick={() => updatePoster({ headlineFontFamily: font })}
                      className={`rounded-[8px] border px-4 py-3 text-left text-sm font-semibold ${
                        active
                          ? "border-[#2f6df6] bg-[#eff4ff] text-[#214ccf]"
                          : "border-[#d7e0ed] bg-[#f7f9fc] text-[#182033]"
                      }`}
                    >
                      {fontLabel(font)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[8px] border border-[#dbe4f0] bg-white p-6 shadow-[0_16px_42px_rgba(122,136,166,0.1)]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Visuel affiche</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#111827]">Fond, jeu et bandeau</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="group relative flex min-h-[132px] cursor-pointer flex-col justify-between rounded-[8px] border border-dashed border-[#cfd9ea] bg-[#f7f9fc] p-4 text-sm transition hover:border-[#2f6df6] hover:bg-[#eef4ff] md:col-span-2">
              <div>
                <span className="mb-2 block text-[#616b7c]">Image de fond de l&apos;affiche</span>
                <p className="max-w-md text-sm leading-6 text-[#516073]">
                  Utilisez un visuel fort pour obtenir un rendu plus proche d&apos;un flyer final.
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#214ccf] shadow-sm">
                  {poster.backgroundImageUrl ? "Image chargée" : "Image par défaut"}
                </span>
                <span className="rounded-[8px] bg-[#2f6df6] px-4 py-2 text-xs font-semibold text-white">
                  Choisir
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  uploadAsDataUrl(event, (value) => updatePoster({ backgroundImageUrl: value }))
                }
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Couleur du bandeau inférieur</span>
              <input
                type="color"
                value={poster.footerBackgroundColor}
                onChange={(event) => updatePoster({ footerBackgroundColor: event.target.value })}
                className="h-14 w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
              />
            </label>

            {campaign.gameType === "wheel" ? (
              <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                {[
                  ["rimColor", "Contour"],
                  ["winColor", "Gain 1"],
                  ["alternateWinColor", "Gain 2"],
                  ["loseColor", "Perdu 1"],
                  ["alternateLoseColor", "Perdu 2"],
                ].map(([key, label]) => (
                  <label key={key} className="text-sm">
                    <span className="mb-2 block text-[#616b7c]">{label}</span>
                    <input
                      type="color"
                      value={poster.wheel[key as keyof CampaignPosterSettings["wheel"]]}
                      onChange={(event) =>
                        updateWheel(key as keyof CampaignPosterSettings["wheel"], event.target.value)
                      }
                      className="h-14 w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 text-sm leading-6 text-[#516073] md:col-span-2">
                Cette campagne utilise un ticket à gratter. La prévisualisation et l&apos;export
                affichent donc un ticket au lieu d&apos;une roue.
              </div>
            )}
          </div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-6 xl:h-[calc(100vh-48px)]">
        <div className="flex h-full flex-col rounded-[8px] border border-[#dbe4f0] bg-[#111827] p-5 shadow-[0_24px_70px_rgba(17,24,39,0.24)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/48">Prévisualisation</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Affiche A4</h2>
            </div>
            <a
              href={`/api/campaigns/${campaign.id}/poster`}
              className="rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-[#111827]"
            >
              Télécharger
            </a>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[8px] bg-[#0b1020] p-4">
            <div
              className="relative aspect-[794/1123] max-h-full w-full max-w-[440px] overflow-hidden rounded-[18px] border-[10px] border-[#20242f] bg-cover bg-center shadow-[0_26px_80px_rgba(0,0,0,0.42)]"
              style={{
                backgroundColor: campaign.presentation.background.color,
                backgroundImage: poster.backgroundImageUrl
                  ? `linear-gradient(rgba(9,12,20,0.06), rgba(9,12,20,0.26)), url("${poster.backgroundImageUrl}")`
                  : undefined,
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.16))]" />
              <div className="absolute left-[10%] right-[10%] top-[5.4%] z-10 text-center">
                {poster.logoUrl ? (
                  <Image
                    src={poster.logoUrl}
                    alt="Logo affiche"
                    width={260}
                    height={120}
                    unoptimized
                    className="mx-auto max-h-[88px] object-contain"
                    style={{ width: `${logoWidth}px` }}
                  />
                ) : (
                  <div
                    className="mx-auto font-display font-black text-white"
                    style={{ fontSize: `${Math.max(22, poster.logoSizePercent * 0.3)}px` }}
                  >
                    {campaign.logoText ?? merchant.companyName}
                  </div>
                )}
                <div
                  className={`mx-auto max-w-[92%] text-balance font-black leading-[0.98] ${fontClass(poster.headlineFontFamily)}`}
                  style={{
                    marginTop: `${headlineMarginTop}px`,
                    color: poster.headlineTextColor,
                    fontSize: `${previewHeadlineSize}px`,
                    textShadow: "0 3px 0 rgba(0,0,0,0.24)",
                  }}
                >
                  {headlineLines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>

              {campaign.gameType === "wheel" ? (
                <div
                  className="absolute left-1/2 z-10 h-[43%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[16px] shadow-[0_18px_34px_rgba(0,0,0,0.26)]"
                  style={{ ...wheelStyle, top: wheelTop }}
                >
                  <div className="absolute inset-[9%] rounded-full border-[8px] border-black/70" />
                  {wheelSegments.map((segment, index) => (
                    <div
                      key={`${segment.label}-${index}`}
                      className="absolute left-1/2 top-1/2"
                      style={{
                        transform: `translate(-50%, -50%) rotate(${index * 60 - 60}deg)`,
                      }}
                    >
                      <div className="flex w-[160px] -translate-y-[128px] justify-center">
                        <div
                          className="max-w-[98px] -rotate-90 text-center text-[11px] font-black uppercase leading-[0.92]"
                          style={{ color: segment.textColor }}
                        >
                          {splitLines(segment.label, 10).slice(0, 2).map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="absolute left-1/2 top-1/2 h-[15%] w-[15%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#111827] ring-8 ring-white/18" />
                  <div className="absolute left-1/2 top-[1%] -translate-x-1/2">
                    <div className="h-0 w-0 border-l-[18px] border-r-[18px] border-t-0 border-b-[34px] border-l-transparent border-r-transparent border-b-white" />
                  </div>
                </div>
              ) : (
                <div
                  className="absolute left-1/2 z-10 w-[72%] -translate-x-1/2 -translate-y-1/2 rotate-[-4deg] rounded-[22px] border-[6px] border-[#111827]/90 bg-white p-3 shadow-[0_18px_32px_rgba(0,0,0,0.24)]"
                  style={{ top: scratchTop }}
                >
                  <div className="rounded-[18px] bg-[#f8fafc] p-4 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#111827]">
                      Ticket à gratter
                    </p>
                    <div className="mt-4 rounded-[16px] bg-[linear-gradient(135deg,#dde3ee,#ffffff,#b5bfd2)] px-4 py-8 text-[24px] font-black text-[#111827] shadow-inner">
                      Grattez ici
                    </div>
                    <div className="mt-4 rounded-[12px] bg-[#111827] px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-white">
                      {prizes[0]?.label ?? "Cadeau surprise"}
                    </div>
                  </div>
                </div>
              )}

              <div
                className="absolute left-[11%] z-20 -rotate-3 rounded-[10px] bg-black px-4 py-3 text-center text-[15px] font-black uppercase leading-tight text-white shadow-[0_10px_20px_rgba(0,0,0,0.18)]"
                style={{ top: scanTop }}
              >
                Scannez
                <br />
                pour jouer
              </div>
              <div
                className="absolute right-[12%] z-30 h-[28%] w-[42%] rotate-[-4deg] rounded-[14px] border-[6px] border-[#111827] bg-white p-3 shadow-[0_12px_26px_rgba(0,0,0,0.24)]"
                style={{ top: qrTop }}
              >
                <div className="h-full w-full rounded-[6px] bg-[radial-gradient(#111827_1.5px,transparent_1.5px)] [background-size:8px_8px]" />
              </div>

              <div
                className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-6 pt-5"
                style={{ backgroundColor: poster.footerBackgroundColor }}
              >
                <div className="grid grid-cols-3 gap-3 rounded-[18px] bg-white/94 px-3 py-4 text-center text-[#111827] shadow-[0_12px_24px_rgba(0,0,0,0.16)]">
                  {[
                    ["1", "Scannez", "le QR code"],
                    [
                      "2",
                      campaign.gameType === "wheel" ? "Faites tourner" : "Grattez",
                      campaign.gameType === "wheel" ? "la roue" : "le ticket",
                    ],
                    ["3", "Récupérez", "votre cadeau"],
                  ].map(([step, title, body]) => (
                    <div key={step} className="min-w-0">
                      <div className="text-xl font-black">{step}</div>
                      <div className="mt-1 text-[11px] font-black uppercase leading-tight">{title}</div>
                      <div className="text-[10px] font-semibold leading-tight text-[#4b5563]">{body}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
