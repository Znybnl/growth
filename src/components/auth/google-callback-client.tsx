"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function buildAuthErrorUrl(message: string) {
  const url = new URL("/connexion", window.location.origin);
  url.searchParams.set("error", "google_oauth");
  url.searchParams.set("reason", message);
  return url.toString();
}

export function GoogleCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Connexion Google en cours...");

  useEffect(() => {
    let cancelled = false;

    async function completeGoogleLogin() {
      const code = searchParams.get("code");
      const next = searchParams.get("next") || "/";
      const providerError = searchParams.get("error");
      const providerErrorDescription = searchParams.get("error_description");

      if (providerError || !code) {
        router.replace(
          buildAuthErrorUrl(
            providerErrorDescription || providerError || "Code de retour Google introuvable.",
          ),
        );
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.user?.email) {
          throw error ?? new Error("Session Google introuvable ou code PKCE invalide.");
        }

        if (!cancelled) {
          setMessage("Finalisation de votre espace marchand...");
        }

        const metadata = data.user.user_metadata ?? {};
        const response = await fetch("/api/auth/google/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.user.email,
            firstName: readString(metadata.given_name),
            lastName: readString(metadata.family_name),
            fullName: readString(metadata.full_name) || readString(metadata.name),
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          redirectPath?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Connexion Google impossible.");
        }

        router.replace(payload.redirectPath || next);
        router.refresh();
      } catch {
        const message =
          searchParams.get("error_description") ||
          "Échec de finalisation de la session Google ou de création du compte marchand.";
        router.replace(buildAuthErrorUrl(message));
      }
    }

    void completeGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef3fb] px-6">
      <div className="w-full max-w-[520px] rounded-[36px] border border-white/70 bg-white/92 p-10 text-center shadow-[0_30px_80px_rgba(69,97,157,0.18)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.32em] text-[#7b8496]">Google Auth</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#0f1728]">
          Connexion en cours
        </h1>
        <p className="mt-4 text-base leading-7 text-[#5d6577]">{message}</p>
      </div>
    </main>
  );
}
