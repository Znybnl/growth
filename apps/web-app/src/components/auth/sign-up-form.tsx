"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import {
  captureClientProductEvent,
  identifyMerchantForAnalytics,
} from "@/lib/client-product-analytics";

function readReferralCodeFromBrowser() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref")?.trim();
  const cookieRef = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("okado_referral="))
    ?.split("=")[1];

  return ref || (cookieRef ? decodeURIComponent(cookieRef) : "");
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="mb-1 block text-[#423748]">
      {children}
      <span className="ml-1 text-coral-alert">*</span>
    </span>
  );
}

export function SignUpForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [accept, setAccept] = useState(false);
  const [referralCode] = useState(readReferralCodeFromBrowser);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  function checkTerms() {
    if (accept) return true;
    setError("Vous devez accepter les conditions pour continuer.");
    document.getElementById("signup-terms")?.focus();
    return false;
  }

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref")?.trim();
    if (!ref) return;

    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `okado_referral=${encodeURIComponent(ref)}; expires=${expires}; path=/; SameSite=Lax`;
  }, []);

  function updateField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    setError(null);
    const errors: Partial<Record<keyof typeof form, string>> = {};
    if (!form.firstName.trim()) errors.firstName = "Renseignez votre prénom.";
    if (!form.lastName.trim()) errors.lastName = "Renseignez votre nom.";
    if (!form.email.trim() || (document.getElementById("signup-email") as HTMLInputElement | null)?.validity.typeMismatch) errors.email = "Saisissez une adresse e-mail valide.";
    if (!form.password) errors.password = "Renseignez votre mot de passe.";
    if (!form.confirmPassword) errors.confirmPassword = "Confirmez votre mot de passe.";
    else if (form.password && form.password !== form.confirmPassword) errors.confirmPassword = "Les mots de passe ne correspondent pas.";
    setFieldErrors(errors);
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) {
      document.getElementById(`signup-${firstInvalid}`)?.focus();
      return;
    }
    if (!checkTerms()) return;
    setIsLoading(true);
    captureClientProductEvent("signup_started", { method: "email" });

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          companyName: "",
          city: "",
          phone: "",
          referralCode,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        merchant?: { id?: string };
        user?: { id?: string; merchantId?: string; email?: string };
      };

      if (!response.ok) {
        const knownErrors: Record<string, string> = {
          "Un compte existe deja avec cette adresse e-mail.": "Un compte existe déjà avec cette adresse e-mail.",
          "Adresse e-mail invalide.": "Saisissez une adresse e-mail valide.",
          "Les mots de passe ne correspondent pas.": "Les mots de passe ne correspondent pas.",
        };
        throw new Error(response.status === 429 ? "Trop de tentatives. Veuillez réessayer plus tard." : knownErrors[payload.error ?? ""] ?? "Une erreur est survenue. Veuillez réessayer.");
      }
      if (payload.user?.merchantId && payload.user.id) {
        identifyMerchantForAnalytics(payload.user.merchantId, payload.user.id, payload.merchant?.id, payload.user.email);
      }
      window.location.assign("/onboarding");
    } catch (submitError) {
      captureClientProductEvent("signup_failed", { method: "email" });
      setError(submitError instanceof TypeError ? "Une erreur est survenue. Veuillez réessayer." : submitError instanceof Error ? submitError.message : "Inscription impossible.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="okado-auth-credentials mx-auto flex w-full max-w-[480px] flex-col justify-center py-4" onSubmit={handleSubmit} noValidate>
      <div>
        <p className="okado-label">Créer un compte</p>
        <h1 className="okado-page-title mt-2 !text-[30px] !leading-[1.12]">Ouvrez votre espace marchand</h1>
        <p className="mt-2 text-sm leading-6 text-[#554b59]">
          30 jours d’essai gratuit, sans carte bancaire. Créez votre premier jeu en quelques étapes.
        </p>
      </div>

      <div className="mt-4">
        <GoogleAuthButton mode="signup" nextPath="/onboarding" onBeforeStart={checkTerms} />
      </div>

      {referralCode ? (
        <div className="mt-4 rounded-[8px] border border-aubergine/20 bg-purple-haze px-4 py-3 text-sm text-aubergine">
          Code parrainage appliqué : <span className="font-semibold">{referralCode}</span>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-4">
        <div className="h-px flex-1 bg-fog" />
        <span className="text-sm text-[#66596b]">ou continuez avec le formulaire</span>
        <div className="h-px flex-1 bg-fog" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <FieldLabel>Prénom</FieldLabel>
          <input
            id="signup-firstName"
            autoComplete="given-name"
            aria-invalid={Boolean(fieldErrors.firstName)} aria-describedby={fieldErrors.firstName ? "signup-firstName-error" : undefined}
            value={form.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
            placeholder="Camille"
            className="h-[46px] w-full rounded-[12px] border border-[#cbc5cf] bg-white px-4 text-carbon outline-none transition placeholder:text-[#76707d] focus:border-aubergine focus:shadow-[0_0_0_3px_rgba(97,31,105,0.16)]"
            required
          />
          {fieldErrors.firstName ? <span id="signup-firstName-error" role="alert" className="mt-1 block text-xs text-coral-alert">{fieldErrors.firstName}</span> : null}
        </label>
        <label className="text-sm">
          <FieldLabel>Nom</FieldLabel>
          <input
            id="signup-lastName"
            autoComplete="family-name"
            aria-invalid={Boolean(fieldErrors.lastName)} aria-describedby={fieldErrors.lastName ? "signup-lastName-error" : undefined}
            value={form.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
            placeholder="Martin"
            className="h-[46px] w-full rounded-[12px] border border-[#cbc5cf] bg-white px-4 text-carbon outline-none transition placeholder:text-[#76707d] focus:border-aubergine focus:shadow-[0_0_0_3px_rgba(97,31,105,0.16)]"
            required
          />
          {fieldErrors.lastName ? <span id="signup-lastName-error" role="alert" className="mt-1 block text-xs text-coral-alert">{fieldErrors.lastName}</span> : null}
        </label>
        <label className="text-sm md:col-span-2">
          <FieldLabel>E-mail professionnel</FieldLabel>
          <input
            type="email"
            id="signup-email"
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="camille@maisonsora.fr"
            className="h-[46px] w-full rounded-[12px] border border-[#cbc5cf] bg-white px-4 text-carbon outline-none transition placeholder:text-[#76707d] focus:border-aubergine focus:shadow-[0_0_0_3px_rgba(97,31,105,0.16)]"
            required
          />
          {fieldErrors.email ? <span id="signup-email-error" role="alert" className="mt-1 block text-xs text-coral-alert">{fieldErrors.email}</span> : null}
        </label>
        <label className="text-sm">
          <FieldLabel>Mot de passe</FieldLabel>
          <span className="relative block"><input
            id="signup-password"
            aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "signup-password-error" : undefined}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            placeholder="••••••••••"
            className="h-[46px] w-full rounded-[12px] border border-[#cbc5cf] bg-white px-4 pr-12 text-carbon outline-none transition placeholder:text-[#76707d] focus:border-aubergine focus:shadow-[0_0_0_3px_rgba(97,31,105,0.16)]"
            required
          /><button type="button" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ash focus-visible:outline-2 focus-visible:outline-aubergine">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
          {fieldErrors.password ? <span id="signup-password-error" role="alert" className="mt-1 block text-xs text-coral-alert">{fieldErrors.password}</span> : null}
        </label>
        <label className="text-sm">
          <FieldLabel>Confirmer le mot de passe</FieldLabel>
          <span className="relative block"><input
            id="signup-confirmPassword"
            aria-invalid={Boolean(fieldErrors.confirmPassword)} aria-describedby={fieldErrors.confirmPassword ? "signup-confirmPassword-error" : undefined}
            type={showConfirmation ? "text" : "password"}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            placeholder="••••••••••"
            className="h-[46px] w-full rounded-[12px] border border-[#cbc5cf] bg-white px-4 pr-12 text-carbon outline-none transition placeholder:text-[#76707d] focus:border-aubergine focus:shadow-[0_0_0_3px_rgba(97,31,105,0.16)]"
            required
          /><button type="button" aria-label={showConfirmation ? "Masquer la confirmation du mot de passe" : "Afficher la confirmation du mot de passe"} aria-pressed={showConfirmation} onClick={() => setShowConfirmation(!showConfirmation)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ash focus-visible:outline-2 focus-visible:outline-aubergine">{showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
          {fieldErrors.confirmPassword ? <span id="signup-confirmPassword-error" role="alert" className="mt-1 block text-xs text-coral-alert">{fieldErrors.confirmPassword}</span> : null}
        </label>
      </div>

      <div className="mt-4 rounded-[8px] border border-[#d8d0dc] bg-linen-canvas px-4 py-3 text-sm leading-6 text-[#554b59]">
        <label className="flex items-start gap-3">
          <input
            id="signup-terms"
            type="checkbox"
            className="mt-1"
            checked={accept}
            onChange={(event) => setAccept(event.target.checked)}
          />
          <span>
            J’accepte les <a href="https://www.okado.app/cgv" target="_blank" rel="noreferrer" className="underline">conditions générales de vente</a>.
          </span>
        </label>
        <p className="mt-3 text-xs">Consultez notre <a href="https://www.okado.app/confidentialite" target="_blank" rel="noreferrer" className="underline">politique de confidentialité</a>. En créant votre compte, vous recevrez des e-mails professionnels de démarrage et de suivi de votre essai Okado, en lien avec votre activité. Vous pouvez vous y opposer à tout moment en écrivant à <a href="mailto:contact@okado.app?subject=Opposition%20aux%20e-mails%20Okado" className="underline">contact@okado.app</a> ; chaque e-mail comporte un lien pour vous y opposer. Cette information ne constitue pas un consentement marketing général.
        </p>
      </div>

      {error ? (
        <div role="alert" className="mt-4 rounded-[8px] border border-coral-alert/30 bg-coral-alert/10 px-4 py-3 text-sm text-coral-alert">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="okado-filled-action okado-auth-action inline-flex items-center justify-center px-5 disabled:opacity-60"
        >
          {isLoading ? "Création…" : "Créer mon compte"}
        </button>
        <Link
          href="/connexion"
          className="okado-primary-action okado-auth-action inline-flex items-center justify-center px-5"
        >
          J’ai déjà un compte
        </Link>
      </div>
    </form>
  );
}
