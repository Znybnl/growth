'use client';

import { useState, type FormEvent } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { DialogShell } from "@/components/ui/dialog";
import {
  getAdminSubscriptionDisplay,
  getTrialExtensionDate,
  MAX_TRIAL_EXTENSION_DAYS,
  type AdminSubscriptionDisplay,
} from "@/lib/admin-trial";

type AdminTrialExtensionButtonProps = {
  merchantId: string;
  subscriptionStatus: string | null;
  trialEndDate: string;
  subscriptionCancelAtPeriodEnd: boolean;
  initialDisplay: AdminSubscriptionDisplay;
  canExtend: boolean;
};

function formatTrialEnd(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

export function AdminTrialExtensionButton({
  merchantId,
  subscriptionStatus,
  trialEndDate: initialTrialEndDate,
  subscriptionCancelAtPeriodEnd,
  initialDisplay,
  canExtend,
}: AdminTrialExtensionButtonProps) {
  const [days, setDays] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [display, setDisplay] = useState(initialDisplay);
  const [trialEndDate, setTrialEndDate] = useState(initialTrialEndDate);
  const [previewNow, setPreviewNow] = useState<number | null>(null);
  const fieldId = `trial-extension-days-${merchantId}`;
  if (!canExtend) {
    return <span className="text-xs text-ash">—</span>;
  }

  const parsedDays = Number(days);
  const previewDate = previewNow !== null && Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= MAX_TRIAL_EXTENSION_DAYS
    ? getTrialExtensionDate(trialEndDate, parsedDays, previewNow)
    : null;

  function closeDialog() {
    if (isSubmitting) return;
    setIsFormOpen(false);
    setDays("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const daysToAdd = Number(days);
    if (!Number.isInteger(daysToAdd) || daysToAdd < 1 || daysToAdd > MAX_TRIAL_EXTENSION_DAYS) {
      setError(`Saisissez un nombre entier de 1 à ${MAX_TRIAL_EXTENSION_DAYS} jours.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/merchants/${encodeURIComponent(merchantId)}/trial-extension`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: daysToAdd }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const result = payload && typeof payload === "object"
        ? payload as { error?: unknown; trialEndDate?: unknown }
        : null;

      if (!response.ok) {
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "La période d’essai n’a pas pu être prolongée. Réessayez.",
        );
      }
      if (typeof result?.trialEndDate !== "string" || !Number.isFinite(Date.parse(result.trialEndDate))) {
        throw new Error("La nouvelle échéance n’a pas pu être confirmée. Rechargez le pilotage.");
      }

      setTrialEndDate(result.trialEndDate);
      setDisplay(getAdminSubscriptionDisplay(
        subscriptionStatus,
        result.trialEndDate,
        subscriptionCancelAtPeriodEnd,
      ));
      setSuccess(`Nouvelle échéance : ${formatTrialEnd(result.trialEndDate)}.`);
      setDays("");
      setIsFormOpen(false);
      setPreviewNow(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Une erreur inattendue est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-w-48 space-y-2">
      <StatusBadge tone={display.tone}>{display.label}</StatusBadge>
      {isFormOpen ? (
        <DialogShell
          open={isFormOpen}
          onClose={closeDialog}
          labelledBy={`trial-extension-title-${merchantId}`}
          describedBy={`trial-extension-description-${merchantId}`}
          className="max-w-lg p-6 sm:p-8"
        >
          <p className="okado-label">Pilotage · période d’essai</p>
          <h2 className="okado-dialog-title" id={`trial-extension-title-${merchantId}`}>
            Prolonger l’essai
          </h2>
          <p className="okado-dialog-description" id={`trial-extension-description-${merchantId}`}>
            Indiquez le nombre de jours supplémentaires à accorder à ce marchand.
          </p>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-graphite" htmlFor={fieldId}>
                Nombre de jours supplémentaires
              </label>
              <input
                className="h-11 w-full rounded-md border border-[#d8dbe5] bg-white px-3 text-sm text-graphite outline-none focus:border-[#67216b] focus:ring-2 focus:ring-[#67216b]/15 sm:max-w-48"
                id={fieldId}
                inputMode="numeric"
                max={MAX_TRIAL_EXTENSION_DAYS}
                min={1}
                onChange={(event) => setDays(event.target.value)}
                required
                step={1}
                type="number"
                value={days}
              />
              <p className="mt-1.5 text-xs text-ash">Saisissez un entier de 1 à {MAX_TRIAL_EXTENSION_DAYS} jours.</p>
            </div>
            {previewDate ? (
              <p className="rounded-lg border border-[#e7d8eb] bg-[#fbf7fc] px-4 py-3 text-sm text-graphite" aria-live="polite">
                Nouvelle fin d’essai estimée : <strong>{formatTrialEnd(previewDate)}</strong>
              </p>
            ) : null}
            {error ? <p className="text-sm font-medium text-[#b42318]" role="alert">{error}</p> : null}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                className="okado-secondary-action okado-compact-action px-4 text-sm"
                disabled={isSubmitting}
                onClick={closeDialog}
                type="button"
              >
                Annuler
              </button>
              <button
                className="okado-primary-action okado-compact-action px-4 text-sm"
                disabled={isSubmitting || !previewDate}
                type="submit"
              >
                {isSubmitting ? "Enregistrement…" : "Confirmer la prolongation"}
              </button>
            </div>
          </form>
        </DialogShell>
      ) : (
        <button
          aria-haspopup="dialog"
          className="okado-secondary-action okado-compact-action px-3 text-xs"
          onClick={() => {
            setError(null);
            setSuccess(null);
            setPreviewNow(Date.now());
            setIsFormOpen(true);
          }}
          type="button"
        >
          Prolonger l’essai
        </button>
      )}
      {success ? <p className="text-xs text-[#047857]" role="status">{success}</p> : null}
    </div>
  );
}
