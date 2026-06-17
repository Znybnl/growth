"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Merchant } from "@/lib/types";

const steps = [
  {
    id: "profil",
    label: "Profil",
    title: "Renseignez l'identité de votre boutique",
    description:
      "On pose les informations utiles pour l'équipe et pour vos prochaines campagnes.",
  },
  {
    id: "objectifs",
    label: "Objectifs",
    title: "Choisissez vos priorités marketing",
    description:
      "Sélectionnez les leviers qui comptent vraiment pour vos prochaines activations locales.",
  },
  {
    id: "diffusion",
    label: "Diffusion",
    title: "Préparez la diffusion en magasin",
    description:
      "Validez les supports terrain pour arriver sur la création de campagne avec un cadre propre.",
  },
] as const;

const goalOptions = [
  "Avis Google et reputation locale",
  "Instagram, TikTok, Facebook",
  "Collecte CRM et opt-in",
  "Retour en boutique avec cadeaux différés",
];

const diffusionOptions = [
  "QR code vitrine et comptoir",
  "NFC sur support table ou borne",
  "Script equipe magasin",
  "Dotation et règles de retrait",
];

type OnboardingFlowProps = {
  merchant: Merchant;
};

export function OnboardingFlow({ merchant }: OnboardingFlowProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [companyName, setCompanyName] = useState(merchant.companyName);
  const [city, setCity] = useState(merchant.city ?? "");
  const [contactName, setContactName] = useState(merchant.contactName ?? "");
  const [phone, setPhone] = useState(merchant.phone ?? "");
  const [preferredGoals, setPreferredGoals] = useState<string[]>(merchant.preferredGoals ?? []);
  const [diffusionSupport, setDiffusionSupport] = useState<string[]>(
    merchant.diffusionSupport ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const activeStep = steps[activeIndex];
  const completion = useMemo(
    () => `${Math.round(((activeIndex + 1) / steps.length) * 100)}%`,
    [activeIndex],
  );

  function toggleItem(list: string[], item: string, setter: (value: string[]) => void) {
    setter(list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item]);
  }

  function goNext() {
    setActiveIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setActiveIndex((current) => Math.max(current - 1, 0));
  }

  async function saveOnboarding() {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          city,
          contactName,
          phone,
          preferredGoals,
          diffusionSupport,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Onboarding impossible.");
      }

      router.push("/");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Onboarding impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 px-1 py-2 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-6 rounded-[36px] border border-[#dbe4f0] bg-white/90 p-6 shadow-[0_28px_60px_rgba(108,126,156,0.16)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
              Onboarding marchand
            </p>
            <h1 className="mt-3 font-display text-5xl leading-[0.94] text-[#121826]">
              Préparez votre espace en 3 étapes
            </h1>
            <p className="mt-4 max-w-[62ch] text-sm leading-7 text-[#5c6577]">
              Un tunnel court, sans détour, pour arriver sur la création de campagne avec une base
              propre et exploitable.
            </p>
          </div>

          <div className="min-w-[220px] rounded-[28px] bg-[linear-gradient(145deg,#0f1728,#1f4fd6)] p-5 text-white">
            <p className="text-xs uppercase tracking-[0.28em] text-white/58">Progression</p>
            <div className="mt-3 h-2 rounded-full bg-white/14">
              <div
                className="h-2 rounded-full bg-white transition-all"
                style={{ width: completion }}
              />
            </div>
            <p className="mt-4 text-sm text-white/76">
              Étape {activeIndex + 1} sur {steps.length}
            </p>
            <p className="mt-2 text-2xl font-semibold">{activeStep.label}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => {
            const active = index === activeIndex;
            const completed = index < activeIndex;

            return (
              <div
                key={step.id}
                className={`rounded-[28px] border px-5 py-5 transition ${
                  active
                    ? "border-[#2f6df6] bg-[#eff4ff]"
                    : completed
                      ? "border-[#cddaf7] bg-[#f8fbff]"
                      : "border-[#e2e8f0] bg-[#fbfcfe]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                      active
                        ? "bg-[#2f6df6] text-white"
                        : completed
                          ? "bg-[#121826] text-white"
                          : "bg-[#eef2f7] text-[#667084]"
                    }`}
                  >
                    {completed ? "OK" : index + 1}
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#7b8496]">Étape</p>
                    <p className="mt-1 text-lg font-semibold text-[#111827]">{step.label}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#5d6577]">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
        <div className="rounded-[34px] bg-[linear-gradient(180deg,#1e56e9,#1236aa)] p-6 text-white shadow-[0_28px_60px_rgba(20,53,143,0.28)]">
          <p className="text-xs uppercase tracking-[0.28em] text-white/58">Étape active</p>
          <h2 className="mt-3 font-display text-4xl leading-[0.98]">{activeStep.title}</h2>
          <p className="mt-4 text-sm leading-7 text-white/78">{activeStep.description}</p>

          <div className="mt-8 rounded-[28px] border border-white/12 bg-white/10 p-5">
            {activeStep.id === "profil" ? (
              <div className="space-y-3">
                <div className="h-14 rounded-[18px] bg-white/14" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="h-14 rounded-[18px] bg-white/12" />
                  <div className="h-14 rounded-[18px] bg-white/12" />
                </div>
                <div className="h-14 rounded-[18px] bg-white/10" />
              </div>
            ) : null}

            {activeStep.id === "objectifs" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {goalOptions.slice(0, 4).map((item) => (
                  <div key={item} className="rounded-[20px] bg-white/12 px-4 py-4 text-sm">
                    {item}
                  </div>
                ))}
              </div>
            ) : null}

            {activeStep.id === "diffusion" ? (
              <div className="space-y-3">
                {diffusionOptions.map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-[20px] bg-white/12 px-4 py-4 text-sm"
                  >
                    <span>{item}</span>
                    <span className="h-3 w-3 rounded-full bg-white/80" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[34px] border border-[#dbe4f0] bg-white p-6 shadow-[0_28px_60px_rgba(108,126,156,0.12)]">
          {activeStep.id === "profil" ? (
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Profil</p>
              <h2 className="mt-2 text-3xl font-semibold text-[#111827]">
                Informations de la boutique
              </h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block text-[#616b7c]">Nom de l&apos;enseigne</span>
                  <input
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-2 block text-[#616b7c]">Ville / boutique</span>
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-2 block text-[#616b7c]">Référent campagne</span>
                  <input
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-2 block text-[#616b7c]">Téléphone magasin</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {activeStep.id === "objectifs" ? (
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Objectifs</p>
              <h2 className="mt-2 text-3xl font-semibold text-[#111827]">
                Leviers à activer en priorité
              </h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {goalOptions.map((choice) => (
                  <label
                    key={choice}
                    className="flex items-start gap-3 rounded-[24px] border border-[#dbe4f0] bg-[#fbfcfe] px-4 py-4 text-sm text-[#364055]"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={preferredGoals.includes(choice)}
                      onChange={() => toggleItem(preferredGoals, choice, setPreferredGoals)}
                    />
                    <span>{choice}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {activeStep.id === "diffusion" ? (
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Diffusion</p>
              <h2 className="mt-2 text-3xl font-semibold text-[#111827]">
                Supports à prévoir pour le lancement
              </h2>
              <div className="mt-6 space-y-3">
                {diffusionOptions.map((item) => (
                  <label
                    key={item}
                    className="flex items-center gap-3 rounded-[22px] border border-[#dbe4f0] bg-[#fbfcfe] px-4 py-4 text-sm text-[#364055]"
                  >
                    <input
                      type="checkbox"
                      checked={diffusionSupport.includes(item)}
                      onChange={() => toggleItem(diffusionSupport, item, setDiffusionSupport)}
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-[20px] border border-[#f6c4bb] bg-[#fff1ee] px-4 py-3 text-sm text-[#8b2c18]">
              {error}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 border-t border-[#e6ebf2] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={goBack}
                disabled={activeIndex === 0}
                className="rounded-[20px] border border-[#d7e0ed] px-5 py-3 text-sm font-semibold text-[#182033] disabled:opacity-40"
              >
                Retour
              </button>
              <Link
                href="/campaigns/new"
                className="rounded-[20px] border border-[#d7e0ed] px-5 py-3 text-sm font-semibold text-[#182033]"
              >
                Passer
              </Link>
            </div>

            {activeIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="rounded-[20px] bg-[#2f6df6] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(47,109,246,0.22)]"
              >
                Étape suivante
              </button>
            ) : (
              <button
                type="button"
                onClick={saveOnboarding}
                disabled={isSaving}
                className="rounded-[20px] bg-[#121826] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(18,24,38,0.16)] disabled:opacity-60"
              >
                {isSaving ? "Enregistrement..." : "Terminer l'onboarding"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
