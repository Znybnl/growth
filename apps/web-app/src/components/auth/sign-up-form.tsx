"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";

function readReferralCodeFromBrowser() {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref")?.trim();
  const cookieRef = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("okado_referral="))
    ?.split("=")[1];

  return ref || (cookieRef ? decodeURIComponent(cookieRef) : "");
}

function FieldLabel({
  children,
  required = true,
}: {
  children: string;
  required?: boolean;
}) {
  return (
    <span className="mb-2 block text-[#616b7c]">
      {children}
      {required ? <span className="ml-1 text-[#d92d20]">*</span> : null}
    </span>
  );
}

const signUpFields: Array<{
  key: "companyName" | "city" | "firstName" | "lastName" | "email" | "phone";
  label: string;
  placeholder: string;
  required: boolean;
}> = [
  { key: "companyName", label: "Nom de l’enseigne", placeholder: "Maison Sora", required: true },
  { key: "city", label: "Ville / boutique", placeholder: "Paris Marais", required: true },
  { key: "firstName", label: "Prénom", placeholder: "Camille", required: true },
  { key: "lastName", label: "Nom", placeholder: "Martin", required: true },
  {
    key: "email",
    label: "E-mail professionnel",
    placeholder: "camille@maisonsora.fr",
    required: true,
  },
  { key: "phone", label: "Téléphone", placeholder: "06 00 00 00 00", required: false },
];

export function SignUpForm() {
  const [form, setForm] = useState({
    companyName: "",
    city: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [accept, setAccept] = useState(true);
  const [referralCode] = useState(readReferralCodeFromBrowser);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref")?.trim();

    if (!ref) {
      return;
    }

    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `okado_referral=${encodeURIComponent(ref)}; expires=${expires}; path=/; SameSite=Lax`;
  }, []);

  function updateField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!accept) {
        throw new Error("Vous devez accepter les conditions pour continuer.");
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, referralCode }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Inscription impossible.");
      }

      window.location.assign("/onboarding");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Inscription impossible.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      className="mx-auto flex max-w-[620px] flex-col justify-center py-6"
      onSubmit={handleSubmit}
    >
      <div>
        <p className="okado-label">Créer un compte</p>
        <h1 className="okado-page-title mt-3">
          Ouvrez votre espace marchand
        </h1>
        <p className="mt-4 text-sm leading-8 text-ash">
          Commencez par votre restaurant ou votre boutique, puis finalisez votre onboarding pour
          créer votre première campagne.
        </p>
      </div>

      <div className="mt-8">
        <GoogleAuthButton mode="signup" nextPath="/onboarding" />
      </div>

      {referralCode ? (
        <div className="mt-4 rounded-[8px] border border-signal-blue/20 bg-signal-blue/10 px-4 py-3 text-sm text-signal-blue">
          Code parrainage appliqué : <span className="font-semibold">{referralCode}</span>
        </div>
      ) : null}

      <div className="mt-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-[#e7ecf4]" />
        <span className="text-sm text-fog">ou continuez avec le formulaire</span>
        <div className="h-px flex-1 bg-[#e7ecf4]" />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {signUpFields.map((field) => (
          <label key={field.key} className="text-sm">
            <FieldLabel required={field.required}>{field.label}</FieldLabel>
            <input
              type={field.key === "email" ? "email" : "text"}
              value={form[field.key]}
              onChange={(event) => updateField(field.key, event.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-[12px] border border-[#cfcfcf] bg-white px-4 py-4 text-graphite outline-none transition placeholder:text-fog focus:border-signal-blue focus:shadow-[0_0_0_3px_rgba(0,153,255,1)]"
              required={field.required}
            />
          </label>
        ))}
        <label className="text-sm">
          <FieldLabel>Mot de passe</FieldLabel>
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            placeholder="••••••••••"
            className="w-full rounded-[12px] border border-[#cfcfcf] bg-white px-4 py-4 text-graphite outline-none transition placeholder:text-fog focus:border-signal-blue focus:shadow-[0_0_0_3px_rgba(0,153,255,1)]"
            required
          />
        </label>
        <label className="text-sm">
          <FieldLabel>Confirmer le mot de passe</FieldLabel>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            placeholder="••••••••••"
            className="w-full rounded-[12px] border border-[#cfcfcf] bg-white px-4 py-4 text-graphite outline-none transition placeholder:text-fog focus:border-signal-blue focus:shadow-[0_0_0_3px_rgba(0,153,255,1)]"
            required
          />
        </label>
      </div>

      <div className="mt-6 rounded-[8px] border border-border bg-linen-canvas px-4 py-4 text-sm leading-7 text-ash">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={accept}
            onChange={(event) => setAccept(event.target.checked)}
          />
          <span>
            J’accepte les conditions d’utilisation et je souhaite recevoir les conseils de mise en
            route de la plateforme.
          </span>
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-[8px] border border-coral-alert/30 bg-coral-alert/10 px-4 py-3 text-sm text-coral-alert">
          {error}
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="okado-filled-action inline-flex items-center justify-center px-5 py-4 disabled:opacity-60"
        >
          {isLoading ? "Création..." : "Créer mon compte"}
        </button>
        <Link
          href="/connexion"
          className="okado-primary-action inline-flex items-center justify-center px-5 py-4"
        >
          J’ai déjà un compte
        </Link>
      </div>
    </form>
  );
}
