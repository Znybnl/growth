"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GAME_PREVIEW_VIEWPORT } from "@/lib/game-preview-viewport";

// Percentage-height preview backgrounds need a definite height through every
// ancestor; body min-height alone leaves a content-sized root and a blank footer.
const DOCUMENT = '<!doctype html><html lang="fr" style="height:100%"><head></head><body style="height:100%;margin:0;overflow-x:hidden"><div id="draft-preview-root" data-replay-visible style="height:100%" inert></div></body></html>';

/** A real mobile CSS viewport; no game endpoint, persisted draft, or player API. */
export function DraftPreviewViewport({ children, fullWindow = false, inline = false }: { children: ReactNode; fullWindow?: boolean; inline?: boolean }) {
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

  // The wizard's phone preview lives inside the merchant replay recorder.
  // rrweb does not reliably serialize a nested srcDoc document, so render this
  // fixed mobile viewport in the parent DOM. Standalone previews stay isolated.
  if (inline) return <div data-replay-visible data-testid="draft-preview-viewport" className="overflow-hidden" style={{ ...GAME_PREVIEW_VIEWPORT, containerType: "inline-size" }}>{children}</div>;

  return <>
    <iframe
      data-replay-preview
      ref={frameRef}
      title={`Aperçu du brouillon — ${GAME_PREVIEW_VIEWPORT.width} × ${GAME_PREVIEW_VIEWPORT.height} px`}
      srcDoc={DOCUMENT}
      sandbox="allow-same-origin"
      tabIndex={-1}
      className="block border-0 bg-white"
      style={fullWindow ? { width: "100vw", height: "100dvh" } : GAME_PREVIEW_VIEWPORT}
      onLoad={event => setMount(event.currentTarget.contentDocument?.getElementById("draft-preview-root") ?? null)}
    />
    {mount ? createPortal(children, mount) : null}
  </>;
}
