"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useMemo, useState } from "react";

import { buildPosterSvg, createPosterPreviewQrDataUrl } from "@/lib/poster-render";
import { createPosterSettingsDefaults, normalizePosterSettings } from "@/lib/poster-utils";
import { Campaign, CampaignPosterSettings, PosterTemplateId, Prize } from "@/lib/types";

type PosterEditorProps = {
  campaign: Campaign;
  prizes: Prize[];
};

const posterTemplates: Array<{
  id: PosterTemplateId;
  label: string;
  description: string;
  backgroundColor: string;
  headlineTextColor: string;
  headlineFontSizePx: number;
  wheel: Pick<CampaignPosterSettings["wheel"], "winColor" | "alternateWinColor" | "loseColor" | "alternateLoseColor" | "rimColor">;
}> = [
  {
    id: "classic-wheel",
    label: "Classique blanc",
    description: "Fond clair, grand titre impactant, QR code très visible.",
    backgroundColor: "#fff6ee",
    headlineTextColor: "#050644",
    headlineFontSizePx: 50,
    wheel: {
      winColor: "#5438c8",
      alternateWinColor: "#fff7ef",
      loseColor: "#fff7ef",
      alternateLoseColor: "#fff7ef",
      rimColor: "#3c3c3c",
    },
  },
  {
    id: "soft-gradient-wheel",
    label: "Gradient clair",
    description: "Look plus premium avec roue + QR en superposition.",
    backgroundColor: "#f4f3ff",
    headlineTextColor: "#050644",
    headlineFontSizePx: 40,
    wheel: {
      winColor: "#4b35c9",
      alternateWinColor: "#fff7ef",
      loseColor: "#fff7ef",
      alternateLoseColor: "#fff7ef",
      rimColor: "#403c70",
    },
  },
  {
    id: "terracotta-wheel",
    label: "Terracotta",
    description: "Palette chaude pour un rendu restaurant plus chaleureux.",
    backgroundColor: "#ddc9b8",
    headlineTextColor: "#a82c1d",
    headlineFontSizePx: 50,
    wheel: {
      winColor: "#a83222",
      alternateWinColor: "#f8e4d8",
      loseColor: "#f8e4d8",
      alternateLoseColor: "#f8e4d8",
      rimColor: "#2b1d18",
    },
  },
];

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

function getPosterTemplate(templateId?: PosterTemplateId) {
  return posterTemplates.find((template) => template.id === templateId) ?? posterTemplates[0];
}

function applyTemplateDefaults(
  poster: CampaignPosterSettings,
  template = getPosterTemplate(poster.templateId),
  options: { preserveWinColor?: boolean } = {},
): CampaignPosterSettings {
  const winColor = options.preserveWinColor ? poster.wheel.winColor : template.wheel.winColor;

  return {
    ...poster,
    templateId: template.id,
    backgroundMode: "color",
    backgroundColor: template.backgroundColor,
    backgroundImageUrl: "",
    headlineTextColor: template.headlineTextColor,
    headlineFontSizePx: template.headlineFontSizePx,
    wheel: {
      ...poster.wheel,
      ...template.wheel,
      winColor,
      alternateWinColor: winColor,
    },
  };
}

