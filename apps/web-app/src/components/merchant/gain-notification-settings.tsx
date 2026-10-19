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
  const [value, setValue] = useState<GainNotificationFrequency[]>([]);
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
      .then(preference => { setSaved(preference); setValue(preference.frequencies); setLoaded(true); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [props.locationId]);
  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/merchant/gain-notifications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: props.locationId, frequencies: value }),
      });
      if (!response.ok) throw new Error("Enregistrement impossible. Réessayez.");
      const preference = await response.json() as GainNotificationPreference;
      setSaved(preference); setValue(preference.frequencies); setMessage("Vos préférences de notification sont enregistrées.");
    } catch {
      setError("Enregistrement impossible. Réessayez.");
    } finally { setBusy(false); }
  }
  return <AccountSectionCard icon={Bell} eyebrow="Préférences personnelles" title="Notifications de gains"
    description={`Recevez les gains des jeux de ${props.merchantName}. Ce réglage est personnel et propre à cet établissement.`}>
    <p className="mb-4 break-words text-sm text-ash">Destinataire : <strong className="text-graphite">{props.email}</strong> (e-mail de votre compte)</p>
    <div>
      <fieldset disabled={!loaded || busy}>
        <legend className="mb-3 text-sm text-ash">Notifications à recevoir</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {GAIN_NOTIFICATION_FREQUENCIES.map(frequency => <label key={frequency}
            className="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-white px-3 py-3 text-sm text-graphite">
            <input type="checkbox" checked={value.includes(frequency)}
              onChange={event => {
                setValue(current => event.target.checked
                  ? GAIN_NOTIFICATION_FREQUENCIES.filter(item => current.includes(item) || item === frequency)
                  : current.filter(item => item !== frequency));
                setMessage("");
              }}
              className="h-4 w-4 accent-aubergine" />
            <span>{GAIN_NOTIFICATION_LABELS[frequency]}</span>
          </label>)}
        </div>
      </fieldset>
      <p className="mt-2 text-xs text-ash">Réglage initial : aucune notification. Sans option cochée, aucun e-mail n’est envoyé.</p>
      <button type="button" onClick={save}
        disabled={!loaded || busy || !saved || !GAIN_NOTIFICATION_FREQUENCIES.some(frequency => value.includes(frequency) !== saved.frequencies.includes(frequency))}
        className="okado-primary-action mt-4 rounded-lg px-4 py-3 text-sm disabled:opacity-50">
        {busy ? "Enregistrement…" : "Enregistrer les notifications"}
      </button>
    </div>
    <p className="mt-3 text-xs leading-5 text-ash">À chaque gain : envoi après confirmation. Les synthèses sont préparées le matin à horaire indicatif, selon le fuseau de l’établissement ({props.timeZone}) : quotidienne pour la veille, hebdomadaire pour la semaine précédente, mensuelle pour le mois précédent. Aucun e-mail si la période ne contient aucun gain.</p>
    <p className="mt-2 text-xs leading-5 text-ash">Chaque option est indépendante ; un même gain peut apparaître dans plusieurs synthèses sélectionnées. L’activation n’est pas rétroactive. Les e-mails déjà préparés conservent leur contenu. Désactiver une option annule ses envois en attente ; les e-mails déjà transmis ne peuvent pas être rappelés.</p>
    {saved?.updatedAt ? <p className="mt-2 text-xs text-ash">Réglage enregistré le {new Date(saved.updatedAt).toLocaleString("fr-FR", { timeZone: props.timeZone })}.</p> : null}
    {!loaded && !error ? <p role="status" className="mt-3 text-sm text-ash">Chargement des préférences…</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    {message ? <p role="status" className="mt-3 text-sm text-green-800">{message}</p> : null}
  </AccountSectionCard>;
}
