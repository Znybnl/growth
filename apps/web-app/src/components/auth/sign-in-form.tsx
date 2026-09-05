"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { captureClientProductEvent } from "@/lib/client-product-analytics";

export function SignInForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const authError = useMemo(() => {
    const reason = searchParams.get("reason");
    if (reason === "session-expired") {
      return "Votre session a expiré pour des raisons de sécurité. Reconnectez-vous pour continuer.";
    }
    return searchParams.get("error") === "google_oauth"
      ? reason || "La connexion Google a échoué. Vérifiez la configuration Supabase / Google puis réessayez."
      : null;
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const payload = (await response.json()) as {
        error?: string;
        merchant?: { onboardingCompleted?: boolean };
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Connexion impossible.");
      }

      captureClientProductEvent("login_completed", { method: "password" });
      window.location.assign(payload.merchant?.onboardingCompleted ? "/" : "/onboarding");
    } catch (submitError) {
      captureClientProductEvent("login_failed", {
        method: "password",
        errorType: submitError instanceof Error ? submitError.name : "unknown",
      });
      setError(submitError instanceof Error ? submitError.message : "Connexion impossible.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="flex flex-col bg-transparent px-1 py-2 sm:bg-white sm:px-6 sm:py-6" onSubmit={handleSubmit}>
      <div>
        <h1 className="okado-page-title">Bienvenue</h1>
        <p className="mt-4 text-base leading-7 text-ash">
          Retrouvez vos jeux, vos participations et vos performances depuis votre espace marchand.
        </p>
      </div>

      <div className="mt-8">
        <GoogleAuthButton mode="signin" nextPath="/" />
      </div>

      <div className="mt-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-fog" />
        <span className="text-sm text-fog">ou continuez par email</span>
        <div className="h-px flex-1 bg-fog" />
      </div>

      <div className="mt-8 space-y-4">
        <label className="block text-sm">
          <span className="sr-only">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="h-14 w-full rounded-[12px] border border-fog bg-white px-4 text-base text-carbon outline-none transition placeholder:text-fog focus:border-aubergine focus:shadow-[0_0_0_3px_rgba(97,31,105,0.16)]"
            required
          />
        </label>

        <label className="block text-sm">
          <span className="sr-only">Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mot de passe"
            className="h-14 w-full rounded-[12px] border border-fog bg-white px-4 text-base text-carbon outline-none transition placeholder:text-fog focus:border-aubergine focus:shadow-[0_0_0_3px_rgba(97,31,105,0.16)]"
            required
          />
        </label>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 text-sm">
        <label className="flex items-center gap-3 text-ash">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-4 w-4 rounded border-fog text-aubergine"
          />
          <span>Se souvenir de moi</span>
        </label>
        <Link href="/inscription" className="okado-link font-medium">
          Créer un compte
        </Link>
      </div>

      {error || authError ? (
        <div className="mt-4 rounded-[8px] border border-coral-alert/30 bg-coral-alert/10 px-4 py-3 text-sm text-coral-alert">
          {error || authError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="okado-filled-action okado-auth-action mt-8 w-full text-base disabled:opacity-60"
      >
        {isLoading ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
