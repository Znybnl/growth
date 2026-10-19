"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { DownloadFeedbackDialog, downloadBlob, fetchDownload, useDownloadTask } from "@/components/merchant/download-feedback";

export function CampaignQrDownloadDialog({ campaignId, isActive, admin = false, onClose }: {
  campaignId: string; isActive?: boolean; admin?: boolean; onClose: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [imageError, setImageError] = useState(false);
  const task = useDownloadTask();
  const endpoint = `/api/${admin ? "admin/" : ""}campaigns/${encodeURIComponent(campaignId)}/qr`;
  const load = () => void task.start(async (signal) => {
    setImageReady(false);
    setImageError(false);
    const blob = await fetchDownload(`${endpoint}?inline=1`, signal, "image/svg+xml");
    setImageUrl(URL.createObjectURL(blob));
    return "Scannez ce QR code ou enregistrez son image avec un clic droit.";
  }, "Préparation de votre QR code…");
  // Read-only request; the actual download remains an explicit action.
  useEffect(() => {
    load();
    // This dialog is mounted for one campaign only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
  const download = () => void task.start(async (signal) => {
    const blob = await fetchDownload(endpoint, signal, "image/svg+xml");
    downloadBlob(blob, `${encodeURIComponent(campaignId)}-qr.svg`);
    return "Le QR code a été transmis au navigateur. Retrouvez-le dans vos téléchargements.";
  }, "Préparation du téléchargement du QR code…");
  return <DownloadFeedbackDialog state={task.state} title="QR code de diffusion" onClose={() => { task.close(); onClose(); }} onRetry={imageReady ? download : load}>
    {isActive === false ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Brouillon : ne diffusez ce QR code qu’après la publication du jeu.</p> : null}
    {imageUrl ? <div className="mt-4 flex justify-center rounded-xl border border-border bg-white p-3">
      {/* A real SVG image preserves scanning and right-click saving. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="QR code de diffusion du jeu" width={208} height={208} className="h-auto max-h-[30dvh] max-w-full object-contain" onLoad={() => setImageReady(true)} onError={() => { setImageError(true); setImageReady(false); }} />
    </div> : null}
    {imageError ? <p role="alert" className="mt-3 text-sm text-red-700">L’image du QR code ne peut pas être affichée.</p> : null}
    {imageError ? <button type="button" className="okado-secondary-action mt-3 w-full px-4" onClick={load}>Recharger le QR code</button> : null}
    {imageUrl ? <button type="button" disabled={!imageReady || task.state?.status === "loading"} className="okado-filled-action mt-4 w-full gap-2 px-4 disabled:opacity-50" onClick={download}><Download className="h-4 w-4" aria-hidden="true" />Télécharger le QR code</button> : null}
  </DownloadFeedbackDialog>;
}

export function CampaignQrDownload({ campaignId, isActive, admin, className = "okado-secondary-action gap-2 px-4 text-sm", label = "Télécharger le QR code" }: {
  campaignId: string; isActive?: boolean; admin?: boolean; className?: string; label?: string;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={className} onClick={() => setOpen(true)}><Download className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{label}</span></button>
    {open ? <CampaignQrDownloadDialog campaignId={campaignId} isActive={isActive} admin={admin} onClose={() => setOpen(false)} /> : null}
  </>;
}
