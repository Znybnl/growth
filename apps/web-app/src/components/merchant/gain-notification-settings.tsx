"use client";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { AccountSectionCard } from "@/components/merchant/account-section-card";
import {
  GAIN_NOTIFICATION_FREQUENCIES, GAIN_NOTIFICATION_LABELS, type GainNotificationFrequency,
} from "@/lib/merchant-gain-notification-email";
import type { GainNotificationPreference } from "@/lib/merchant-gain-notifications";

type Props = { locationId: string; merchantName: string; email: string; timeZone: string };
export function GainNotificationSettings(props: Props) {
  const [loaded, setLoaded] = useState(false);
  const [value, setValue] = useState<GainNotificationFrequency>("disabled");
  const [saved, setSaved] = useState<GainNotificationPreference | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/merchant/gain-notifications?location=${encodeURIComponent(props.locationId)}`,
      { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Chargement impossible. Rechargez la page pour réessayer.");
        return response.json() as Promise<GainNotificationPreference>;
      })
      .then(preference => { setSaved(preference); setValue(preference.frequency); setLoaded(true); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [props.locationId]);
  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/merchant/gain-notifications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: props.locationId, frequency: value }),
      });
      if (!response.ok) throw new Error("Enregistrement impossible. Réessayez.");
      const preference = await response.json() as GainNotificationPreference;
      setSaved(preference); setMessage("Vos préférences de notification sont enregistrées.");
    } catch {
      setError("Enregistrement impossible. Réessayez.");
    } finally { setBusy(false); }
  }
  return <AccountSectionCard icon={Bell} eyebrow="Préférences personnelles" title="Notifications de gains"
    description={`Recevez les gains des jeux de ${props.merchantName}. Ce réglage est personnel et propre à cet établissement.`}>
    <p className="mb-4 break-words text-sm text-ash">Destinataire : <strong className="text-graphite">{props.email}</strong> (e-mail de votre compte)</p>
    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
      <label className="text-sm"><span className="mb-2 block text-ash">Fréquence des notifications</span>
        <select value={value} disabled={!loaded || busy}
          onChange={event => { setValue(event.target.value as GainNotificationFrequency); setMessage(""); }}
          className="min-h-11 w-full rounded-lg border border-fog bg-white px-3 py-2 text-graphite">
          {GAIN_NOTIFICATION_FREQUENCIES.map(frequency => <option key={frequency} value={frequency}>{GAIN_NOTIFICATION_LABELS[frequency]}</option>)}
        </select>
      </label>
      <button type="button" onClick={save} disabled={!loaded || busy || value === saved?.frequency}
        className="okado-primary-action rounded-lg px-4 py-3 text-sm disabled:opacity-50">
        {busy ? "Enregistrement…" : "Enregistrer la fréquence"}
      </button>
    </div>
    <p className="mt-3 text-xs leading-5 text-ash">Désactivées par défaut. Synthèse quotidienne conseillée : à 9 h ({props.timeZone}), pour la veille. Hebdomadaire : lundi à 9 h. Mensuelle : premier du mois à 9 h. Aucun e-mail si aucun gain.</p>
    <p className="mt-2 text-xs leading-5 text-ash">Activation non rétroactive. La nouvelle fréquence s’applique aux gains non encore regroupés ; les e-mails déjà préparés conservent leur fréquence. Une désactivation annule les envois en attente. Les e-mails déjà transmis ne peuvent pas être rappelés.</p>
    {saved?.updatedAt ? <p className="mt-2 text-xs text-ash">Réglage enregistré le {new Date(saved.updatedAt).toLocaleString("fr-FR", { timeZone: props.timeZone })}.</p> : null}
    {!loaded && !error ? <p role="status" className="mt-3 text-sm text-ash">Chargement des préférences…</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    {message ? <p role="status" className="mt-3 text-sm text-green-800">{message}</p> : null}
  </AccountSectionCard>;
}
