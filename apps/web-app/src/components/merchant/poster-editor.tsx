"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { buildPosterSvg, createPosterPreviewQrDataUrl } from "@/lib/poster-render";
import { createPosterSettingsDefaults, normalizePosterSettings } from "@/lib/poster-utils";
import { Campaign, CampaignPosterSettings, PosterTemplateId, Prize } from "@/lib/types";
import { getPosterTemplate, POSTER_TEMPLATES } from "@/lib/poster-templates";
import { PosterTemplateSelector } from "@/components/merchant/poster-template-selector";
import { PageHeader } from "@/components/ui/workspace";

type PosterEditorProps = {
  campaign: Campaign;
  prizes: Prize[];
};

const MAX_UPLOAD_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function uploadAsDataUrl(
  event: ChangeEvent<HTMLInputElement>,
  onLoaded: (value: string) => void,
  onError?: (message: string) => void,
) {
  const file = event.target.files?.[0];

  if (!file) return;

  if (file.type && !ACCEPTED_IMAGE_TYPES.has(file.type)) {
    event.target.value = "";
    onError?.("Format d'image non pris en charge. Utilisez un PNG, JPEG, WebP ou GIF.");
    return;
  }

  if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
    event.target.value = "";
    onError?.("Image trop volumineuse. Importez une image de 2 Mo maximum.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      onLoaded(reader.result);
    }
  };
  reader.readAsDataURL(file);
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function renderPosterSvgAsPng(svg: string) {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new window.Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Prévisualisation impossible à convertir en PNG."));
      image.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 794;
    canvas.height = 1123;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Conversion PNG indisponible dans ce navigateur.");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Création du fichier PNG impossible."));
      }, "image/png");
    });

    return pngBlob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function isTemplateDefaultWinColor(color: string | undefined) {
  return (
    POSTER_TEMPLATES.some((template) => template.wheel.winColor === color) ||
    color === "#1b2842" ||
    color === "#f4c14a"
  );
}

