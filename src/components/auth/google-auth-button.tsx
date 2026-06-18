"use client";

import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

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
      const supabase = getSupabaseBrowserClient();
      const redirectTo = new URL("/connexion/google/callback", window.location.origin);
      redirectTo.searchParams.set("next", nextPath);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo.toString(),
        },
      });

      if (oauthError) {
        throw oauthError;
      }
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
        className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-[#e3e8f1] bg-white text-base font-medium text-[#111827] transition hover:border-[#d2dbeb] hover:bg-[#f8fbff] disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="rounded-xl border border-[#f6c4bb] bg-[#fff1ee] px-4 py-3 text-sm text-[#8b2c18]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
