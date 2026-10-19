"use client";

import { Check, Download, Loader2, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { DialogShell } from "@/components/ui/dialog";

type DownloadState = { status: "loading" | "success" | "error"; message: string };
type DownloadTask = (signal: AbortSignal, report: (message: string) => void) => Promise<string>;

/** Explicit actions start work; closing aborts it and ignores late results. */
export function useDownloadTask() {
  const [state, setState] = useState<DownloadState | null>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, []);
  function close() {
    pending.current?.abort();
    pending.current = null;
    setState(null);
  }
  async function start(task: DownloadTask, message = "Préparation du fichier…") {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setState({ status: "loading", message });
    try {
      // Paint feedback even when the file is already cached, without a fake progress bar.
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      controller.signal.throwIfAborted();
      const result = await task(controller.signal, (next) => {
        if (!controller.signal.aborted) setState({ status: "loading", message: next });
      });
      if (!controller.signal.aborted) setState({ status: "success", message: result });
    } catch (error) {
      if (!controller.signal.aborted) setState({ status: "error", message: error instanceof Error ? error.message : "Préparation impossible. Réessayez." });
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  }
  return { state, start, close };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function fetchDownload(url: string, signal: AbortSignal, mime: string) {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes(mime)) {
    throw new Error("Le fichier n’a pas pu être préparé. Vérifiez votre connexion et vos droits, puis réessayez.");
  }
  const blob = await response.blob();
  signal.throwIfAborted();
  if (!blob.size) throw new Error("Le fichier reçu est vide. Réessayez.");
  return blob;
}

export function DownloadFeedbackDialog({ state, title, onClose, onRetry, children, compact = false }: {
  state: DownloadState | null; title: string; onClose: () => void; onRetry: () => void; children?: ReactNode; compact?: boolean;
}) {
  const id = useId();
  return <DialogShell open={state !== null} onClose={onClose} labelledBy={`${id}-title`} describedBy={`${id}-description`} className="!max-w-lg max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
    <div className="flex items-start justify-between gap-4">
      {compact ? <h2 id={`${id}-title`} className="okado-dialog-title !mt-0">{title}</h2> : <div className="okado-dialog-icon bg-lavender text-aubergine" aria-hidden="true"><Download className="h-6 w-6" /></div>}
      <button type="button" onClick={onClose} aria-label="Fermer le téléchargement" className="okado-dialog-dismiss"><X className="h-4 w-4" aria-hidden="true" /></button>
    </div>
    {!compact ? <><p className="mt-5 okado-label">Téléchargement</p>
    <h2 id={`${id}-title`} className="okado-dialog-title">{title}</h2></> : null}
    <p id={`${id}-description`} role={state?.status === "error" ? "alert" : "status"} aria-live="polite" className="okado-dialog-description flex items-start gap-2">
      {state?.status === "loading" ? <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : state?.status === "success" ? <Check className="mt-1 h-4 w-4 shrink-0 text-green-700" aria-hidden="true" /> : null}
      <span>{state?.message}</span>
    </p>
    {children}
    {state?.status === "error" ? <button type="button" className="okado-filled-action mt-5 w-full px-4" onClick={onRetry}>Réessayer</button> : null}
    {!compact ? <button type="button" className="okado-secondary-action mt-3 w-full px-4" onClick={onClose}>Fermer</button> : null}
  </DialogShell>;
}

/** Private CSV exports: an HTML login page must never be saved as a file. */
export function FileDownloadButton({ href, fileName, title, children, className }: {
  href: string; fileName: string; title: string; children: ReactNode; className?: string;
}) {
  const task = useDownloadTask();
  const start = () => void task.start(async (signal) => {
    const blob = await fetchDownload(href, signal, "text/csv");
    downloadBlob(blob, fileName);
    return "Le fichier a été transmis au navigateur. Retrouvez-le dans vos téléchargements.";
  }, "Préparation de votre export CSV…");
  return <>
    <button type="button" className={className} onClick={start}>{children}</button>
    <DownloadFeedbackDialog state={task.state} title={title} onClose={task.close} onRetry={start} />
  </>;
}
