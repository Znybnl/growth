"use client";

import { CopyPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { StatusNotice } from "@/components/ui/workspace";
import { DialogShell } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

type LocationItem = { merchant: { id: string; companyName: string; city?: string } };

export function DuplicateCampaignToLocationsButton({ onOpen }: { onOpen: () => void }) {
  return (
    <DropdownMenuItem
      className="min-h-9 cursor-pointer gap-2 rounded-[4px] px-2.5 py-2 text-sm font-medium text-graphite focus:bg-purple-haze"
      onSelect={() => onOpen()}
    >
      <CopyPlus className="h-4 w-4" aria-hidden="true" />
      Dupliquer vers des sites
    </DropdownMenuItem>
  );
}

type DuplicateCampaignToLocationsDialogProps = {
  campaignId: string;
  open: boolean;
  onClose: () => void;
};

export function DuplicateCampaignToLocationsDialog({
  campaignId,
  open,
  onClose,
}: DuplicateCampaignToLocationsDialogProps) {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "danger" | "info">("info");

  useEffect(() => {
    if (!open) return;

    let active = true;
    async function loadLocations() {
      setLoading(true);
      setMessage(null);
      setMessageTone("info");
      setSelected([]);

      try {
        const response = await fetch("/api/merchant/locations");
        const payload = (await response.json()) as {
          locations?: LocationItem[];
          activeLocationId?: string;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Sites indisponibles.");
        if (!active) return;
        setLocations(
          (payload.locations ?? []).filter(
            ({ merchant }) => merchant.id !== payload.activeLocationId,
          ),
        );
      } catch (error) {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Sites indisponibles.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadLocations();
    return () => {
      active = false;
    };
  }, [open]);

  async function duplicate() {
    if (!selected.length) return;

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/duplicate-sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationIds: selected }),
      });
      const payload = (await response.json()) as { campaignIds?: string[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Duplication impossible.");
      if (!payload.campaignIds?.length) {
        throw new Error("Aucune campagne n'a été créée.");
      }
      setMessageTone("success");
      setMessage(`${payload.campaignIds.length} campagne(s) créée(s) en brouillon.`);
      setSelected([]);
      router.refresh();
    } catch (error) {
      setMessageTone("danger");
      setMessage(error instanceof Error ? error.message : "Duplication impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell open={open} onClose={onClose} labelledBy="duplicate-campaign-title" className="max-w-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="okado-label">Déploiement local</p>
                <h2 id="duplicate-campaign-title" className="mt-2 text-xl font-semibold text-carbon">
                  Dupliquer cette campagne
                </h2>
                <p className="mt-2 text-sm leading-6 text-ash">
                  Chaque site reçoit son propre QR, stock et historique.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="rounded-[4px] p-2 text-ash transition hover:bg-purple-haze hover:text-aubergine"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 space-y-2">
              {loading ? (
                <StatusNotice tone="info">Chargement des sites disponibles...</StatusNotice>
              ) : locations.length === 0 ? (
                <StatusNotice tone="info">
                  Ajoutez un autre site pour activer la duplication multi-site.
                </StatusNotice>
              ) : (
                locations.map(({ merchant }) => (
                  <label
                    key={merchant.id}
                    className="flex cursor-pointer items-center gap-3 rounded-[var(--okado-radius-control)] border border-fog bg-white px-3 py-3 text-sm transition hover:border-lavender-mist hover:bg-purple-haze/40"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(merchant.id)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, merchant.id]
                            : current.filter((id) => id !== merchant.id),
                        )
                      }
                      className="h-4 w-4 accent-aubergine"
                    />
                    <span>
                      <span className="block font-semibold text-carbon">{merchant.companyName}</span>
                      <span className="text-xs text-ash">{merchant.city}</span>
                    </span>
                  </label>
                ))
              )}
            </div>

            {message ? <StatusNotice tone={messageTone} className="mt-4">{message}</StatusNotice> : null}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-fog pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} className="okado-secondary-action px-4 text-sm">
                Fermer
              </button>
              <button
                type="button"
                onClick={() => void duplicate()}
                disabled={!selected.length || saving || loading || locations.length === 0}
                className="okado-filled-action px-4 text-sm disabled:opacity-50"
              >
                {saving ? "Duplication..." : "Créer les brouillons"}
              </button>
            </div>
    </DialogShell>
  );
}
