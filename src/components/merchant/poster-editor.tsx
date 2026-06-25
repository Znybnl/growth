"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useMemo, useState } from "react";

import { buildPosterSvg, createPosterPreviewQrDataUrl } from "@/lib/poster-render";
import { createPosterSettingsDefaults, normalizePosterSettings } from "@/lib/poster-utils";
import { Campaign, CampaignPosterSettings, Prize, TextFont } from "@/lib/types";

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
        logoMode: campaign.logoMode ?? "text",
        logoText: campaign.logoText ?? campaign.title,
        logoUrl: campaign.logoUrl,
        logoSizePercent: campaign.presentation.logo.sizePercent,
        logoBottomMarginPx: campaign.presentation.logo.marginBottomPx,
        backgroundMode: campaign.presentation.background.mode,
        backgroundColor: campaign.presentation.background.color,
        backgroundImageUrl: campaign.presentation.background.imageUrl ?? "",
        headline: campaign.subtitle,
        headlineTextColor: campaign.presentation.heading.textColor,
        headlineFontSizePx: campaign.presentation.heading.fontSizePx,
        headlineFontFamily: campaign.presentation.heading.fontFamily,
        wheel: campaign.presentation.wheel,
        footerBackgroundColor: "transparent",
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
        ...(key === "winColor" ? { alternateWinColor: value } : {}),
        ...(key === "loseColor" ? { alternateLoseColor: value } : {}),
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
    <div className="grid min-h-[calc(100vh-120px)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.8fr)]">
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
          <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Logo</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#111827]">Personnalisation du logo</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="text-sm md:col-span-2">
              <span className="mb-3 block text-[#616b7c]">Type de logo</span>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { value: "text", label: "Texte" },
                  { value: "image", label: "Image" },
                  { value: "none", label: "Aucun" },
                ].map((mode) => {
                  const active = (poster.logoMode ?? "none") === mode.value;

                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() =>
                        updatePoster({
                          logoMode: mode.value as CampaignPosterSettings["logoMode"],
                          logoText:
                            mode.value === "text"
                              ? poster.logoText || campaign.logoText || campaign.title
                              : poster.logoText,
                        })
                      }
                      className={`rounded-[8px] border px-4 py-3 text-sm font-semibold ${
                        active
                          ? "border-[#2f6df6] bg-[#eff4ff] text-[#214ccf]"
                          : "border-[#d7e0ed] bg-[#f7f9fc] text-[#182033]"
                      }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {poster.logoMode === "text" ? (
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block text-[#616b7c]">
                  Texte affiché à la place du logo
                </span>
                <input
                  value={poster.logoText ?? ""}
                  onChange={(event) => updatePoster({ logoText: event.target.value })}
                  className="w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>
            ) : null}

            {poster.logoMode === "image" ? (
              <label className="group relative flex min-h-[132px] cursor-pointer flex-col justify-between rounded-[8px] border border-dashed border-[#cfd9ea] bg-[#f7f9fc] p-4 text-sm transition hover:border-[#2f6df6] hover:bg-[#eef4ff] md:col-span-2">
                <div>
                  <span className="mb-2 block text-[#616b7c]">Importer le logo affiche</span>
                  <p className="max-w-md text-sm leading-6 text-[#516073]">
                    PNG, JPG ou SVG. Le logo restera centré en haut de l&apos;affiche.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#214ccf] shadow-sm">
                    {poster.logoUrl || campaign.logoUrl ? "Logo chargé" : "Aucun logo"}
                  </span>
                  <span className="rounded-[8px] bg-[#2f6df6] px-4 py-2 text-xs font-semibold text-white">
                    Choisir
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    uploadAsDataUrl(event, (value) =>
                      updatePoster({ logoMode: "image", logoUrl: value }),
                    )
                  }
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
            ) : null}

            {poster.logoMode !== "none" ? (
              <>
                <label className="text-sm">
                  <span className="mb-2 block text-[#616b7c]">Taille du logo (%)</span>
                  <input
                    type="number"
                    min={40}
                    max={180}
                    value={poster.logoSizePercent}
                    onChange={(event) =>
                      updatePoster({ logoSizePercent: Number(event.target.value || 100) })
                    }
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
              </>
            ) : null}
          </div>
        </section>

        <section className="rounded-[8px] border border-[#dbe4f0] bg-white p-6 shadow-[0_16px_42px_rgba(122,136,166,0.1)]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Phrase d&apos;entête</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
            Style du texte principal
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              <span className="mb-2 block text-[#616b7c]">Texte sous le logo</span>
              <textarea
                rows={4}
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
                onChange={(event) =>
                  updatePoster({ headlineFontSizePx: Number(event.target.value || 42) })
                }
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
          <h2 className="mt-2 text-2xl font-semibold text-[#111827]">Fond</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="text-sm md:col-span-2">
              <span className="mb-3 block text-[#616b7c]">Type de fond</span>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { value: "color", label: "Couleur de fond" },
                  { value: "image", label: "Image de fond" },
                ].map((mode) => {
                  const active = (poster.backgroundMode ?? "color") === mode.value;

                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() =>
                        updatePoster({
                          backgroundMode: mode.value as CampaignPosterSettings["backgroundMode"],
                        })
                      }
                      className={`rounded-[8px] border px-4 py-3 text-sm font-semibold ${
                        active
                          ? "border-[#2f6df6] bg-[#eff4ff] text-[#214ccf]"
                          : "border-[#d7e0ed] bg-[#f7f9fc] text-[#182033]"
                      }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {poster.backgroundMode === "color" ? (
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Couleur de fond</span>
                <input
                  type="color"
                  value={poster.backgroundColor ?? "#ffffff"}
                  onChange={(event) => updatePoster({ backgroundColor: event.target.value })}
                  className="h-14 w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                />
              </label>
            ) : null}

            {poster.backgroundMode === "image" ? (
              <label className="group relative flex min-h-[132px] cursor-pointer flex-col justify-between rounded-[8px] border border-dashed border-[#cfd9ea] bg-[#f7f9fc] p-4 text-sm transition hover:border-[#2f6df6] hover:bg-[#eef4ff] md:col-span-2">
                <div>
                  <span className="mb-2 block text-[#616b7c]">Image de fond de l&apos;affiche</span>
                  <p className="max-w-md text-sm leading-6 text-[#516073]">
                    Utilisez un visuel fort pour obtenir un rendu plus proche d&apos;un flyer
                    final.
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
                    uploadAsDataUrl(event, (value) =>
                      updatePoster({ backgroundMode: "image", backgroundImageUrl: value }),
                    )
                  }
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
            ) : null}
          </div>
        </section>

        {campaign.gameType === "wheel" ? (
          <section className="rounded-[8px] border border-[#dbe4f0] bg-white p-6 shadow-[0_16px_42px_rgba(122,136,166,0.1)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Couleur de la roue</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              Réglez la roue de l&apos;affiche
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Couleur gain</span>
                <input
                  type="color"
                  value={poster.wheel.winColor}
                  onChange={(event) => updateWheel("winColor", event.target.value)}
                  className="h-14 w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Couleur perdu</span>
                <input
                  type="color"
                  value={poster.wheel.loseColor}
                  onChange={(event) => updateWheel("loseColor", event.target.value)}
                  className="h-14 w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                />
              </label>

              <label className="text-sm md:col-span-2">
                <span className="mb-2 block text-[#616b7c]">Couleur de la bordure de la roue</span>
                <input
                  type="color"
                  value={poster.wheel.rimColor}
                  onChange={(event) => updateWheel("rimColor", event.target.value)}
                  className="h-14 w-full rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                />
              </label>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="xl:sticky xl:top-6 xl:h-[calc(100vh-48px)]">
        <div className="flex h-full flex-col rounded-[8px] border border-[#dbe4f0] bg-white p-5 shadow-[0_24px_70px_rgba(17,24,39,0.08)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#7b8496]">Prévisualisation</p>
              <h2 className="mt-1 text-xl font-semibold text-[#111827]">Affiche A4</h2>
            </div>
            <a
              href={`/api/campaigns/${campaign.id}/poster`}
              className="rounded-[8px] bg-[#111827] px-4 py-3 text-sm font-semibold !text-white"
              style={{ color: "#ffffff" }}
            >
              Télécharger le PNG
            </a>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-[8px] bg-[#eef3fb] p-4">
            <div className="relative aspect-[794/1123] w-full max-w-[470px] overflow-hidden rounded-[18px] border border-[#d7e0ed] bg-white shadow-[0_24px_50px_rgba(17,24,39,0.14)]">
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
