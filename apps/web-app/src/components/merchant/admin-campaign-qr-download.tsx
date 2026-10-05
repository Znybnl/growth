"use client";

import { Download, Loader2 } from "lucide-react";
import { type MouseEvent, useRef, useState } from "react";

/** Render only from an admin screen; the download route enforces authorization. */
export function AdminCampaignQrDownload({
  campaignId,
  isActive,
  className = "okado-secondary-action gap-2 px-4 text-sm",
  label = "Télécharger le QR de diffusion",
}: {
  campaignId: string;
  isActive?: boolean;
  className?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const endpoint = `/api/admin/campaigns/${encodeURIComponent(campaignId)}/qr`;

  async function download(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(endpoint);
      if (!response.ok || !response.headers.get("content-type")?.includes("image/svg+xml")) {
        throw new Error("Le QR code n’a pas pu être téléchargé. Vérifiez votre connexion et vos droits, puis réessayez.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${encodeURIComponent(campaignId)}-qr.svg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Le QR code n’a pas pu être téléchargé. Vérifiez votre connexion et vos droits, puis réessayez.");
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return (
    <>
      <a
        href={endpoint}
        download
        className={className}
        onClick={(event) => void download(event)}
        aria-disabled={loading}
        aria-busy={loading}
        title={isActive ? "QR code destiné aux clients pour accéder à ce jeu." : "Brouillon : ce QR code ne donnera accès au jeu qu’après sa publication."}
      >
        {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4 shrink-0" aria-hidden="true" />}
        <span>{loading ? "Téléchargement…" : label}</span>
        {!isActive ? <span className="sr-only"> — brouillon, à diffuser après publication</span> : null}
      </a>
      {error ? <p role="alert" className="w-full text-xs leading-5 text-red-700">{error}</p> : null}
    </>
  );
}
