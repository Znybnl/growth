'use client';

import Image from "next/image";
import { Building2, ExternalLink, LoaderCircle, X } from "lucide-react";
import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { DialogShell } from "@/components/ui/dialog";
import { getSafeProfileUrl, type AdminEstablishmentProfile } from "@/lib/admin-establishment-profile";
import { GAIN_NOTIFICATION_LABELS } from "@/lib/merchant-gain-notification-email";

const marketingLinks = [
  ["googleReviewUrl", "Avis Google"],
  ["instagramUrl", "Instagram"],
  ["facebookUrl", "Facebook"],
  ["tiktokUrl", "TikTok"],
  ["tripadvisorUrl", "Tripadvisor"],
  ["websiteUrl", "Site internet"],
  ["appointmentUrl", "Prise de rendez-vous"],
  ["customLinkUrl", "Lien personnalisé"],
] as const;

function Field({ label, value }: { label: string; value?: ReactNode }) {
  const empty = value === undefined || value === null || value === "";
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-ash">{label}</dt>
      <dd className={`mt-1 whitespace-pre-wrap break-words text-sm ${empty ? "text-ash" : "text-graphite"}`}>
        {empty ? "Non renseigné" : value}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-fog bg-white p-4 sm:p-5">
      <h3 className="mb-4 text-sm font-semibold text-graphite">{title}</h3>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function ProfileLogo({ url, name }: { url?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const safeUrl = getSafeProfileUrl(url);
  return safeUrl && !failed ? (
    <Image
      alt={`Logo de ${name}`} src={safeUrl} width={72} height={72} unoptimized
      className="h-18 w-18 shrink-0 rounded-xl border border-fog bg-white p-2 object-contain"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-xl bg-lavender text-deep-plum">
      <Building2 aria-hidden="true" size={28} />
    </div>
  );
}

function displayDate(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return undefined;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" }).format(new Date(value));
}

function ProfileDetails({ profile }: { profile: AdminEstablishmentProfile }) {
  return (
    <div className="space-y-4">
      <div className="flex min-w-0 items-center gap-4 rounded-xl bg-[#fbf7fc] p-4">
        <ProfileLogo key={profile.id} url={profile.logoUrl} name={profile.companyName} />
        <div className="min-w-0">
          <p className="break-words text-lg font-semibold text-graphite">{profile.companyName}</p>
          <p className="mt-1 break-words text-sm text-ash">{[profile.industry, profile.city].filter(Boolean).join(" · ") || "Informations à compléter"}</p>
        </div>
      </div>
      <Section title="Identité et coordonnées">
        <Field label="Nom de l’établissement" value={profile.companyName} />
        <Field label="Texte du logo" value={profile.logoText} />
        <Field label="Logo image" value={profile.logoUrl ? "Renseigné" : undefined} />
        <Field label="Code du site" value={profile.locationCode} />
        <Field label="Secteur" value={profile.industry} />
        <Field label="Sous-secteur" value={profile.industrySubsector} />
        {profile.industry === "Restauration" ? <Field label="Type de restaurant" value={profile.restaurantType} /> : null}
        <Field label="Adresse" value={profile.address} />
        <Field label="Ville" value={profile.city} />
        <Field label="Nom du contact" value={profile.contactName} />
        <Field label="Téléphone" value={profile.phone} />
        <Field label="E-mail du commerce" value={profile.restaurantEmail} />
        <Field label="Fuseau horaire" value={profile.timeZone} />
      </Section>
      <Section title="Liens marketing">
        {marketingLinks.map(([key, label]) => {
          const raw = profile[key];
          const href = getSafeProfileUrl(raw);
          return (
            <Field key={key} label={label} value={href ? (
              <a className="inline-flex max-w-full items-start gap-1.5 text-[#67216b] underline underline-offset-2" href={href} target="_blank" rel="noopener noreferrer">
                <span className="min-w-0 break-all">{raw}</span>
                <ExternalLink size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            ) : raw?.trim() ? <span className="break-all">{raw} <span className="text-ash">(lien non ouvrable)</span></span> : undefined} />
          );
        })}
      </Section>
      <Section title="Fiche Google renseignée">
        <Field label="Nom sur Google" value={profile.googlePlaceName} />
        <Field label="Adresse sur Google" value={profile.googlePlaceAddress} />
        <Field label="Note enregistrée" value={profile.googlePlaceRating !== undefined ? `${profile.googlePlaceRating} / 5` : undefined} />
        <Field label="Nombre d’avis enregistré" value={profile.googlePlaceReviewCount} />
      </Section>
      <Section title="Paramètres de l’établissement">
        <Field label="Objectifs privilégiés" value={profile.preferredGoals?.join(", ")} />
        <Field label="Supports de diffusion" value={profile.diffusionSupport?.join(", ")} />
        <Field label="Coût d’un lot par défaut" value={profile.defaultPrizeCost !== undefined ? `${profile.defaultPrizeCost.toLocaleString("fr-FR")} €` : undefined} />
        <Field label="PIN de retrait" value={profile.redemptionPinConfigured ? "Configuré (masqué)" : "Non configuré"} />
        <Field label="Parcours de configuration" value={profile.onboardingCompleted ? "Terminé" : "À finaliser"} />
        <Field label="Date de création" value={displayDate(profile.createdAt)} />
      </Section>
      <Section title="Notifications de gains">
        <Field label="Notifications activées" value={profile.gainNotification
          ? profile.gainNotification.frequencies.length === 0
            ? `Aucune${profile.gainNotification.updatedAt ? "" : " (désactivées par défaut)"}`
            : profile.gainNotification.frequencies.map(frequency => GAIN_NOTIFICATION_LABELS[frequency]).join(", ")
          : "Non disponible"} />
        <Field label="Dernière modification" value={displayDate(profile.gainNotification?.updatedAt ?? undefined)} />
        <Field label="Portée" value="Réglage personnel du compte consulté pour cet établissement." />
        <Field label="Modification" value="Mon compte → Utilisateur." />
      </Section>
    </div>
  );
}

function ProfileContent({ merchantId, userId, onRetry }: { merchantId: string; userId: string; onRetry: () => void }) {
  const [result, setResult] = useState<{ locations?: AdminEstablishmentProfile[]; error?: string }>({});
  const [selectedId, setSelectedId] = useState("");
  const selectId = useId();
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = setTimeout(() => controller.abort(), 20_000);
    async function load() {
      try {
        const response = await fetch(`/api/admin/merchants/${encodeURIComponent(merchantId)}/profile?userId=${encodeURIComponent(userId)}`, {
          credentials: "same-origin", cache: "no-store", signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.locations) || !payload.locations.length) {
          throw new Error(response.ok ? "La fiche reçue est incomplète." : payload.error ?? "La fiche n’a pas pu être chargée.");
        }
        if (!cancelled) setResult({ locations: payload.locations });
      } catch (error) {
        if (!cancelled) setResult({ error: controller.signal.aborted
          ? "Le chargement prend trop de temps. Réessayez."
          : error instanceof Error ? error.message : "La fiche n’a pas pu être chargée." });
      } finally {
        clearTimeout(timeout);
      }
    }
    void load();
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [merchantId, userId]);

  if (result.error) return (
    <div className="rounded-xl border border-fog p-5">
      <p role="alert" className="text-sm text-[#b42318]">{result.error}</p>
      <button type="button" className="okado-secondary-action mt-4 px-4 text-sm" onClick={onRetry}>Réessayer</button>
    </div>
  );
  if (!result.locations) return (
    <p role="status" className="flex items-center gap-2 py-12 text-sm text-ash">
      <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> Chargement de la fiche…
    </p>
  );
  const profile = result.locations.find(({ id }) => id === selectedId) ?? result.locations[0];
  return (
    <>
      {result.locations.length > 1 ? (
        <div className="mb-4">
          <label htmlFor={selectId} className="mb-2 block text-sm font-medium text-graphite">Établissement du compte</label>
          <select id={selectId} value={profile.id} onChange={(event) => setSelectedId(event.target.value)} className="h-11 w-full rounded-lg border border-fog bg-white px-3 text-sm">
            {result.locations.map((location) => <option key={location.id} value={location.id}>{location.companyName}{location.city ? ` · ${location.city}` : ""}</option>)}
          </select>
        </div>
      ) : null}
      <ProfileDetails profile={profile} />
    </>
  );
}

export function AdminEstablishmentProfileButton({ merchantId, userId }: { merchantId: string; userId: string }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" aria-haspopup="dialog" className="okado-secondary-action okado-compact-action whitespace-nowrap px-3 text-xs" onClick={() => setOpen(true)}>
        Voir la fiche
      </button>
      {open ? (
        <DialogShell open onClose={close} labelledBy={`${id}-title`} describedBy={`${id}-description`} className="flex max-h-[calc(100dvh-4rem)] max-w-3xl flex-col overflow-hidden">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-fog pb-4">
            <div className="min-w-0">
              <p className="okado-label">Pilotage · consultation</p>
              <h2 id={`${id}-title`} className="okado-dialog-title">Fiche établissement</h2>
              <p id={`${id}-description`} className="mt-1 text-sm text-ash">Informations enregistrées · lecture seule</p>
            </div>
            <button type="button" onClick={close} aria-label="Fermer la fiche établissement" className="okado-dialog-dismiss shrink-0"><X size={18} aria-hidden="true" /></button>
          </header>
          <div className="min-h-0 overflow-y-auto py-4 pr-1">
            <ProfileContent key={`${merchantId}-${userId}-${attempt}`} merchantId={merchantId} userId={userId} onRetry={() => setAttempt((value) => value + 1)} />
          </div>
          <footer className="flex shrink-0 justify-end border-t border-fog pt-4">
            <button type="button" onClick={close} className="okado-secondary-action px-5 text-sm">Fermer</button>
          </footer>
        </DialogShell>
      ) : null}
    </>
  );
}
