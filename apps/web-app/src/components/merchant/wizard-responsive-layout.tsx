"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Eye, X } from "lucide-react";
import { DialogShell } from "@/components/ui/dialog";
import { WIZARD_PHONE_SIZE } from "@/lib/game-preview-viewport";

/** Width belongs to the workspace, not the browser (the sidebar is outside it). */
export function useWizardLayout() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, availableHeight: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const width = Math.round(node.getBoundingClientRect().width);
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const scroller = node.closest("main");
      const grid = node.querySelector(".wizard-layout");
      const progress = node.querySelector(".wizard-progress");
      const toolbarHeight = node.querySelector(".wizard-save-toolbar")?.getBoundingClientRect().height ?? 0;
      node.style.setProperty("--wizard-toolbar-height", `${toolbarHeight}px`);
      const bottom = Math.min(viewportHeight, scroller?.getBoundingClientRect().bottom ?? viewportHeight);
      // Use the initial scroll position, so scrolling never changes the layout
      // or shifts the form sideways. Observe actual headers as they wrap.
      const gridTop = (grid?.getBoundingClientRect().top ?? 0) + (scroller?.scrollTop ?? window.scrollY);
      const progressHeight = width >= 1200 ? 0 : (progress?.getBoundingClientRect().height ?? 0) + 20;
      const availableHeight = Math.round(bottom - gridTop - progressHeight - 16);
      setSize((previous) => previous.width === width && previous.availableHeight === availableHeight
        ? previous : { width, availableHeight });
    };
    const observer = new ResizeObserver(update);
    observer.observe(node);
    for (const child of node.querySelectorAll(".wizard-heading, .wizard-progress, .wizard-save-toolbar")) observer.observe(child);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);
  return { ref, layout: size.width >= 1200 ? "wide" : size.width >= 900 ? "compact" : "narrow",
    inlinePreview: size.width >= 900 && size.availableHeight >= WIZARD_PHONE_SIZE.height * 200 / WIZARD_PHONE_SIZE.width };
}

/** Scale the whole phone; its CSS viewport remains 390 × 844 at every size. */
export function FittedWizardPhone({ children, inDialog = false }: { children: ReactNode; inDialog?: boolean }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const scroller = slot.closest("main");
    const update = () => {
      const bounds = slot.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      // Account for the actual header/actions above the preview and the shell's
      // scroll viewport, rather than fitting to the whole browser height.
      const bottom = Math.min(viewportHeight, scroller?.getBoundingClientRect().bottom ?? viewportHeight);
      const availableHeight = inDialog ? viewportHeight - 144 : bottom - Math.max(bounds.top, 16) - 16;
      const next = Math.max(0.1, Math.min(300 / WIZARD_PHONE_SIZE.width, bounds.width / WIZARD_PHONE_SIZE.width, Math.max(0, availableHeight) / WIZARD_PHONE_SIZE.height));
      setScale((previous) => Math.abs(previous - next) < 0.001 ? previous : next);
    };
    const observer = new ResizeObserver(update);
    observer.observe(slot);
    if (scroller) observer.observe(scroller);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [inDialog]);

  return <div ref={slotRef} className="w-full" data-testid="wizard-preview-slot">
    <div className="relative mx-auto" style={{ width: WIZARD_PHONE_SIZE.width * scale, height: WIZARD_PHONE_SIZE.height * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ ...WIZARD_PHONE_SIZE, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  </div>;
}

export function WizardResponsivePreview({ children, inline }: { children: ReactNode; inline: boolean }) {
  const [open, setOpen] = useState(false);
  return <aside className="wizard-live-preview min-w-0 self-start" data-testid="wizard-live-preview">
    {!inline ? <button type="button" onClick={() => setOpen(true)} className="okado-secondary-action gap-2 px-4 text-sm">
      <Eye className="h-4 w-4" aria-hidden="true" /> Voir l’aperçu
    </button> : null}
    {inline && !open ? <FittedWizardPhone>{children}</FittedWizardPhone> : null}
    <DialogShell open={open} onClose={() => setOpen(false)} labelledBy="wizard-live-preview-title" className="max-w-[380px] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h2 id="wizard-live-preview-title" className="text-lg font-semibold">Aperçu du jeu</h2>
          <p className="mt-1 text-xs text-charcoal">Vos modifications non enregistrées sont incluses.</p></div>
        <button type="button" aria-label="Fermer l’aperçu du jeu" onClick={() => setOpen(false)} className="okado-secondary-action h-9 w-9 shrink-0 p-0"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      {open ? <FittedWizardPhone inDialog>{children}</FittedWizardPhone> : null}
    </DialogShell>
  </aside>;
}