function applyTemplateDefaults(
  poster: CampaignPosterSettings,
  template = getPosterTemplate(poster.templateId),
  options: {
    preserveWinColor?: boolean;
    preserveHeadlineTextColor?: boolean;
    defaultWinColor?: string;
  } = {},
): CampaignPosterSettings {
  const winColor = options.preserveWinColor
    ? poster.wheel.winColor
    : options.defaultWinColor ?? template.wheel.winColor;
  const headlineTextColor = options.preserveHeadlineTextColor
    ? poster.headlineTextColor
    : template.headlineTextColor;

  return {
    ...poster,
    templateId: template.id,
    backgroundMode: "color",
    backgroundColor: template.background,
    backgroundImageUrl: "",
    headlineTextColor,
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
  const campaignPrimaryColor =
    campaign.gameType === "scratch"
      ? campaign.accent.signal
      : campaign.presentation.wheel.loseColor;
  const campaignGainColor = campaign.presentation.wheel.winColor;
  const [poster, setPoster] = useState<CampaignPosterSettings>(() => {
    const normalizedPoster = normalizePosterSettings(
      campaign.presentation.poster,
      createPosterSettingsDefaults({
        templateId: "classic-wheel",
        logoMode: campaign.logoMode ?? "text",
        logoText: campaign.logoText ?? "",
        logoUrl: campaign.logoUrl,
        logoSizePercent: campaign.presentation.poster?.logoSizePercent ?? 70,
        logoBottomMarginPx: campaign.presentation.poster?.logoBottomMarginPx ?? 6,
        backgroundMode: "color",
        backgroundColor: "#fff6ee",
        backgroundImageUrl: "",
        headline: campaign.subtitle,
        headlineTextColor: campaignGainColor,
        headlineFontSizePx: 50,
        headlineFontFamily: campaign.presentation.heading.fontFamily,
        wheel: {
          ...POSTER_TEMPLATES[0].wheel,
          winColor: campaignPrimaryColor,
          alternateWinColor: campaignPrimaryColor,
        },
        footerBackgroundColor: "transparent",
      }),
    );

    if (campaign.presentation.poster?.templateId) {
      const template = getPosterTemplate(campaign.presentation.poster.templateId);
      const storedWinColor = campaign.presentation.poster.wheel?.winColor;
      const storedHeadlineTextColor = campaign.presentation.poster.headlineTextColor;
      const hasCustomWinColor =
        Boolean(storedWinColor) &&
        !isTemplateDefaultWinColor(storedWinColor) &&
        storedWinColor !== campaignPrimaryColor &&
        storedWinColor !== campaignGainColor &&
        storedWinColor !== campaign.presentation.wheel.loseColor;
      const hasCustomHeadlineTextColor =
        Boolean(storedHeadlineTextColor) &&
        storedHeadlineTextColor !== template.headlineTextColor &&
        storedHeadlineTextColor !== campaignGainColor &&
        storedHeadlineTextColor !== "#f4c14a";

      return applyTemplateDefaults(
        {
          ...normalizedPoster,
          headlineFontFamily:
            campaign.gameType === "scratch"
              ? campaign.presentation.heading.fontFamily
              : normalizedPoster.headlineFontFamily,
          headlineTextColor: hasCustomHeadlineTextColor
            ? normalizedPoster.headlineTextColor
            : campaign.gameType === "scratch"
              ? "#1b2842"
              : campaignGainColor,
          wheel: {
            ...normalizedPoster.wheel,
            winColor: hasCustomWinColor ? normalizedPoster.wheel.winColor : campaignPrimaryColor,
            alternateWinColor: hasCustomWinColor
              ? normalizedPoster.wheel.winColor
              : campaignPrimaryColor,
          },
        },
        template,
        {
          preserveWinColor: hasCustomWinColor,
          preserveHeadlineTextColor: true,
          defaultWinColor: campaignPrimaryColor,
        },
      );
    }

    const template = POSTER_TEMPLATES[0];

    return applyTemplateDefaults(
      {
        ...normalizedPoster,
        headlineTextColor: campaign.gameType === "scratch" ? "#1b2842" : campaignGainColor,
        headlineFontFamily: "roboto",
        wheel: {
          ...normalizedPoster.wheel,
          winColor: campaignPrimaryColor,
          alternateWinColor: campaignPrimaryColor,
        },
      },
      template,
      { preserveWinColor: true, preserveHeadlineTextColor: true },
    );
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [draftWinColor, setDraftWinColor] = useState(poster.wheel.winColor);

  useEffect(() => {
    if (draftWinColor === poster.wheel.winColor) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setPoster((current) => ({
        ...current,
        wheel: {
          ...current.wheel,
          winColor: draftWinColor,
          alternateWinColor: draftWinColor,
        },
      }));
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [draftWinColor, poster.wheel.winColor]);

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

  function selectTemplate(templateId: PosterTemplateId) {
    const template = POSTER_TEMPLATES.find((item) => item.id === templateId);

    if (!template) return;

    setPoster((current) => ({
      ...current,
      templateId,
      backgroundMode: "color",
      backgroundColor: template.background,
      backgroundImageUrl: "",
      headlineFontSizePx: template.headlineFontSizePx,
      wheel: {
        ...current.wheel,
        ...template.wheel,
        winColor: current.wheel.winColor,
        alternateWinColor: current.wheel.winColor,
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

      let blob: Blob | null = null;
      try {
        const response = await fetch(`/api/campaigns/${campaign.id}/poster?ts=${Date.now()}`);
        if (response.ok) {
          blob = await response.blob();
        }
      } catch {
        // The local conversion below keeps the download available if the server export fails.
      }

      if (!blob) {
        const campaignQrDataUrl = await QRCode.toDataURL(
          `${window.location.origin}/campaign/${campaign.id}`,
          {
            margin: 1,
            width: 720,
            color: { dark: "#111827", light: "#ffffff" },
          },
        );
        blob = await renderPosterSvgAsPng(
          buildPosterSvg({
            campaign,
            poster,
            prizes,
            qrDataUrl: campaignQrDataUrl,
          }),
        );
      }

      downloadBlob(blob, `${campaign.id}-affiche-a4-a5.png`);
      setMessage("Affiche enregistrée et téléchargement lancé.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Téléchargement impossible.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="okado-poster-editor space-y-6">
      <div>
        <PageHeader
          eyebrow="Atelier affiche"
          title="Personnaliser l&apos;affiche A4 / A5"
          description="Cet écran ne modifie que l&apos;affiche imprimable. La page de jeu reste paramétrée dans l&apos;éditeur de campagne."
          actions={<>
            <Link
              href={`/campaigns/${campaign.id}/edit/guided`}
              prefetch={false}
              className="okado-primary-action px-4"
            >
              Revenir à la campagne
            </Link>
            <button
              type="button"
              onClick={savePoster}
              disabled={isSaving}
              className="okado-filled-action px-5 disabled:opacity-60"
            >
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </>}
        />
        <div className="px-1">
          {message ? (
            <div className="mt-5 rounded-[8px] border border-border bg-white px-4 py-3 text-sm font-semibold text-graphite shadow-product-card">
              {message}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-220px)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)]">
        <div className="space-y-6">

        <PosterTemplateSelector
          gameType={campaign.gameType}
          selectedTemplateId={poster.templateId}
          onSelect={selectTemplate}
        />

        <section className="okado-card p-6 md:p-8">
          <p className="okado-label">Logo</p>
          <h2 className="okado-section-title mt-2">Personnalisation du logo</h2>

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
                          ? "border-aubergine bg-purple-haze text-aubergine"
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
                  className="w-full rounded-[var(--okado-radius-control)] border border-border bg-soft-white px-4 py-3 outline-none transition focus:border-aubergine focus:bg-white"
                />
              </label>
            ) : null}

            {poster.logoMode === "image" ? (
              <div className="md:col-span-2">
              <label className="group relative flex min-h-[132px] cursor-pointer flex-col justify-between rounded-[var(--okado-radius-card)] border border-dashed border-border bg-soft-white p-4 text-sm transition hover:border-aubergine hover:bg-purple-haze">
                <div>
                  <span className="mb-2 block text-[#616b7c]">Importer le logo affiche</span>
                  <p className="max-w-md text-sm leading-6 text-[#516073]">
                    PNG, JPEG, WebP ou GIF, 2 Mo maximum. Le logo restera centré en haut de l&apos;affiche.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="inline-flex rounded-[4px] bg-white px-3 py-2 text-xs font-semibold text-aubergine shadow-sm">
                    {poster.logoUrl || campaign.logoUrl ? "Logo chargé" : "Aucun logo"}
                  </span>
                  <span className="rounded-[4px] bg-aubergine px-4 py-2 text-xs font-semibold text-white">
                    Choisir
                  </span>
                </div>
                {poster.logoUrl || campaign.logoUrl ? (
                  <div className="mt-4 flex min-h-[86px] items-center justify-center rounded-[18px] border border-white bg-white/80 p-3 shadow-inner">
                    <Image
                      src={poster.logoUrl || campaign.logoUrl || ""}
                      alt="Aperçu du logo"
                      width={220}
                      height={92}
                      unoptimized
                      className="max-h-[70px] w-auto object-contain"
                    />
                  </div>
                ) : null}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) =>
                    uploadAsDataUrl(
                      event,
                      (value) => {
                        setImageUploadError(null);
                        updatePoster({ logoMode: "image", logoUrl: value });
                      },
                      setImageUploadError,
                    )
                  }
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              {imageUploadError ? (
                <p role="alert" className="mt-2 text-sm font-medium text-[#b42318]">
                  {imageUploadError}
                </p>
              ) : null}
              </div>
            ) : null}

            {poster.logoMode !== "none" ? (
              <>
                <label className="text-sm">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[#616b7c]">Taille du logo (%)</span>
                    <output className="font-semibold text-[#182033]">
                      {Math.round(poster.logoSizePercent)}%
                    </output>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={1}
                    value={poster.logoSizePercent}
                    onChange={(event) =>
                      updatePoster({ logoSizePercent: Number(event.target.value) })
                    }
                    className="w-full cursor-pointer accent-aubergine"
                    aria-label="Taille du logo"
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
                  className="w-full rounded-[var(--okado-radius-control)] border border-border bg-soft-white px-4 py-3 outline-none transition focus:border-aubergine focus:bg-white"
                  />
                </label>
              </>
            ) : null}
          </div>
        </section>

        <section className="okado-card p-6 md:p-8">
          <p className="okado-label">Phrase d&apos;entête</p>
          <h2 className="okado-section-title mt-2">
            Style du texte principal
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              <span className="mb-2 block text-[#616b7c]">Texte sous le logo</span>
              <textarea
                rows={4}
                value={poster.headline}
                onChange={(event) => updatePoster({ headline: event.target.value })}
                className="w-full rounded-[var(--okado-radius-control)] border border-border bg-soft-white px-4 py-3 outline-none transition focus:border-aubergine focus:bg-white"
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
                className="w-full rounded-[var(--okado-radius-control)] border border-border bg-soft-white px-4 py-3 outline-none transition focus:border-aubergine focus:bg-white"
              />
            </label>

          </div>
        </section>


        <section className="okado-card p-6 md:p-8">
            <p className="okado-label">Couleur de l&apos;affiche</p>
            <h2 className="okado-section-title mt-2">
              Personnalisez la couleur principale de l&apos;affiche
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Couleur principale</span>
                <input
                  type="color"
                  value={draftWinColor}
                  onChange={(event) => setDraftWinColor(event.target.value)}
                  onBlur={() => updateWheel("winColor", draftWinColor)}
                  className="h-14 w-full rounded-[var(--radius-card)] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                />
              </label>
            </div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-6 xl:h-[calc(100vh-48px)]">
        <div className="okado-card flex h-full flex-col p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="okado-label">Prévisualisation</p>
              <h2 className="okado-section-title mt-1">Affiche A4 / A5</h2>
            </div>
            <a
              href={`/api/campaigns/${campaign.id}/poster`}
              aria-busy={isDownloading}
              onClick={(event) => {
                event.preventDefault();
                void downloadPoster();
              }}
              className="okado-filled-action px-4 text-sm"
              style={{ color: "#ffffff" }}
            >
              Télécharger le PNG
            </a>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-[var(--okado-radius-card)] bg-[var(--okado-surface-muted)] p-4">
            <div className="relative aspect-[794/1123] w-full max-w-[470px] overflow-hidden rounded-[var(--okado-radius-control)] border border-[var(--okado-border-control)] bg-white shadow-[var(--shadow-product-card)]">
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
    </div>
  );
}
