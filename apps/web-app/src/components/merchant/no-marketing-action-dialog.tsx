"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DialogShell } from "@/components/ui/dialog";

export function NoMarketingActionDialog({ open, onClose, onConfirm }: {
  open: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return <DialogShell open={open} onClose={onClose} labelledBy="no-action-title" describedBy="no-action-description" className="max-w-lg p-6">
    <TriangleAlert className="size-8 text-[#a66a16]" aria-hidden="true" />
    <h2 id="no-action-title" className="mt-4 text-xl font-semibold text-carbon">Publier sans action marketing ?</h2>
    <p id="no-action-description" className="mt-3 text-sm leading-6 text-ash">Les clients pourront jouer et recevoir leur gain, mais aucune action marketing ne leur sera proposée avant le jeu. Vous pourrez en ajouter plus tard.</p>
    <div className="mt-6 flex flex-wrap justify-end gap-3">
      <button type="button" onClick={onClose} className="okado-secondary-action px-4 text-sm">Annuler</button>
      <button type="button" onClick={onConfirm} className="okado-primary-action px-4 text-sm">Publier sans action</button>
    </div>
  </DialogShell>;
}

export function useNoMarketingActionConfirmation() {
  const [open, setOpen] = useState(false);
  const pending = useRef<((confirmed: boolean) => void) | null>(null);
  useEffect(() => () => { pending.current?.(false); pending.current = null; }, []);
  function resolve(confirmed: boolean) {
    const callback = pending.current; pending.current = null; setOpen(false); callback?.(confirmed);
  }
  return {
    confirmNoMarketingAction: () => {
      if (pending.current) return Promise.resolve(false);
      return new Promise<boolean>(resolve => { pending.current = resolve; setOpen(true); });
    },
    noMarketingActionDialog: <NoMarketingActionDialog open={open} onClose={() => resolve(false)} onConfirm={() => resolve(true)} />,
  };
}
