"use client";
import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { captureClientProductEvent } from "@/lib/client-product-analytics";
import { AccountSectionCard } from "@/components/merchant/account-section-card";
import type { RewardReminderSettings as Settings } from "@/lib/reward-reminder-settings";

export function RewardReminderSettings({ accountKey }: { accountKey: string }) {
  const [saved, setSaved] = useState<Settings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    // The caller keys this component by account, not establishment.
    fetch("/api/merchant/reward-reminders", { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("Chargement impossible. Rechargez pour réessayer."); return response.json() as Promise<Settings>; })
      .then(settings => { if (controller.signal.aborted) return; setSaved(settings); setEnabled(settings.enabled); setDays(String(settings.days)); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [accountKey]);
  const valid = /^\d+$/.test(days) && Number(days) >= 1 && Number(days) <= 365;
  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/merchant/reward-reminders", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, days: Number(days) }) });
      if (!response.ok) throw new Error("Enregistrement impossible. Réessayez.");
      const settings = await response.json() as Settings;
      captureClientProductEvent("notification_preferences_saved", { preferenceKind: "reward_reminder", enabled: settings.enabled });
      setSaved(settings); setEnabled(settings.enabled); setDays(String(settings.days)); setMessage("Le réglage commun du compte est enregistré.");
    } catch {
      captureClientProductEvent("notification_preferences_save_failed", { preferenceKind: "reward_reminder", errorType: "request_failed" });
      setError("Enregistrement impossible. Réessayez.");
    } finally { setBusy(false); }
  }
  return <AccountSectionCard icon={Clock3} eyebrow="E-mails aux gagnants" title="Relance avant expiration"
    description="Un réglage commun à tous les établissements de votre compte marchand.">
    <fieldset disabled={!saved?.canEdit || busy}>
      <legend className="sr-only">Activation et délai de la relance</legend>
      <label className="flex items-start gap-3 rounded-lg border border-border bg-white p-4 text-sm">
        <input type="checkbox" form="reward-reminder-preferences" checked={enabled} onChange={event => { setEnabled(event.target.checked); setMessage(""); }} className="mt-0.5 h-4 w-4 accent-aubergine" />
        <span>Relancer les gagnants avant l’expiration de leur gain</span>
      </label>
      <label className="mt-4 block text-sm text-graphite">Nombre de jours avant l’expiration
        {/* Do not let this independently saved field invalidate the enclosing account form. */}
        <input type="number" form="reward-reminder-preferences" min={1} max={365} step={1} value={days}
          onChange={event => { setDays(event.target.value); setMessage(""); }}
          className="mt-2 block w-32 rounded-lg border border-border bg-white px-3 py-3" />
      </label>
      {!valid ? <p role="alert" className="mt-2 text-sm text-red-700">Saisissez un entier de 1 à 365 jours.</p> : null}
      <button type="button" onClick={save} disabled={!valid || !saved || (enabled === saved.enabled && Number(days) === saved.days)}
        className="okado-primary-action mt-4 px-4 disabled:opacity-50">{busy ? "Enregistrement…" : "Enregistrer la relance"}</button>
    </fieldset>
    <p className="mt-3 text-xs leading-5 text-ash">Désactivée par défaut. Une seule relance par gain, lors d’un passage quotidien le matin à heure indicative en France. Le jour de relance est calculé dans le fuseau de l’établissement, sans rattrapage d’un jour passé. Seuls les gains non retirés, encore valides et dont la validité initiale est d’au moins 20 jours sont concernés. L’e-mail initial de gain reste inchangé.</p>
    {saved && !saved.canEdit ? <p className="mt-2 text-sm text-ash">Seul un propriétaire ou administrateur du compte peut modifier ce réglage commun.</p> : null}
    {!saved && !error ? <p role="status" className="mt-3 text-sm">Chargement du réglage…</p> : null}
    {message ? <p role="status" className="mt-3 text-sm text-green-800">{message}</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
  </AccountSectionCard>;
}
