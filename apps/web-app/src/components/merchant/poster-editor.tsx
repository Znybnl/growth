"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { buildPosterSvg } from "@/lib/poster-render";
import { getPosterFontSourceUrl, POSTER_FONT_OPTIONS } from "@/lib/poster-fonts";
import { textFontClass, textFontLabel } from "@/lib/format";
import {
  createPosterSettingsDefaults,
  MAX_POSTER_HEADLINE_LENGTH,
  normalizePosterSettings,
} from "@/lib/poster-utils";
import { captureClientProductEvent } from "@/lib/client-product-analytics";
import { Campaign, CampaignPosterSettings, PosterTemplateId, Prize } from "@/lib/types";
import { getPosterTemplate, POSTER_TEMPLATES } from "@/lib/poster-templates";
import { PosterTemplateSelector } from "@/components/merchant/poster-template-selector";
import { ValidationDialog } from "@/components/ui/validation-dialog";
import { PageHeader } from "@/components/ui/workspace";

type PosterEditorProps = {
  campaign: Campaign;
  prizes: Prize[];
};

const MAX_UPLOAD_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

type PosterPngPreview = {
  svg: string;
  blob: Blob;
  url: string;
};

type PendingPosterNavigation = {
  href: string;
};

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

async function loadPosterFontAsDataUrl(font: CampaignPosterSettings["headlineFontFamily"]) {
  const source = getPosterFontSourceUrl(font);

  if (!source) {
    return "";
  }

  try {
    const response = await fetch(source, { cache: "force-cache" });

    if (!response.ok) {
      return source;
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }

    return `data:font/ttf;base64,${window.btoa(binary)}`;
  } catch {
    return source;
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
    backgroundColor:
      template.id === "classic-wheel" && poster.backgroundMode === "color"
        ? poster.backgroundColor || template.background
        : template.background,
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
  const [lastSavedPosterSnapshot, setLastSavedPosterSnapshot] = useState(() =>
    JSON.stringify(poster),
  );
  const [pendingNavigation, setPendingNavigation] = useState<PendingPosterNavigation | null>(null);
  const [isSavingBeforeNavigation, setIsSavingBeforeNavigation] = useState(false);
  const [downloadConfirmationOpen, setDownloadConfirmationOpen] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [draftWinColor, setDraftWinColor] = useState(poster.wheel.winColor);
  const [posterQrDataUrl, setPosterQrDataUrl] = useState<string | null>(null);
  const [loadedPosterFont, setLoadedPosterFont] = useState<{
    font: CampaignPosterSettings["headlineFontFamily"];
    source: string;
  } | null>(null);
  const [previewPng, setPreviewPng] = useState<PosterPngPreview | null>(null);
  const [previewError, setPreviewError] = useState<{ svg: string; message: string } | null>(null);
  const [posterQrError, setPosterQrError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void QRCode.toDataURL(`${window.location.origin}/campaign/${campaign.id}`, {
      margin: 1,
      width: 720,
      color: { dark: "#111827", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (active) {
          setPosterQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setPosterQrError("Prévisualisation indisponible : création du QR code impossible.");
        }
      });

    return () => {
      active = false;
    };
  }, [campaign.id]);

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

  useEffect(() => {
    let active = true;

    void loadPosterFontAsDataUrl(poster.headlineFontFamily).then((source) => {
      if (active) {
        setLoadedPosterFont({ font: poster.headlineFontFamily, source });
      }
    });

    return () => {
      active = false;
    };
  }, [poster.headlineFontFamily]);

  const posterFontSource =
    loadedPosterFont?.font === poster.headlineFontFamily ? loadedPosterFont.source : null;

  const previewPosterSvg = useMemo(
    () =>
      posterQrDataUrl && posterFontSource !== null
        ? buildPosterSvg({
            campaign,
            poster,
            prizes,
            qrDataUrl: posterQrDataUrl,
            posterFontSource: posterFontSource || undefined,
          })
        : null,
    [campaign, poster, posterFontSource, posterQrDataUrl, prizes],
  );

  useEffect(() => {
    if (!previewPosterSvg) {
      return;
    }

    let active = true;
    let objectUrl: string | null = null;

    void renderPosterSvgAsPng(previewPosterSvg)
      .then((blob) => {
        if (!active) return;

        objectUrl = URL.createObjectURL(blob);
        setPreviewPng({ svg: previewPosterSvg, blob, url: objectUrl });
      })
      .catch((error) => {
        if (active) {
          setPreviewError({
            svg: previewPosterSvg,
            message: error instanceof Error ? error.message : "Prévisualisation impossible.",
          });
        }
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [previewPosterSvg]);

  const previewIsReady = Boolean(previewPosterSvg && previewPng?.svg === previewPosterSvg);
  const currentPreviewError =
    (previewPosterSvg && previewError?.svg === previewPosterSvg
      ? previewError.message
      : null) ?? posterQrError;
  const isRenderingPreview = Boolean(previewPosterSvg && !previewIsReady && !currentPreviewError);
  const isDirty = lastSavedPosterSnapshot !== JSON.stringify(poster);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "Quitter l’éditeur ?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty || pendingNavigation) return;

    function handleInternalNavigation(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return;

      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const current = new URL(window.location.href);
      if (destination.href === current.href) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingNavigation({
        href: `${destination.pathname}${destination.search}${destination.hash}`,
      });
    }

    window.addEventListener("click", handleInternalNavigation, true);
    return () => window.removeEventListener("click", handleInternalNavigation, true);
  }, [isDirty, pendingNavigation]);

  function updatePoster(patch: Partial<CampaignPosterSettings>) {
    const logoKeys = new Set([
      "logoMode",
      "logoText",
      "logoUrl",
      "logoSizePercent",
      "logoBottomMarginPx",
    ]);
    const changesLogo = Object.keys(patch).some((key) => logoKeys.has(key));

    setPoster((current) => ({
      ...current,
      ...patch,
      ...(changesLogo ? { logoSource: "poster" as const } : {}),
    }));
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

      setLastSavedPosterSnapshot(JSON.stringify(poster));
      setMessage("Affiche enregistrée.");
      router.refresh();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Enregistrement impossible.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAndLeave() {
    if (!pendingNavigation || isSavingBeforeNavigation) return;

    const destination = pendingNavigation.href;
    setIsSavingBeforeNavigation(true);
    const saved = await savePoster();
    setIsSavingBeforeNavigation(false);

    if (!saved) return;

    setPendingNavigation(null);
    router.push(destination);
  }

  function leaveWithoutSaving() {
    if (!pendingNavigation || isSavingBeforeNavigation) return;

    const destination = pendingNavigation.href;
    setPendingNavigation(null);
    router.push(destination);
  }

  function handleDownloadClick() {
    if (isDirty) {
      setDownloadConfirmationOpen(true);
      return;
    }

    void downloadPoster();
  }

  async function downloadPoster() {
    setIsDownloading(true);
    setMessage(null);

    try {
      if (isDirty) {
        const saved = await savePoster();
        if (!saved) return;
      }

      if (!previewPosterSvg || !previewIsReady || !previewPng) {
        throw new Error("Le rendu de l’affiche n’est pas encore prêt.");
      }

      downloadBlob(previewPng.blob, `${campaign.id}-affiche-a4-a5.png`);
      captureClientProductEvent("poster_downloaded", {
        campaignId: campaign.id,
        template: poster.templateId ?? "default",
        format: "png",
        gameType: campaign.gameType,
      });
      setMessage(isDirty ? "Affiche enregistrée et téléchargement lancé." : "Téléchargement lancé.");
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

        {poster.templateId === "classic-wheel" ? (
          <section className="okado-card p-6 md:p-8">
            <p className="okado-label">Fond de l&apos;affiche</p>
            <h2 className="okado-section-title mt-2">Personnaliser la couleur de fond</h2>
            <p className="mt-2 text-sm leading-6 text-ash">
              Cette couleur s&apos;applique à l&apos;affiche Classique, pour la roue comme pour le ticket à gratter.
            </p>

            <label className="mt-6 block max-w-sm text-sm">
              <span className="mb-2 block text-charcoal">Couleur de fond</span>
              <input
                type="color"
                value={poster.backgroundColor}
                onChange={(event) =>
                  updatePoster({
                    backgroundMode: "color",
                    backgroundColor: event.target.value,
                    backgroundImageUrl: "",
                  })
                }
                className="h-14 w-full rounded-[12px] border border-fog bg-white px-2 py-2 outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
                aria-label="Couleur de fond de l’affiche Classique"
              />
            </label>
          </section>
        ) : null}

        <section className="okado-card p-6 md:p-8">
          <p className="okado-label">Logo</p>
          <h2 className="okado-section-title mt-2">Personnalisation du logo</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="text-sm md:col-span-2">
              <span className="mb-3 block text-charcoal">Type de logo</span>
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
                          : "border-fog bg-soft-white text-carbon"
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
                <span className="mb-2 block text-charcoal">
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
                  <span className="mb-2 block text-charcoal">Importer le logo affiche</span>
                  <p className="max-w-md text-sm leading-6 text-ash">
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
                <p role="alert" className="mt-2 text-sm font-medium text-coral-alert">
                  {imageUploadError}
                </p>
              ) : null}
              </div>
            ) : null}

            {poster.logoMode !== "none" ? (
              <>
                <label className="text-sm">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-charcoal">Taille du logo (%)</span>
                    <output className="font-semibold text-carbon">
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
                  <span className="mb-2 flex items-center justify-between gap-3 text-charcoal">
                    <span>Marge sous le logo</span>
                    <output className="font-semibold text-aubergine">
                      {Math.round(poster.logoBottomMarginPx)} px
                    </output>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    step={1}
                    value={poster.logoBottomMarginPx}
                    onChange={(event) =>
                      updatePoster({ logoBottomMarginPx: Number(event.target.value) })
                    }
                    className="w-full cursor-pointer accent-aubergine"
                    aria-label="Marge sous le logo"
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
              <span className="mb-2 block text-charcoal">Texte sous le logo</span>
              <textarea
                rows={4}
                maxLength={MAX_POSTER_HEADLINE_LENGTH}
                value={poster.headline}
                onChange={(event) => updatePoster({ headline: event.target.value })}
                aria-describedby="poster-headline-help"
                className="w-full rounded-[var(--okado-radius-control)] border border-border bg-soft-white px-4 py-3 outline-none transition focus:border-aubergine focus:bg-white"
              />
              <p id="poster-headline-help" className="mt-2 text-xs leading-5 text-ash">
                {poster.headline.length}/{MAX_POSTER_HEADLINE_LENGTH} caractères · jusqu&apos;à 4 lignes ; la mise en ligne s&apos;adapte à la taille du texte.
              </p>
            </label>

            <label className="text-sm">
                <span className="mb-2 block text-charcoal">Couleur du texte</span>
              <input
                type="color"
                value={poster.headlineTextColor}
                onChange={(event) => updatePoster({ headlineTextColor: event.target.value })}
                className="h-14 w-full rounded-[12px] border border-fog bg-white px-2 py-2 outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 flex items-center justify-between gap-3 text-charcoal">
                <span>Taille du texte</span>
                <output className="font-semibold text-aubergine">
                  {Math.round(poster.headlineFontSizePx)} px
                </output>
              </span>
              <input
                type="range"
                min={24}
                max={84}
                step={1}
                value={poster.headlineFontSizePx}
                onChange={(event) =>
                  updatePoster({ headlineFontSizePx: Number(event.target.value) })
                }
                className="w-full cursor-pointer accent-aubergine"
                aria-label="Taille du texte principal"
              />
            </label>

            <label className="text-sm md:col-span-2">
              <span className="mb-2 block text-charcoal">Police du texte principal</span>
              <select
                value={poster.headlineFontFamily}
                onChange={(event) =>
                  updatePoster({ headlineFontFamily: event.target.value as CampaignPosterSettings["headlineFontFamily"] })
                }
                className="w-full rounded-[var(--okado-radius-control)] border border-border bg-soft-white px-4 py-3 outline-none transition focus:border-aubergine focus:bg-white"
              >
                {POSTER_FONT_OPTIONS.map((font) => (
                  <option key={font} value={font} className={textFontClass(font)}>
                    {textFontLabel(font)}
                  </option>
                ))}
              </select>
              <span className={`mt-3 block text-lg font-semibold ${textFontClass(poster.headlineFontFamily)}`}>
                Aa — {textFontLabel(poster.headlineFontFamily)}
              </span>
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
                <span className="mb-2 block text-charcoal">Couleur principale</span>
                <input
                  type="color"
                  value={draftWinColor}
                  onChange={(event) => setDraftWinColor(event.target.value)}
                  onBlur={() => updateWheel("winColor", draftWinColor)}
                  className="h-14 w-full rounded-[12px] border border-fog bg-white px-2 py-2 outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
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
            <button
              type="button"
              aria-busy={isDownloading || isRenderingPreview}
              aria-label={
                isDownloading
                  ? "Téléchargement du PNG en cours"
                  : isRenderingPreview
                    ? "Prévisualisation en cours"
                    : undefined
              }
              disabled={isDownloading || isRenderingPreview || !previewIsReady}
              onClick={handleDownloadClick}
              className="okado-filled-action gap-2 px-4 text-sm disabled:cursor-wait disabled:opacity-70"
            >
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              <span>
                {isDownloading
                  ? "Téléchargement…"
                  : isRenderingPreview
                    ? "Préparation…"
                    : "Télécharger le PNG"}
              </span>
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-[var(--okado-radius-card)] bg-[var(--okado-surface-muted)] p-4">
            <div className="relative aspect-[794/1123] w-full max-w-[470px] overflow-hidden rounded-[var(--okado-radius-control)] border border-[var(--okado-border-control)] bg-white shadow-[var(--shadow-product-card)]">
              {previewIsReady && previewPng ? (
                <Image
                  src={previewPng.url}
                  alt="Prévisualisation affiche"
                  fill
                  unoptimized
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-ash" aria-live="polite">
                  {currentPreviewError ?? "Préparation de la prévisualisation…"}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
    <ValidationDialog
      open={pendingNavigation !== null}
      title="Quitter l’éditeur ?"
      description="Vous avez des modifications non enregistrées. Voulez-vous les sauvegarder avant de quitter ?"
      ctaLabel={isSavingBeforeNavigation ? "Enregistrement…" : "Enregistrer et quitter"}
      secondaryCtaLabel="Quitter sans enregistrer"
      cancelLabel="Annuler"
      actionDisabled={isSavingBeforeNavigation}
      secondaryActionDisabled={isSavingBeforeNavigation}
      onAction={() => void saveAndLeave()}
      onSecondaryAction={leaveWithoutSaving}
      onClose={() => {
        if (!isSavingBeforeNavigation) setPendingNavigation(null);
      }}
      onCancel={() => {
        if (!isSavingBeforeNavigation) setPendingNavigation(null);
      }}
    />
    <ValidationDialog
      open={downloadConfirmationOpen}
      title="Enregistrer avant le téléchargement ?"
      description="Cette affiche contient des modifications non enregistrées. Elles doivent être sauvegardées avant de télécharger le PNG."
      ctaLabel="Enregistrer et télécharger"
      cancelLabel="Annuler"
      actionDisabled={isSaving || isDownloading}
      onAction={() => {
        setDownloadConfirmationOpen(false);
        void downloadPoster();
      }}
      onClose={() => setDownloadConfirmationOpen(false)}
      onCancel={() => setDownloadConfirmationOpen(false)}
    />
    </div>
  );
}