export function PosterEditor({ campaign, prizes }: PosterEditorProps) {
  const router = useRouter();
  const [poster, setPoster] = useState<CampaignPosterSettings>(() => {
    const normalizedPoster = normalizePosterSettings(
      campaign.presentation.poster,
      createPosterSettingsDefaults({
        templateId: "classic-wheel",
        logoMode: campaign.logoMode ?? "text",
        logoText: campaign.logoText ?? "",
        logoUrl: campaign.logoUrl,
        logoSizePercent: campaign.presentation.logo.sizePercent,
        logoBottomMarginPx: campaign.presentation.logo.marginBottomPx,
        backgroundMode: "color",
        backgroundColor: "#fff6ee",
        backgroundImageUrl: "",
        headline: campaign.subtitle,
        headlineTextColor: "#050644",
        headlineFontSizePx: 50,
        headlineFontFamily: "display",
        wheel: posterTemplates[0].wheel,
        footerBackgroundColor: "transparent",
      }),
    );

    if (campaign.presentation.poster?.templateId) {
      const hasCustomWinColor =
        Boolean(campaign.presentation.poster.wheel?.winColor) &&
        campaign.presentation.poster.wheel?.winColor !== campaign.presentation.wheel.winColor;

      return applyTemplateDefaults(normalizedPoster, undefined, {
        preserveWinColor: hasCustomWinColor,
      });
    }

    const template = posterTemplates[0];

    return applyTemplateDefaults(
      {
        ...normalizedPoster,
        headlineFontFamily: "display",
      },
      template,
    );
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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

  function selectTemplate(templateId: PosterTemplateId) {
    const template = posterTemplates.find((item) => item.id === templateId);

    if (!template) return;

    setPoster((current) => ({
      ...current,
      templateId,
      backgroundMode: "color",
      backgroundColor: template.backgroundColor,
      backgroundImageUrl: "",
      headlineTextColor: template.headlineTextColor,
      headlineFontSizePx: template.headlineFontSizePx,
      wheel: {
        ...current.wheel,
        ...template.wheel,
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

  async function downloadPoster() {
    setIsDownloading(true);
    setMessage(null);

    try {
      const saveResponse = await fetch(`/api/campaigns/${campaign.id}/poster-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(poster),
      });
      const savePayload = (await saveResponse.json()) as { error?: string };

      if (!saveResponse.ok) {
        throw new Error(savePayload.error ?? "Enregistrement impossible.");
      }

      router.refresh();

      const response = await fetch(`/api/campaigns/${campaign.id}/poster?ts=${Date.now()}`);

      if (!response.ok) {
        throw new Error("Téléchargement impossible.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${campaign.id}-affiche-a4.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage("Affiche enregistrée et téléchargement lancé.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Téléchargement impossible.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="okado-label">Atelier affiche</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-[#111827] md:text-5xl">
            Personnaliser l&apos;affiche A4
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5c6577]">
            Cet écran ne modifie que l&apos;affiche imprimable. La page de jeu reste
            paramétrée dans l&apos;éditeur de campagne.
          </p>
          {message ? (
            <div className="mt-5 rounded-[var(--radius-card)] border border-[#dbe4f0] bg-white px-4 py-3 text-sm font-semibold text-[#182033] shadow-[0_10px_28px_rgba(122,136,166,0.10)]">
              {message}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/campaigns/${campaign.id}/edit`}
            prefetch={false}
            className="rounded-[var(--radius-card)] border border-[#d7e0ed] bg-white px-4 py-3 text-sm font-semibold text-[#182033] transition hover:border-[#111827]"
          >
            Revenir à la campagne
          </Link>
          <button
            type="button"
            onClick={savePoster}
            disabled={isSaving}
            className="rounded-[var(--radius-card)] bg-[#111827] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(17,24,39,0.2)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-220px)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)]">
        <div className="space-y-6">

        {campaign.gameType === "wheel" ? (
          <section className="okado-card p-6 md:p-8">
            <p className="okado-label">Template</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[#111827]">Choisir le design de l&apos;affiche</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {posterTemplates.map((template) => {
                const active = (poster.templateId ?? "classic-wheel") === template.id;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => selectTemplate(template.id)}
                    className={`group overflow-hidden rounded-[var(--radius-card)] border text-left transition hover:-translate-y-0.5 ${
                      active
                        ? "border-[#2f6df6] bg-[#eff4ff] shadow-[0_14px_34px_rgba(47,109,246,0.18)]"
                        : "border-[#d7e0ed] bg-white hover:border-[#2f6df6]"
                    }`}
                  >
                    <span
                      className="relative block h-[220px] overflow-hidden"
                      style={{ background: template.backgroundColor }}
                    >
                      <span
                        className="absolute -left-6 top-5 h-[200px] w-[200px] rounded-full border-[10px] shadow-[0_18px_34px_rgba(17,24,39,0.16)]"
                        style={{
                          borderColor: template.wheel.rimColor,
                          background: `conic-gradient(${template.wheel.winColor} 0 60deg, #fff7ef 60deg 120deg, ${template.wheel.winColor} 120deg 180deg, #fff7ef 180deg 240deg, ${template.wheel.winColor} 240deg 300deg, #fff7ef 300deg 360deg)`,
                        }}
                      />
                      <span
                        className="absolute bottom-5 right-5 grid h-20 w-20 grid-cols-5 gap-0.5 rounded-[14px] border-4 bg-white p-2"
                        style={{ borderColor: template.wheel.winColor }}
                      >
                        {Array.from({ length: 25 }).map((_, index) => (
                          <span
                            key={index}
                            className="rounded-[1px]"
                            style={{
                              backgroundColor:
                                [0, 1, 3, 4, 5, 9, 11, 12, 14, 15, 18, 20, 21, 23, 24].includes(
                                  index,
                                )
                                  ? "#111827"
                                  : "transparent",
                            }}
                          />
                        ))}
                      </span>
                    </span>
                    <span className="block p-4">
                      <span className="block text-sm font-semibold text-[#111827]">
                        {template.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#5c6577]">
                        {template.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="okado-card p-6 md:p-8">
          <p className="okado-label">Logo</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-[#111827]">Personnalisation du logo</h2>

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
                              ? poster.logoText || campaign.logoText || ""
                              : poster.logoText,
                        })
                      }
                      className={`rounded-[var(--radius-card)] border px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
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
                  className="w-full rounded-[var(--radius-card)] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none transition focus:border-[#2f6df6] focus:bg-white"
                />
              </label>
            ) : null}

            {poster.logoMode === "image" ? (
              <label className="group relative flex min-h-[132px] cursor-pointer flex-col justify-between rounded-[var(--radius-card)] border border-dashed border-[#cfd9ea] bg-[#f7f9fc] p-4 text-sm transition hover:border-[#2f6df6] hover:bg-[#eef4ff] md:col-span-2">
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
                  <span className="rounded-[var(--radius-card)] bg-[#2f6df6] px-4 py-2 text-xs font-semibold text-white">
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
                    className="w-full rounded-[var(--radius-card)] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none transition focus:border-[#2f6df6] focus:bg-white"
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
                    className="w-full rounded-[var(--radius-card)] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none transition focus:border-[#2f6df6] focus:bg-white"
                  />
                </label>
              </>
            ) : null}
          </div>
        </section>

        <section className="okado-card p-6 md:p-8">
          <p className="okado-label">Phrase d&apos;entête</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-[#111827]">
            Style du texte principal
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              <span className="mb-2 block text-[#616b7c]">Texte sous le logo</span>
              <textarea
                rows={4}
                value={poster.headline}
                onChange={(event) => updatePoster({ headline: event.target.value })}
                className="w-full rounded-[var(--radius-card)] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none transition focus:border-[#2f6df6] focus:bg-white"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Couleur du texte</span>
              <input
                type="color"
                value={poster.headlineTextColor}
                onChange={(event) => updatePoster({ headlineTextColor: event.target.value })}
                className="h-14 w-full rounded-[var(--radius-card)] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
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
                className="w-full rounded-[var(--radius-card)] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none transition focus:border-[#2f6df6] focus:bg-white"
              />
            </label>

          </div>
        </section>


        {campaign.gameType === "wheel" ? (
          <section className="okado-card p-6 md:p-8">
            <p className="okado-label">Couleur de la roue</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[#111827]">
              Réglez la roue de l&apos;affiche
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Couleur gain</span>
                <input
                  type="color"
                  value={poster.wheel.winColor}
                  onChange={(event) => updateWheel("winColor", event.target.value)}
                  className="h-14 w-full rounded-[var(--radius-card)] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                />
              </label>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="xl:sticky xl:top-6 xl:h-[calc(100vh-48px)]">
        <div className="okado-card flex h-full flex-col p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="okado-label">Prévisualisation</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-[#111827]">Affiche A4</h2>
            </div>
            <a
              href={`/api/campaigns/${campaign.id}/poster`}
              aria-busy={isDownloading}
              onClick={(event) => {
                event.preventDefault();
                void downloadPoster();
              }}
              className="rounded-[var(--radius-card)] bg-[#111827] px-4 py-3 text-sm font-semibold !text-white shadow-[0_12px_28px_rgba(17,24,39,0.2)] transition hover:-translate-y-0.5"
              style={{ color: "#ffffff" }}
            >
              Télécharger le PNG
            </a>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-[var(--radius-card)] bg-[#eef3fb] p-4">
            <div className="relative aspect-[794/1123] w-full max-w-[470px] overflow-hidden rounded-[18px] border border-[#d7e0ed] bg-white shadow-[0_24px_50px_rgba(17,24,39,0.14)]">
              <div
                aria-label="Prévisualisation affiche"
                className="h-full w-full [&_svg]:h-full [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: previewPosterSvg }}
              />
            </div>
          </div>
        </div>
      </aside>
    </div>
    </div>
  );
}
