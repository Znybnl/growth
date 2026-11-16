"use client";

import { useState } from "react";
import { captureClientProductEvent } from "@/lib/client-product-analytics";

type GoogleAuthButtonProps = {
  mode: "signin" | "signup";
  nextPath?: string;
  onBeforeStart?: () => boolean;
};

export function GoogleAuthButton({
  mode,
  nextPath = "/",
  onBeforeStart,
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  async function handleClick() {
    if (onBeforeStart && !onBeforeStart()) return;
    if (!isConfigured) {
      setError(
        mode === "signup" ? "L’inscription Google est momentanément indisponible. Veuillez réessayer." : "Google Auth n'est pas configuré : ajoutez NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local.",
      );
      return;
    }

    setError(null);
    setIsLoading(true);
    if (mode === "signup") {
      captureClientProductEvent("signup_started", { method: "google" });
    }

    try {
      const startUrl = new URL("/api/auth/google/start", window.location.origin);
      startUrl.searchParams.set("next", nextPath);
      const referralCode = document.cookie
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith("okado_referral="))
        ?.split("=")[1];

      if (referralCode) {
        startUrl.searchParams.set("ref", decodeURIComponent(referralCode));
      }

      // Start OAuth on the server so the PKCE verifier is written to an
      // httpOnly cookie before the browser leaves the current page. This is
      // reliable on mobile browsers where client-side storage can be cleared
      // during the provider redirect.
      window.location.assign(startUrl.toString());
    } catch (submitError) {
      if (mode === "signup") {
        captureClientProductEvent("signup_failed", { method: "google" });
      }
      setError(
        submitError instanceof Error ? submitError.message : "Connexion Google impossible.",
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="okado-auth-action flex w-full items-center justify-center gap-3 rounded-[12px] border border-[#a99eaf] bg-white text-base font-semibold text-[#2c1c30] shadow-sm transition hover:border-aubergine hover:bg-purple-haze focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aubergine disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" width="20" height="20" className="shrink-0">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.22 3.6l6.86-6.86C35.91 2.36 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5Z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.27 5.48-4.8 7.18l7.73 6C44.38 38.02 46.98 31.87 46.98 24.55Z" />
          <path fill="#FBBC05" d="M10.53 28.59a14.46 14.46 0 0 1 0-9.18l-7.97-6.19a23.95 23.95 0 0 0 0 21.56l7.97-6.19Z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.87-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.14 2.3-6.26 0-11.57-4.2-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48Z" />
        </svg>
        <span>
          {isLoading
            ? "Redirection..."
            : mode === "signup"
              ? "S'inscrire avec Google"
              : "Continuer avec Google"}
        </span>
      </button>

      {error ? (
        <div className="rounded-[8px] border border-coral-alert/30 bg-coral-alert/10 px-4 py-3 text-sm text-coral-alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
