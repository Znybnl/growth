"use client";

import { useState } from "react";

type GoogleAuthButtonProps = {
  mode: "signin" | "signup";
  nextPath?: string;
};

export function GoogleAuthButton({
  mode,
  nextPath = "/",
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  async function handleClick() {
    if (!isConfigured) {
      setError(
        "Google Auth n'est pas configuré : ajoutez NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local.",
      );
      return;
    }

    setError(null);
    setIsLoading(true);

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
        className="okado-auth-action flex w-full items-center justify-center gap-3 rounded-[12px] border border-[#cfcfcf] bg-white text-base font-medium text-graphite transition hover:border-primary-action-accent hover:bg-sky-wash disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="text-lg text-[#34a853]">G</span>
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
