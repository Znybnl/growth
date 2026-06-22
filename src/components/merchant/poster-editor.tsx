"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useMemo, useState } from "react";

import {
  buildPosterSvg,
  createPosterPreviewQrDataUrl,
} from "@/lib/poster-render";
import {
  createPosterSettingsDefaults,
  normalizePosterSettings,
} from "@/lib/poster-utils";
import {
  Campaign,
  CampaignPosterSettings,
  Prize,
  TextFont,
} from "@/lib/types";

type PosterEditorProps = {
  campaign: Campaign;
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

function fontLabel(font: TextFont) {
  if (font === "serif") return "Serif";
  if (font === "sans") return "Sans";
  return "Display";
}

export function PosterEditor({ campaign, prizes }: PosterEditorProps) {
  const router = useRouter();
  const [poster, setPoster] = useState<CampaignPosterSettings>(() =>
    normalizePosterSettings(
      campaign.presentation.poster,
      createPosterSettingsDefaults({
        logoUrl: undefined,
        logoSizePercent: campaign.presentation.logo.sizePercent,
        logoBottomMarginPx: campaign.presentation.logo.marginBottomPx,
        backgroundImageUrl: "",
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

  const previewPosterSvg = useMemo(
    () =>
      buildPosterSvg({
        campaign,
        poster,
        prizes,
        qrDataUrl: createPosterPreviewQrDataUrl(),
      }),
    [campaign, poster, prizes],
  );
  const previewPosterUrl = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(previewPosterSvg)}`,
    [previewPosterSvg],
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
                Cet écran ne modifie que l&apos;affiche imprimable. La page de jeu reste
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
                  {poster.logoUrl ? "Logo chargé" : "Aucun logo"}
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
                  {poster.backgroundImageUrl ? "Image chargée" : "Aucune image"}
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
            <div className="relative aspect-[794/1123] max-h-full w-full max-w-[440px] overflow-hidden rounded-[18px] border-[10px] border-[#20242f] shadow-[0_26px_80px_rgba(0,0,0,0.42)]">
              <Image
                src={previewPosterUrl}
                alt="Prévisualisation affiche"
                fill
                unoptimized
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

