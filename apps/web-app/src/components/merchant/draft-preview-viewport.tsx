"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GAME_PREVIEW_VIEWPORT } from "@/lib/game-preview-viewport";

const DOCUMENT = '<!doctype html><html lang="fr"><head></head><body style="margin:0;overflow-x:hidden"><div id="draft-preview-root" inert></div></body></html>';

/** A real mobile CSS viewport; no game endpoint, persisted draft, or player API. */
export function DraftPreviewViewport({ children }: { children: ReactNode }) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const target = frameRef.current?.contentDocument;
    if (!mount || !target) return;
    const syncStyles = () => {
      target.head.querySelectorAll("[data-draft-preview-style]").forEach(node => node.remove());
      document.head.querySelectorAll('link[rel="stylesheet"], style').forEach(node => {
        const copy = node.cloneNode(true) as HTMLElement;
        copy.setAttribute("data-draft-preview-style", "");
        target.head.appendChild(copy);
      });
      target.documentElement.className = document.documentElement.className;
      target.body.className = document.body.className;
    };
    syncStyles();
    const observer = new MutationObserver(syncStyles);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [mount]);

  return <>
    <iframe
      ref={frameRef}
      title="Aperçu du brouillon — 390 × 844 px"
      srcDoc={DOCUMENT}
      sandbox="allow-same-origin"
      tabIndex={-1}
      className="block border-0 bg-white"
      style={GAME_PREVIEW_VIEWPORT}
      onLoad={event => setMount(event.currentTarget.contentDocument?.getElementById("draft-preview-root") ?? null)}
    />
    {mount ? createPortal(children, mount) : null}
  </>;
}
