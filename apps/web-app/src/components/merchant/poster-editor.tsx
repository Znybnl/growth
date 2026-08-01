"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

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
    description: "Fond clair uni, avec titre impactant.",
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
    description: "Design √©l√©gant et titre avec contour blanc.",
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
    description: "Palette chaude pour un rendu plus chaleureux.",
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
      image.onerror = () => reject(new Error("Pr√©visualisation impossible √† convertir en PNG."));
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
        else reject(new Error("Cr√©ation du fichier PNG impossible."));
      }, "image/png");
    });

    return pngBlob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function getPosterTemplate(templateId?: PosterTemplateId) {
  return posterTemplates.find((template) => template.id === templateId) ?? posterTemplates[0];
}

function isTemplateDefaultWinColor(color: string | undefined) {
  return (
    posterTemplates.some((template) => template.wheel.winColor === color) ||
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
    backgroundColor: template.backgroundColor,
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
        logoSizePercent: campaign.presentation.logo.sizePercent,
        logoBottomMarginPx: campaign.presentation.logo.marginBottomPx,
        backgroundMode: "color",
        backgroundColor: "#fff6ee",
        backgroundImageUrl: "",
        headline: campaign.subtitle,
        headlineTextColor: campaignGainColor,
        headlineFontSizePx: 50,
        headlineFontFamily: campaign.presentation.heading.fontFamily,
        wheel: {
          ...posterTemplates[0].wheel,
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

    const template = posterTemplates[0];

    return applyTemplateDefaults(
      {
        ...normalizedPoster,
        headlineTextColor: campaign.gameType === "scratch" ? "#1b2842" : campaignGainColor,
        headlineFontFamily: "display",
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
    const template = posterTemplates.find((item) => item.id === templateId);

    if (!template) return;

    setPoster((current) => ({
      ...current,
      templateId,
      backgroundMode: "color",
      backgroundColor: template.backgroundColor,
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

      setMessage("Affiche enregistr√©e.");
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
      setMessage("Affiche enregistr√©e et t√©l√©chargement lanc√©.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "T√©l√©chargement impossible.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="okado-poster-editor space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="okado-label">Atelier affiche</p>
          <h1 className="okado-page-title mt-3">
            Personnaliser l&apos;affiche A4 / A5
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ash">
            Cet √©cran ne modifie que l&apos;affiche imprimable. La page de jeu reste
            param√©tr√©e dans l&apos;√©diteur de campagne.
          </p>
          {message ? (
            <div className="mt-5 rounded-[8px] border border-border bg-white px-4 py-3 text-sm font-semibold text-graphite shadow-ﬁ⁄$z{-ÆÈ‹j◊ù÷6&B#‡–¢∂÷W76vW––¢¬ˆFóc‡–¢í¢ÁV∆«––¢¬ˆFóc‡–¢∆Fób6∆74Ê÷S“&f∆WÇf∆WÇ◊w&v”2#‡–¢ƒ∆ñÊ∞–¢á&Vc◊∂ˆ6◊ñvÁ2ÚG∂6◊ñv‚ÊñG“ˆVFóF––¢&VfWF6É◊∂f«6W––¢6∆74Ê÷S“&ˆ∂FÚ◊&ñ÷'í÷7Fñˆ‚Ç”B –¢‡–¢&WfVÊó":∆6◊vÊP–¢¬Ù∆ñÊ≥‡–¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊∑6fU˜7FW'––¢Fó6&∆VC◊∂ó56fñÊw––¢6∆74Ê÷S“&ˆ∂FÚ÷fñ∆∆VB÷7Fñˆ‚Ç”RFó6&∆VC¶˜6óGí”c –¢‡–¢∂ó56fñÊrÚ$VÁ&Vvó7G&V÷VÁB‚‚‚"¢$VÁ&Vvó7G&W"'––¢¬ˆ'WGFˆ„‡–¢¬ˆFóc‡–¢¬ˆÜVFW#‡–†–¢∆Fób6∆74Ê÷S“&w&ñB÷ñ‚÷Ç’∂6∆2ÉfÇ”##Çï“v”bÜ√¶w&ñB÷6ˆ«2’∂÷ñÊ÷ÇÉ√g"ïˆ÷ñÊ÷ÇÉC#Ç√„s&g"ï“#‡–¢∆Fób6∆74Ê÷S“'76R◊í”b#‡–†–¢∂6◊ñv‚Êv÷UGóR””“'vÜVV¬"ÚÄ–¢«6V7Fñˆ‚6∆74Ê÷S“&ˆ∂FÚ÷6&B”b÷Cß”Ç#‡–¢«6∆74Ê÷S“&ˆ∂FÚ÷∆&V¬#ÂFV◊∆FS¬˜‡–¢∆É"6∆74Ê÷S“&ˆ∂FÚ◊6V7Fñˆ‚◊FóF∆R◊B”"#‰6Üˆó6ó"∆RFW6ñv‚FR¬f˜3∂ffñ6ÜS¬ˆÉ#‡–¢∆Fób6∆74Ê÷S“&◊B”bw&ñBv”B÷C¶w&ñB÷6ˆ«2”2#‡–¢∑˜7FW%FV◊∆FW2Ê÷ÇáFV◊∆FRí”‚∞–¢6ˆÁ7B7FófR“á˜7FW"ÁFV◊∆FTñBÛÚ&6∆76ñ2◊vÜVV¬"í””“FV◊∆FRÊñC∞–†–¢&WGW&‚Ä–¢∆'WGFˆ‡–¢∂Wì◊∑FV◊∆FRÊñG––¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊≤Çí”‚6V∆V7EFV◊∆FRáFV◊∆FRÊñBó––¢6∆74Ê÷S◊∂w&˜W˜fW&f∆˜r÷ÜñFFV‚&˜VÊFVB’∑f"Ç“◊&FóW2÷6&Bï“&˜&FW"FWáB÷∆VgBG&Á6óFñˆ‚Ü˜fW#¢◊G&Á6∆FR◊í”„RG∞–¢7FófP–¢Ú&&˜&FW"’≤3&cfFce“&r’≤6VfcFfe“6ÜF˜r’≥ÛGÖÛ3GÖ˜&v&ÉCr√í√#Cb√„Çï“ –¢¢&&˜&FW"’≤6CvSVE“&r◊vÜóFRÜ˜fW#¶&˜&FW"’≤3&cfFce“ –¢÷––¢‡–¢«7‡–¢6∆74Ê÷S“'&V∆FófR&∆ˆ6≤Ç’≥##Ö“˜fW&f∆˜r÷ÜñFFV‚ –¢7Gñ∆S◊∑≤&6∂w&˜VÊC¢FV◊∆FRÊ&6∂w&˜VÊD6ˆ∆˜"◊––¢‡–¢«7‡–¢6∆74Ê÷S“&'6ˆ«WFR÷∆VgB”bF˜”RÇ’≥#Ö“r’≥#Ö“&˜VÊFVB÷gV∆¬&˜&FW"’≥Ö“6ÜF˜r’≥ÛáÖÛ3GÖ˜&v&Ér√#B√3í√„bï“ –¢7Gñ∆S◊∑∞–¢&˜&FW$6ˆ∆˜#¢FV◊∆FRÁvÜVV¬Á&ñ‘6ˆ∆˜"¿–¢&6∂w&˜VÊC¢6ˆÊñ2÷w&FñVÁBÇG∑FV◊∆FRÁvÜVV¬Ávñ‰6ˆ∆˜'“cFVr¬6ffcvVbcFVr#FVr¬G∑FV◊∆FRÁvÜVV¬Ávñ‰6ˆ∆˜'“#FVrÉFVr¬6ffcvVbÉFVr#CFVr¬G∑FV◊∆FRÁvÜVV¬Ávñ‰6ˆ∆˜'“#CFVr3FVr¬6ffcvVb3FVr3cFVrñ¿–¢◊––¢Û‡–¢«7‡–¢6∆74Ê÷S“&'6ˆ«WFR&˜GFˆ“”R&ñváB”Rw&ñBÇ”#r”#w&ñB÷6ˆ«2”Rv”„R&˜VÊFVB’≥GÖ“&˜&FW"”B&r◊vÜóFR”" –¢7Gñ∆S◊∑≤&˜&FW$6ˆ∆˜#¢FV◊∆FRÁvÜVV¬Ávñ‰6ˆ∆˜"◊––¢‡–¢¥'&íÊg&ˆ“á≤∆VÊwFÉ¢#R“íÊ÷ÇÖÚ¬ñÊFWÇí”‚Ä–¢«7‡–¢∂Wì◊∂ñÊFWá––¢6∆74Ê÷S“'&˜VÊFVB’≥Ö“ –¢7Gñ∆S◊∑∞–¢&6∂w&˜VÊD6ˆ∆˜#†–¢≥¬¬2¬B¬R¬í¬¬"¬B¬R¬Ç¬#¬#¬#2¬#E“ÊñÊ6«VFW2Ä–¢ñÊFWÇ¿–¢ê–¢Ú"3É#r –¢¢'G&Á7&VÁB"¿–¢◊––¢Û‡–¢íó––¢¬˜7„‡–¢¬˜7„‡–¢«7‚6∆74Ê÷S“&&∆ˆ6≤”B#‡–¢«7‚6∆74Ê÷S“&&∆ˆ6≤FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#u“#‡–¢∑FV◊∆FRÊ∆&V«––¢¬˜7„‡–¢«7‚6∆74Ê÷S“&◊B”&∆ˆ6≤FWáB◊á2∆VFñÊr”RFWáB’≤3V3cSsu“#‡–¢∑FV◊∆FRÊFW67&óFñˆÁ––¢¬˜7„‡–¢¬˜7„‡–¢¬ˆ'WGFˆ„‡–¢ì∞–¢“ó––¢¬ˆFóc‡–¢¬˜6V7Fñˆ„‡–¢í¢ÁV∆«––†–¢«6V7Fñˆ‚6∆74Ê÷S“&ˆ∂FÚ÷6&B”b÷Cß”Ç#‡–¢«6∆74Ê÷S“&ˆ∂FÚ÷∆&V¬#‰∆ˆvÛ¬˜‡–¢∆É"6∆74Ê÷S“&ˆ∂FÚ◊6V7Fñˆ‚◊FóF∆R◊B”"#ÂW'6ˆÊÊ∆ó6Fñˆ‚GR∆ˆvÛ¬ˆÉ#‡–†–¢∆Fób6∆74Ê÷S“&◊B”bw&ñBv”B÷C¶w&ñB÷6ˆ«2”"#‡–¢∆Fób6∆74Ê÷S“'FWáB◊6“÷C¶6ˆ¬◊7‚”"#‡–¢«7‚6∆74Ê÷S“&÷"”2&∆ˆ6≤FWáB’≤3cf#v5“#ÂGóRFR∆ˆvÛ¬˜7„‡–¢∆Fób6∆74Ê÷S“&w&ñBv”2÷C¶w&ñB÷6ˆ«2”2#‡–¢µ∞–¢≤f«VS¢'FWáB"¬∆&V√¢%FWáFR"“¿–¢≤f«VS¢&ñ÷vR"¬∆&V√¢$ñ÷vR"“¿–¢≤f«VS¢&ÊˆÊR"¬∆&V√¢$V7V‚"“¿–¢“Ê÷ÇÜ÷ˆFRí”‚∞–¢6ˆÁ7B7FófR“á˜7FW"Ê∆ˆvÙ÷ˆFRÛÚ&ÊˆÊR"í””“÷ˆFRÁf«VS∞–†–¢&WGW&‚Ä–¢∆'WGFˆ‡–¢∂Wì◊∂÷ˆFRÁf«VW––¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊≤Çí”‡–¢WFFU˜7FW"á∞–¢∆ˆvÙ÷ˆFS¢÷ˆFRÁf«VR26◊ñvÂ˜7FW%6WGFñÊw5≤&∆ˆvÙ÷ˆFR%“¿–¢∆ˆvıFWáC†–¢÷ˆFRÁf«VR””“'FWáB –¢Ú˜7FW"Ê∆ˆvıFWáB«¬6◊ñv‚Ê∆ˆvıFWáB«¬" –¢¢˜7FW"Ê∆ˆvıFWáB¿–¢“ê–¢––¢6∆74Ê÷S◊∂&˜VÊFVB’∑f"Ç“◊&FóW2÷6&Bï“&˜&FW"Ç”Bí”2FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BG&Á6óFñˆ‚Ü˜fW#¢◊G&Á6∆FR◊í”„RG∞–¢7FófP–¢Ú&&˜&FW"’≤3&cfFce“&r’≤6VfcFfe“FWáB’≤3#F66e“ –¢¢&&˜&FW"’≤6CvSVE“&r’≤6cvcñf5“FWáB’≤3É#35“ –¢÷––¢‡–¢∂÷ˆFRÊ∆&V«––¢¬ˆ'WGFˆ„‡–¢ì∞–¢“ó––¢¬ˆFóc‡–¢¬ˆFóc‡–†–¢∑˜7FW"Ê∆ˆvÙ÷ˆFR””“'FWáB"ÚÄ–¢∆∆&V¬6∆74Ê÷S“'FWáB◊6“÷C¶6ˆ¬◊7‚”"#‡–¢«7‚6∆74Ê÷S“&÷"”"&∆ˆ6≤FWáB’≤3cf#v5“#‡–¢FWáFRffñ6å:í:∆∆6RGR∆ˆv–¢¬˜7„‡–¢∆ñÁW@–¢f«VS◊∑˜7FW"Ê∆ˆvıFWáBÛÚ"'––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚WFFU˜7FW"á≤∆ˆvıFWáC¢WfVÁBÁF&vWBÁf«VR“ó––¢6∆74Ê÷S“'r÷gV∆¬&˜VÊFVB’∑f"Ç“◊&FóW2÷6&Bï“&˜&FW"&˜&FW"’≤6CvSVE“&r’≤6cvcñf5“Ç”Bí”2˜WF∆ñÊR÷ÊˆÊRG&Á6óFñˆ‚fˆ7W3¶&˜&FW"’≤3&cfFce“fˆ7W3¶&r◊vÜóFR –¢Û‡–¢¬ˆ∆&V√‡–¢í¢ÁV∆«––†–¢∑˜7FW"Ê∆ˆvÙ÷ˆFR””“&ñ÷vR"ÚÄ–¢∆∆&V¬6∆74Ê÷S“&w&˜W&V∆FófRf∆WÇ÷ñ‚÷Ç’≥3'Ö“7W'6˜"◊ˆñÁFW"f∆WÇ÷6ˆ¬ßW7Fñgí÷&WGvVV‚&˜VÊFVB’∑f"Ç“◊&FóW2÷6&Bï“&˜&FW"&˜&FW"÷F6ÜVB&˜&FW"’≤66fCñV“&r’≤6cvcñf5“”BFWáB◊6“G&Á6óFñˆ‚Ü˜fW#¶&˜&FW"’≤3&cfFce“Ü˜fW#¶&r’≤6VVcFfe“÷C¶6ˆ¬◊7‚”"#‡–¢∆Fóc‡–¢«7‚6∆74Ê÷S“&÷"”"&∆ˆ6≤FWáB’≤3cf#v5“#‰ñ◊˜'FW"∆R∆ˆvÚffñ6ÜS¬˜7„‡–¢«6∆74Ê÷S“&÷Ç◊r÷÷BFWáB◊6“∆VFñÊr”bFWáB’≤3Scs5“#‡–¢‰r¬•Tr¬vV%˜Rtîb¬"÷Ú÷Üñ◊V“‚∆R∆ˆvÚ&W7FW&6VÁG,:íV‚ÜWBFR¬f˜3∂ffñ6ÜR‡–¢¬˜‡–¢¬ˆFóc‡–¢∆Fób6∆74Ê÷S“&◊B”Bf∆WÇóFV◊2÷6VÁFW"ßW7Fñgí÷&WGvVV‚v”2#‡–¢«7‚6∆74Ê÷S“&ñÊ∆ñÊR÷f∆WÇ&˜VÊFVB÷gV∆¬&r◊vÜóFRÇ”2í”"FWáB◊á2fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3#F66e“6ÜF˜r◊6“#‡–¢∑˜7FW"Ê∆ˆvıW&¬«¬6◊ñv‚Ê∆ˆvıW&¬Ú$∆ˆvÚ6Ü&|:í"¢$V7V‚∆ˆvÚ'––¢¬˜7„‡–¢«7‚6∆74Ê÷S“'&˜VÊFVB’∑f"Ç“◊&FóW2÷6&Bï“&r’≤3&cfFce“Ç”Bí”"FWáB◊á2fˆÁB◊6V÷ñ&ˆ∆BFWáB◊vÜóFR#‡–¢6Üˆó6ó –¢¬˜7„‡–¢¬ˆFóc‡–¢∑˜7FW"Ê∆ˆvıW&¬«¬6◊ñv‚Ê∆ˆvıW&¬ÚÄ–¢∆Fób6∆74Ê÷S“&◊B”Bf∆WÇ÷ñ‚÷Ç’≥ÉgÖ“óFV◊2÷6VÁFW"ßW7Fñgí÷6VÁFW"&˜VÊFVB’≥áÖ“&˜&FW"&˜&FW"◊vÜóFR&r◊vÜóFRÛÉ”26ÜF˜r÷ñÊÊW"#‡–¢ƒñ÷vP–¢7&3◊∑˜7FW"Ê∆ˆvıW&¬«¬6◊ñv‚Ê∆ˆvıW&¬«¬"'––¢«C“$W,:wRGR∆ˆvÚ –¢vñGFÉ◊≥##––¢ÜVñváC◊≥ì'––¢VÊ˜Fñ÷ó¶V@–¢6∆74Ê÷S“&÷Ç÷Ç’≥sÖ“r÷WFÚˆ&¶V7B÷6ˆÁFñ‚ –¢Û‡–¢¬ˆFóc‡–¢í¢ÁV∆«––¢∆ñÁW@–¢GóS“&fñ∆R –¢66WC“&ñ÷vR˜Êr∆ñ÷vRˆßVr∆ñ÷vR˜vV'∆ñ÷vRˆvñb –¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢W∆ˆD4FFW&¬Ä–¢WfVÁB¿–¢áf«VRí”‚WFFU˜7FW"á≤∆ˆvÙ÷ˆFS¢&ñ÷vR"¬∆ˆvıW&√¢f«VR“í¿–¢6WD÷W76vR¿–¢ê–¢––¢6∆74Ê÷S“&'6ˆ«WFRñÁ6WB”Ç÷gV∆¬r÷gV∆¬7W'6˜"◊ˆñÁFW"˜6óGí” –¢Û‡–¢¬ˆ∆&V√‡–¢í¢ÁV∆«––†–¢∑˜7FW"Ê∆ˆvÙ÷ˆFR”“&ÊˆÊR"ÚÄ–¢√‡–¢∆∆&V¬6∆74Ê÷S“'FWáB◊6“#‡–¢«7‚6∆74Ê÷S“&÷"”"&∆ˆ6≤FWáB’≤3cf#v5“#ÂFñ∆∆RGR∆ˆvÚÇRì¬˜7„‡–¢∆ñÁW@–¢GóS“&ÁV÷&W" –¢÷ñ„◊≥C––¢÷É◊≥#C––¢f«VS◊∑˜7FW"Ê∆ˆvı6ó¶UW&6VÁG––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢WFFU˜7FW"á≤∆ˆvı6ó¶UW&6VÁC¢ÁV÷&W"ÜWfVÁBÁF&vWBÁf«VR«¬í“ê–¢––¢6∆74Ê÷S“'r÷gV∆¬&˜VÊFVB’∑f"Ç“◊&FóW2÷6&Bï“&˜&FW"&˜&FW"’≤6CvSVE“&r’≤6cvcñf5“Ç”Bí”2˜WF∆ñÊR÷ÊˆÊRG&Á6óFñˆ‚fˆ7W3¶&˜&FW"’≤3&cfFce“fˆ7W3¶&r◊vÜóFR –¢Û‡–¢¬ˆ∆&V√‡–†–¢∆∆&V¬6∆74Ê÷S“'FWáB◊6“#‡–¢«7‚6∆74Ê÷S“&÷"”"&∆ˆ6≤FWáB’≤3cf#v5“#‰÷&vR6˜W2∆R∆ˆvÚáÇì¬˜7„‡–¢∆ñÁW@–¢GóS“&ÁV÷&W" –¢÷ñ„◊≥––¢÷É◊≥#––¢f«VS◊∑˜7FW"Ê∆ˆvÙ&˜GFˆ‘÷&vñÂá––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢WFFU˜7FW"á≤∆ˆvÙ&˜GFˆ‘÷&vñÂÉ¢ÁV÷&W"ÜWfVÁBÁF&vWBÁf«VR«¬í“ê–¢––¢6∆74Ê÷S“'r÷gV∆¬&˜VÊFVB’∑f"Ç“◊&FóW2÷6&Bï“&˜&FW"&˜&FW"’≤6CvSVE“&r’≤6cvcñf5“Ç”Bí”2˜WF∆ñÊR÷ÊˆÊRG&Á6óFñˆ‚fˆ7W3¶&˜&FW"’≤3&cfFce“fˆ7W3¶&r◊vÜóFR –¢Û‡–¢¬ˆ∆&V√‡–¢¬Û‡–¢í¢ÁV∆«––¢¬ˆFóc‡–¢¬˜6V7Fñˆ„‡–†–¢«6V7Fñˆ‚6∆74Ê÷S“&ˆ∂FÚ÷6&B”b÷Cß”Ç#‡–¢«6∆74Ê÷S“&ˆ∂FÚ÷∆&V¬#Âá&6RBf˜3∂VÁL:ßFS¬˜‡–¢∆É"6∆74Ê÷S“&ˆ∂FÚ◊6V7Fñˆ‚◊FóF∆R◊B”"#‡–¢7Gñ∆RGRFWáFR&ñÊ6ó¿–¢¬ˆÉ#‡–†–¢∆Fób6∆74Ê÷S“&◊B”bw&ñBv”B÷C¶w&ñB÷6ˆ«2”"#‡–¢∆∆&V¬6∆74Ê÷S“'FWáB◊6“÷C¶6ˆ¬◊7‚”"#‡–¢«7‚6∆74Ê÷S“&÷"”"&∆ˆ6≤FWáB’≤3cf#v5“#ÂFWáFR6˜W2∆R∆ˆvÛ¬˜7„‡–¢«FWáF&V–¢&˜w3◊≥G––¢f«VS◊∑˜7FW"ÊÜVF∆ñÊW––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚WFFU˜7FW"á≤ÜVF∆ñÊS¢WfVÁBÁF&vWBÁf«VR“ó––¢6∆74Ê÷S“'r÷gV∆¬&˜VÊFVB’∑f"Ç“◊&FóW2÷6&Bï“&˜&FW"&˜&FW"’≤6CvSVE“&r’≤6cvcñf5“Ç”Bí”2˜WF∆ñÊR÷ÊˆÊRG&Á6óFñˆ‚fˆ7W3¶&˜&FW"’≤3&cfFce“fˆ7W3¶&r◊vÜóFR –¢Û‡–¢¬ˆ∆&V√‡–†–¢∆∆&V¬6∆74Ê÷S“'FWáB◊6“#‡–¢«7‚6∆74Ê÷S“&÷"”"&∆ˆ6≤FWáB’≤3cf#v5“#‰6˜V∆WW"GRFWáFS¬˜7„‡–¢∆ñÁW@–¢GóS“&6ˆ∆˜" –¢f«VS◊∑˜7FW"ÊÜVF∆ñÊUFWáD6ˆ∆˜'––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚WFFU˜7FW"á≤ÜVF∆ñÊUFWáD6ˆ∆˜#¢WfVÁBÁF&vWBÁf«VR“ó––¢6∆74Ê÷S“&Ç”Br÷gV∆¬&˜VÊFVB’∑f"Ç“◊&FóW2÷6&Bï“&˜&FW"&˜&FW"’≤6CvSVE“&r’≤6cvcñf5“Ç”"í”"˜WF∆ñÊR÷ÊˆÊR –¢Û‡–¢¬ˆ∆&V√‡–†–¢∆∆&V¬6∆74Ê÷S“'FWáB◊6“#‡–¢«7‚6∆74Ê÷S“&÷"”"&∆ˆ6≤FWáB’≤3cf#v5“#ÂFñ∆∆RGRFWáFRáÇì¬˜7„‡–¢∆ñÁW@–¢GóS“&ÁV÷&W" –¢÷ñ„◊≥#G––¢÷É◊≥ÉG––¢f«VS◊∑˜7FW"ÊÜVF∆ñÊTfˆÁE6ó¶Uá––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢WFFU˜7FW"á≤ÜVF∆ñÊTfˆÁE6ó¶UÉ¢ÁV÷&W"ÜWfVÁBÁF&vWBÁf«VR«¬C"í“ê–¢––¢6∆74Ê÷S“'r÷gV∆¬&˜VÊFVB’∑f"Ç“◊&FóW2÷6&Bï“&˜&FW"&˜&FW"’≤6CvSVE“&r’≤6cvcñf5“Ç”Bí”2˜WF∆ñÊR÷ÊˆÊRG&Á6óFñˆ‚fˆ7W3¶&˜&FW"’≤3&cfFce“fˆ7W3¶&r◊vÜóFR –¢Û‡–¢¬ˆ∆&V√‡–†–¢¬ˆFóc‡–¢¬˜6V7Fñˆ„‡–†–†–¢«6V7Fñˆ‚6∆74Ê÷S“&ˆ∂FÚ÷6&B”b÷Cß”Ç#‡–¢«6∆74Ê÷S“&ˆ∂FÚ÷∆&V¬#‰6˜V∆WW"FR¬f˜3∂ffñ6ÜS¬˜‡–¢∆É"6∆74Ê÷S“&ˆ∂FÚ◊6V7Fñˆ‚◊FóF∆R◊B”"#‡–¢W'6ˆÊÊ∆ó6W¢∆6˜V∆WW"&ñÊ6ó∆RFR¬f˜3∂ffñ6ÜP–¢¬ˆÉ#‡–†–¢∆Fób6∆74Ê÷S“&◊B”bw&ñBv”B÷C¶w&ñB÷6ˆ«2”"#‡–¢∆∆&V¬6∆74Ê÷S“'FWáB◊6“#‡–¢«7‚6∆74Ê÷S“&÷"”"&∆ˆ6≤FWáB’≤3cf#v5“#‰6˜V∆WW"&ñÊ6ó∆S¬˜7„‡–¢∆ñÁW@–¢GóS“&6ˆ∆˜" –¢f«VS◊∂G&gEvñ‰6ˆ∆˜'––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚6WDG&gEvñ‰6ˆ∆˜"ÜWfVÁBÁF&vWBÁf«VRó––¢ˆ‰&«W#◊≤Çí”‚WFFUvÜVV¬Ç'vñ‰6ˆ∆˜""¬G&gEvñ‰6ˆ∆˜"ó––¢6∆74Ê÷S“&Ç”Br÷gV∆¬&˜VÊFVB’∑f"Ç“◊&FóW2÷6&Bï“&˜&FW"&˜&FW"’≤6CvSVE“&r’≤6cvcñf5“Ç”"í”"˜WF∆ñÊR÷ÊˆÊR –¢Û‡–¢¬ˆ∆&V√‡–¢¬ˆFóc‡–¢¬˜6V7Fñˆ„‡–¢¬ˆFóc‡–†–¢∆6ñFR6∆74Ê÷S“'Ü√ß7Fñ6∑íÜ√ßF˜”bÜ√¶Ç’∂6∆2ÉfÇ”CáÇï“#‡–¢∆Fób6∆74Ê÷S“&ˆ∂FÚ÷6&Bf∆WÇÇ÷gV∆¬f∆WÇ÷6ˆ¬”R#‡–¢∆Fób6∆74Ê÷S“&÷"”Bf∆WÇóFV◊2÷6VÁFW"ßW7Fñgí÷&WGvVV‚v”2#‡–¢∆Fóc‡–¢«6∆74Ê÷S“&ˆ∂FÚ÷∆&V¬#Â,:ófó7V∆ó6Fñˆ„¬˜‡–¢∆É"6∆74Ê÷S“&ˆ∂FÚ◊6V7Fñˆ‚◊FóF∆R◊B”#‰ffñ6ÜRBÚS¬ˆÉ#‡–¢¬ˆFóc‡–¢∆–¢á&Vc◊∂ˆíˆ6◊ñvÁ2ÚG∂6◊ñv‚ÊñG“˜˜7FW&––¢&ñ÷'W7ì◊∂ó4F˜vÊ∆ˆFñÊw––¢ˆ‰6∆ñ6≥◊≤ÜWfVÁBí”‚∞–¢WfVÁBÁ&WfVÁDFVfV«BÇì∞–¢fˆñBF˜vÊ∆ˆE˜7FW"Çì∞–¢◊––¢6∆74Ê÷S“&ˆ∂FÚ÷fñ∆∆VB÷7Fñˆ‚Ç”BFWáB◊6“ –¢7Gñ∆S◊∑≤6ˆ∆˜#¢"6fffffb"◊––¢‡–¢L:ñÃ:ñ6Ü&vW"∆R‰p–¢¬ˆ‡–¢¬ˆFóc‡–†–¢∆Fób6∆74Ê÷S“&f∆WÇ÷ñ‚÷Ç”f∆WÇ”óFV◊2÷6VÁFW"ßW7Fñgí÷6VÁFW"˜fW&f∆˜r÷WFÚ&˜VÊFVB’∑f"Ç“÷ˆ∂FÚ◊&FóW2÷6&Bï“&r’∑f"Ç“÷ˆ∂FÚ◊7W&f6R÷◊WFVBï“”B#‡–¢∆Fób6∆74Ê÷S“'&V∆FófR7V7B’≥sìBÛ#5“r÷gV∆¬÷Ç◊r’≥CsÖ“˜fW&f∆˜r÷ÜñFFV‚&˜VÊFVB’∑f"Ç“÷ˆ∂FÚ◊&FóW2÷6ˆÁG&ˆ¬ï“&˜&FW"&˜&FW"’∑f"Ç“÷ˆ∂FÚ÷&˜&FW"÷6ˆÁG&ˆ¬ï“&r◊vÜóFR6ÜF˜r’∑f"Ç“◊6ÜF˜r◊&ˆGV7B÷6&Bï“#‡–¢ƒñ÷vP–¢7&3◊∑&WfñWu˜7FW%W&«––¢«C“%,:ófó7V∆ó6Fñˆ‚ffñ6ÜR –¢fñ∆¿–¢VÊ˜Fñ÷ó¶V@–¢6∆74Ê÷S“&ˆ&¶V7B÷6ˆÁFñ‚ –¢Û‡–¢¬ˆFóc‡–¢¬ˆFóc‡–¢¬ˆFóc‡–¢¬ˆ6ñFS‡–¢¬ˆFóc‡–¢¬ˆFóc‡–¢ì∞–ß––