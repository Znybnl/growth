"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useMemo, useState } from "react";

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

export function PosterEditor({ campaign, merchant, prizes }: PosterEditorProps) {
  const router = useRouter();
  const [poster, setPoster] = useState<CampaignPosterSettings>(campaign.presentation.poster);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const mainPrize = prizes[0]?.label ?? "Cadeau";

  const wheelStyle = useMemo(
    () => ({
      background: `conic-gradient(${poster.wheel.winColor} 0 60deg, ${poster.wheel.loseColor} 60deg 120deg, ${poster.wheel.alternateWinColor} 120deg 180deg, ${poster.wheel.alternateLoseColor} 180deg 240deg, ${poster.wheel.winColor} 240deg 300deg, ${poster.wheel.loseColor} 300deg 360deg)`,
      borderColor: poster.wheel.rimColor,
    }),
    [poster.wheel],
  );

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
    <div className="grid min-h-[calc(100vh-120px)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(430px,0.72fr)]">
      <div className="space-y-6">
        <section className="rounded-[8px] border border-[#dbe4f0] bg-white p-6 shadow-[0_16px_42px_rgba(122,136,166,0.1)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Atelier affiche</p>
              <h1 className="mt-3 text-4xl font-semibold text-[#111827]">
                Personnaliser l&apos;affiche A4
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5c6577]">
                Cet écran ne modifie que l&apos;affiche imprimable. La page publique reste paramétrée
                dans l&apos;éditeur de campagne.
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
                  PNG, JPG ou SVG. Le logo sera centré en haut de l&apos;affiche.
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
                  Utilisez un visuel fort pour donner un rendu plus proche d&apos;un flyer pro.
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
              <span className="mb-2 block text-[#616b7c]">Bandeau inférieur</span>
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
                Cette campagne utilise un ticket à gratter. L&apos;affiche affichera donc un ticket
                au lieu d&apos;une roue.
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
              className="relative aspect-[794/1123] max-h-full w-full max-w-[430px] overflow-hidden rounded-[18px] border-[10px] border-[#20242f] bg-cover bg-center shadow-[0_26px_80px_rgba(0,0,0,0.42)]"
              style={{
                backgroundColor: campaign.presentation.background.color,
                backgroundImage: poster.backgroundImageUrl
                  ? `linear-gradient(rgba(9,12,20,0.06), rgba(9,12,20,0.32)), url("${poster.backgroundImageUrl}")`
                  : undefined,
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.22))]" />
              <div className="absolute left-[10%] right-[10%] top-[6%] z-10 text-center">
                {poster.logoUrl ? (
                  <Image
                    src={poster.logoUrl}
                    alt="Logo affiche"
                    width={260}
                    height={120}
                    unoptimized
                    className="mx-auto max-h-[86px] object-contain"
                    style={{ width: `${Math.max(90, poster.logoSizePercent * 1.4)}px` }}
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
                  className={`mx-auto mt-5 max-w-[92%] text-balance font-black leading-[0.98] ${fontClass(poster.headlineFontFamily)}`}
                  style={{
                    color: poster.headlineTextColor,
                    fontSize: `${Math.max(22, poster.headlineFontSizePx * 0.62)}px`,
                    textShadow: "0 3px 0 rgba(0,0,0,0.24)",
                  }}
                >
                  {poster.headline}
                </div>
              </div>

              {campaign.gameType === "wheel" ? (
                <div
                  className="absolute left-1/2 top-[42%] z-10 h-[43%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[16px] shadow-[0_20px_45px_rgba(0,0,0,0.34)]"
                  style={wheelStyle}
                >
                  <div className="absolute inset-[9%] rounded-full border-[8px] border-black/70" />
                  <div className="absolute left-1/2 top-1/2 h-[15%] w-[15%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#111827] ring-8 ring-white/20" />
                  <div className="absolute left-1/2 top-[6%] -translate-x-1/2 rounded bg-white px-3 py-1 text-xs font-black text-[#111827] rotate-[-8deg]">
                    GAGNÉ !
                  </div>
                  <div className="absolute bottom-[15%] right-[8%] rounded bg-[#111827] px-3 py-1 text-xs font-black text-white rotate-[9deg]">
                    PERDU
                  </div>
                </div>
              ) : (
                <div className="absolute left-1/2 top-[43%] z-10 w-[72%] -translate-x-1/2 -translate-y-1/2 rotate-[-4deg] rounded-[18px] border-[8px] border-[#111827] bg-white p-4 shadow-[0_20px_45px_rgba(0,0,0,0.34)]">
                  <div className="rounded-[14px] border-2 border-dashed border-[#111827] bg-[#f1f5fb] p-5 text-center">
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[#111827]">Ticket à gratter</p>
                    <div className="mt-4 rounded-[14px] bg-[linear-gradient(135deg,#d7dce8,#ffffff,#aeb7ca)] px-4 py-8 text-xl font-black text-[#111827] shadow-inner">
                      Grattez ici
                    </div>
                    <p className="mt-4 text-sm font-bold text-[#475063]">{mainPrize}</p>
                  </div>
                </div>
              )}

              <div className="absolute left-[11%] top-[58%] z-20 -rotate-3 rounded-[8px] bg-black px-4 py-3 text-center text-lg font-black uppercase leading-tight text-white shadow-[0_14px_28px_rgba(0,0,0,0.28)]">
                Scannez<br />pour jouer
              </div>
              <div className="absolute right-[12%] top-[55%] z-30 h-[28%] w-[42%] rotate-[-4deg] rounded-[14px] border-[7px] border-[#111827] bg-white p-3 shadow-[0_18px_36px_rgba(0,0,0,0.34)]">
                <div className="h-full w-full rounded-[6px] bg-[radial-gradient(#111827_1.5px,transparent_1.5px)] [background-size:8px_8px]" />
              </div>

              <div
                className="absolute bottom-0 left-0 right-0 z-20 px-6 py-5"
                style={{ backgroundColor: poster.footerBackgroundColor }}
              >
                <div className="grid grid-cols-3 gap-3 rounded-[8px] bg-white/92 px-3 py-4 text-center text-[#111827] shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
                  {[
                    ["1", "Scannez", "le QR code"],
                    ["2", campaign.gameType === "wheel" ? "Faites tourner" : "Grattez", campaign.gameType === "wheel" ? "la roue" : "le ticket"],
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
