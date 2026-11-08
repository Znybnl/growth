"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Visual draft preview stays in memory. Nothing is saved or put in a URL. */
export function useMobilePreviewWindow() {
  const windowRef = useRef<Window | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => () => { windowRef.current?.close(); }, []);
  useEffect(() => {
    if (!target) return;
    const timer = window.setInterval(() => { if (windowRef.current?.closed) setTarget(null); }, 500);
    return () => window.clearInterval(timer);
  }, [target]);
  function open() {
    const tab = window.open("about:blank", "_blank");
    if (!tab) return false;
    windowRef.current?.close();
    tab.opener = null;
    tab.document.title = "Aperçu du jeu — Okado";
    const viewport = tab.document.createElement("meta");
    viewport.name = "viewport";
    viewport.content = "width=device-width, initial-scale=1";
    tab.document.head.append(viewport);
    tab.document.documentElement.style.height = "100%";
    tab.document.body.style.cssText = "height:100%;margin:0";
    const node = tab.document.createElement("div");
    tab.document.body.append(node);
    windowRef.current = tab;
    setTarget(node);
    return true;
  }
  function render(children: ReactNode) {
    return target ? createPortal(children, target) : null;
  }
  return { open, render };
}
